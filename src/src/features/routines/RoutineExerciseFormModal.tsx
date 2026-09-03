import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { validateRoutineExerciseForm } from "@/lib/domain/routineValidation";
import type { RoutineExerciseValidationErrors } from "@/lib/domain/routineValidation";
import {
  getCardioEquipmentProfile,
  getExerciseConfigurationMode,
  hasLegacyStrengthValues,
  resolveEffectiveMode,
} from "@/lib/domain/exerciseConfigMode";
import * as routineService from "@/lib/services/routineService";
import { RoutineExerciseValidationError } from "@/lib/services/routineService";
import {
  INTENSITY_LABEL_OPTIONS,
  emptyRoutineExerciseForm,
  routineExerciseToFormInput,
  type RoutineExerciseFormInput,
  type RoutineExerciseListItem,
  type TimeUnit,
} from "@/types/routine";
import type { ExerciseOptionRow } from "@/types/db";

const NO_CATEGORY_LABEL = "Sin categoría";

interface RoutineExerciseFormModalProps {
  open: boolean;
  gymId: string;
  routineId: string;
  exercises: ExerciseOptionRow[];
  /** Presente = editar un ejercicio ya agregado; ausente/null = agregar uno nuevo. */
  routineExercise?: RoutineExerciseListItem | null;
  onClose: () => void;
  onSaved: () => void;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-danger">{message}</p>;
}

function resolveCategory(exercises: ExerciseOptionRow[], exerciseId: string): string {
  const option = exercises.find((e) => e.id === exerciseId);
  return option ? option.category ?? NO_CATEGORY_LABEL : "";
}

