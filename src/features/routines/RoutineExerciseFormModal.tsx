import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ExerciseConfigFields } from "@/components/ExerciseConfigFields";
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
  emptyRoutineExerciseForm,
  routineExerciseToFormInput,
  type RoutineExerciseFormInput,
  type RoutineExerciseListItem,
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

        <ExerciseConfigFields
          value={form}
          mode={mode}
          cardioProfile={cardioProfile}
          errors={errors}
          onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        />

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