export function RoutineExerciseFormModal({
  open,
  gymId,
  routineId,
  exercises,
  routineExercise,
  onClose,
  onSaved,
}: RoutineExerciseFormModalProps) {
  const [form, setForm] = useState<RoutineExerciseFormInput>(() => emptyRoutineExerciseForm());
  const [category, setCategory] = useState("");
  const [errors, setErrors] = useState<RoutineExerciseValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (routineExercise) {
        setForm(routineExerciseToFormInput(routineExercise));
        setCategory(resolveCategory(exercises, routineExercise.exerciseId));
      } else {
        setForm(emptyRoutineExerciseForm());
        setCategory("");
      }
      setErrors({});
      setFormError(null);
    }
    // No se incluye `exercises` a propósito: solo debe recalcularse al abrir el modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, routineExercise]);

  const categories = useMemo(() => {
    const values = new Set<string>();
    for (const exercise of exercises) values.add(exercise.category ?? NO_CATEGORY_LABEL);
    return Array.from(values).sort((a, b) => a.localeCompare(b, "es"));
  }, [exercises]);

  const exercisesInCategory = useMemo(
    () => exercises.filter((exercise) => (exercise.category ?? NO_CATEGORY_LABEL) === category),
    [exercises, category],
  );

  const selectedExercise = useMemo(
    () => exercises.find((exercise) => exercise.id === form.exerciseId) ?? null,
    [exercises, form.exerciseId],
  );

  const catalogMode = getExerciseConfigurationMode(selectedExercise?.exercise_type ?? null);
  const cardioProfile = getCardioEquipmentProfile(selectedExercise?.equipment ?? null);
  const mode = resolveEffectiveMode(hasLegacyStrengthValues(form), catalogMode);

  function update<K extends keyof RoutineExerciseFormInput>(
    key: K,
    value: RoutineExerciseFormInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  /** Cambiar de categoría o de ejercicio limpia los campos numéricos del modo anterior. */
  function resetModeFields(exerciseId: string) {
    setForm((prev) => ({ ...emptyRoutineExerciseForm(), exerciseId, notes: prev.notes }));
  }

  function handleCategoryChange(value: string) {
    setCategory(value);
    resetModeFields("");
  }

  function handleExerciseChange(exerciseId: string) {
    resetModeFields(exerciseId);
  }

  function handleTimeValueChange(raw: string) {
    const value = raw === "" ? null : Number(raw);
    setForm((prev) => ({
      ...prev,
      timeValue: value,
      timeUnit: prev.timeUnit ?? (value !== null ? "MINUTES" : null),
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const fieldErrors = validateRoutineExerciseForm(form, mode, cardioProfile);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      if (routineExercise) {
        await routineService.updateRoutineExercise(gymId, routineId, routineExercise.id, form);
      } else {
        await routineService.addRoutineExercise(gymId, routineId, form);
      }
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof RoutineExerciseValidationError) {
        setErrors(err.errors);
      } else {
        setFormError(err instanceof Error ? err.message : "No se pudo guardar el ejercicio.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={routineExercise ? "Editar ejercicio" : "Agregar ejercicio"}
      widthClassName="max-w-md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Categoría *</label>
          <Select value={category} onChange={(e) => handleCategoryChange(e.target.value)}>
            <option value="">Selecciona una categoría</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </Select>
          {exercises.length === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Todavía no hay ejercicios disponibles en la biblioteca.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Ejercicio *</label>
          <Select
            value={form.exerciseId}
            onChange={(e) => handleExerciseChange(e.target.value)}
            disabled={!category}
          >
            <option value="">
              {category ? "Selecciona un ejercicio" : "Primero elige una categoría"}
            </option>
            {exercisesInCategory.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.name}
              </option>
            ))}
          </Select>
          <FieldError message={errors.exerciseId} />
        </div>

        {mode === "STRENGTH" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Series</label>
              <Input
                type="number"
                min={1}
                step={1}
                value={form.sets ?? ""}
                onChange={(e) => update("sets", e.target.value === "" ? null : Number(e.target.value))}
              />
              <FieldError message={errors.sets} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Repeticiones</label>
              <Input
                type="number"
                min={1}
                step={1}
                value={form.reps ?? ""}
                onChange={(e) => update("reps", e.target.value === "" ? null : Number(e.target.value))}
              />
              <FieldError message={errors.reps} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Peso (kg)</label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={form.weight ?? ""}
                onChange={(e) => update("weight", e.target.value === "" ? null : Number(e.target.value))}
              />
              <FieldError message={errors.weight} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Descanso (segundos)
              </label>
              <Input
                type="number"
                min={0}
                step={5}
                value={form.restSeconds ?? ""}
                onChange={(e) =>
                  update("restSeconds", e.target.value === "" ? null : Number(e.target.value))
                }
              />
              <FieldError message={errors.restSeconds} />
            </div>
          </div>
        )}

        {(mode === "CARDIO_TIME" || mode === "MOBILITY") && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Tiempo *</label>
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  type="number"
                  min={0}
                  step="any"
                  placeholder="Ej. 30"
                  value={form.timeValue ?? ""}
                  onChange={(e) => handleTimeValueChange(e.target.value)}
                />
                <Select
                  className="w-32 shrink-0"
                  value={form.timeUnit ?? "MINUTES"}
                  onChange={(e) => update("timeUnit", e.target.value as TimeUnit)}
                >
                  <option value="MINUTES">Minutos</option>
                  <option value="HOURS">Horas</option>
                </Select>
              </div>
              <FieldError message={errors.timeValue} />
            </div>

            {mode === "CARDIO_TIME" && cardioProfile === "TREADMILL" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Velocidad (km/h) *
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    value={form.speedKmh ?? ""}
                    onChange={(e) =>
                      update("speedKmh", e.target.value === "" ? null : Number(e.target.value))
                    }
                  />
                  <FieldError message={errors.speedKmh} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Inclinación (%)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={form.inclinePercent ?? ""}
                    onChange={(e) =>
                      update("inclinePercent", e.target.value === "" ? null : Number(e.target.value))
                    }
                  />
                  <FieldError message={errors.inclinePercent} />
                </div>
              </div>
            )}

            {mode === "CARDIO_TIME" &&
              (cardioProfile === "BIKE" || cardioProfile === "ROWER" || cardioProfile === "CLIMBER") && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      {cardioProfile === "CLIMBER" ? "Nivel *" : "Resistencia (nivel) *"}
                    </label>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={form.resistanceLevel ?? ""}
                      onChange={(e) =>
                        update("resistanceLevel", e.target.value === "" ? null : Number(e.target.value))
                      }
                    />
                    <FieldError message={errors.resistanceLevel} />
                  </div>
                  {cardioProfile === "BIKE" && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        RPM (opcional)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={form.rpm ?? ""}
                        onChange={(e) =>
                          update("rpm", e.target.value === "" ? null : Number(e.target.value))
                        }
                      />
                      <FieldError message={errors.rpm} />
                    </div>
                  )}
                </div>
              )}

            {mode === "CARDIO_TIME" && cardioProfile === "GENERIC" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Intensidad *</label>
                <Select
                  value={form.intensityLabel ?? ""}
                  onChange={(e) => update("intensityLabel", e.target.value || null)}
                >
                  <option value="">Selecciona la intensidad</option>
                  {INTENSITY_LABEL_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
                <FieldError message={errors.intensityLabel} />
              </div>
            )}
          </>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Observaciones</label>
          <Textarea rows={2} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
        </div>

        {formError && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {formError}
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : routineExercise ? (
              "Guardar cambios"
            ) : (
              "Agregar"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
