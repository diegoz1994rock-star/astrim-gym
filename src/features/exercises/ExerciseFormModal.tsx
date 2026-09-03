import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { validateExerciseForm } from "@/lib/domain/exerciseValidation";
import type { ExerciseValidationErrors } from "@/lib/domain/exerciseValidation";
import * as exerciseService from "@/lib/services/exerciseService";
import { ExerciseValidationError } from "@/lib/services/exerciseService";
import {
  EXERCISE_CATEGORY_OPTIONS,
  EXERCISE_LEVEL_LABELS,
  EXERCISE_TYPE_LABELS,
  MUSCLE_GROUP_LABELS,
  emptyExerciseForm,
  exerciseToFormInput,
  type ExerciseFormInput,
  type ExerciseListItem,
} from "@/types/exercise";

interface ExerciseFormModalProps {
  open: boolean;
  gymId: string;
  exercise: ExerciseListItem | null;
  onClose: () => void;
  onSaved: () => void;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-danger">{message}</p>;
}

function toFormInput(exercise: ExerciseListItem | null): ExerciseFormInput {
  return exercise ? exerciseToFormInput(exercise) : emptyExerciseForm();
}

export function ExerciseFormModal({ open, gymId, exercise, onClose, onSaved }: ExerciseFormModalProps) {
  const [form, setForm] = useState<ExerciseFormInput>(() => toFormInput(exercise));
  const [errors, setErrors] = useState<ExerciseValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(toFormInput(exercise));
      setErrors({});
      setFormError(null);
    }
  }, [open, exercise]);

  function update<K extends keyof ExerciseFormInput>(key: K, value: ExerciseFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const fieldErrors = validateExerciseForm(form, { allowedCategory: exercise?.category ?? null });
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      if (exercise) {
        await exerciseService.updateExercise(gymId, exercise.id, form);
      } else {
        await exerciseService.createExercise(gymId, form);
      }
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ExerciseValidationError) {
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
      title={exercise ? "Editar ejercicio" : "Nuevo ejercicio"}
      description={exercise ? exercise.name : "Agrega un ejercicio a la biblioteca de tu gimnasio."}
      widthClassName="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Nombre del ejercicio *
          </label>
          <Input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Ej. Press banca"
          />
          <FieldError message={errors.name} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Categoría</label>
          <Select value={form.category ?? ""} onChange={(e) => update("category", e.target.value || null)}>
            <option value="">Sin especificar</option>
            {form.category && !EXERCISE_CATEGORY_OPTIONS.includes(form.category) && (
              <option value={form.category}>{form.category} (histórica)</option>
            )}
            {EXERCISE_CATEGORY_OPTIONS.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
          <FieldError message={errors.category} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Descripción</label>
          <Textarea
            rows={2}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Grupo muscular
            </label>
            <Select
              value={form.muscleGroup ?? ""}
              onChange={(e) =>
                update("muscleGroup", (e.target.value || null) as ExerciseFormInput["muscleGroup"])
              }
            >
              <option value="">Sin especificar</option>
              {Object.entries(MUSCLE_GROUP_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Músculos secundarios
            </label>
            <Input
              value={form.secondaryMuscles}
              onChange={(e) => update("secondaryMuscles", e.target.value)}
              placeholder="Ej. Tríceps, hombros"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Tipo de ejercicio
            </label>
            <Select
              value={form.exerciseType ?? ""}
              onChange={(e) =>
                update("exerciseType", (e.target.value || null) as ExerciseFormInput["exerciseType"])
              }
            >
              <option value="">Sin especificar</option>
              {Object.entries(EXERCISE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Nivel</label>
            <Select
              value={form.level ?? ""}
              onChange={(e) => update("level", (e.target.value || null) as ExerciseFormInput["level"])}
            >
              <option value="">Sin especificar</option>
              {Object.entries(EXERCISE_LEVEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Equipamiento
            </label>
            <Input
              value={form.equipment}
              onChange={(e) => update("equipment", e.target.value)}
              placeholder="Ej. Barra, mancuernas, peso corporal..."
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Instrucciones</label>
          <Textarea
            rows={6}
            value={form.instructions}
            onChange={(e) => update("instructions", e.target.value)}
            placeholder={"Ajuste: ...\nPostura: ...\nMovimiento: ...\nRespiración: ..."}
          />
          <FieldError message={errors.instructions} />
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-foreground">
            Video de demostración
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Opcional. Se usará para mostrar el video del ejercicio en la futura app móvil.
          </p>
          <label className="mb-1.5 block text-sm font-medium text-foreground">URL del video</label>
          <Input
            type="url"
            value={form.videoPath}
            onChange={(e) => update("videoPath", e.target.value)}
            placeholder="Ej. https://www.youtube.com/watch?v=XXXXXXXX"
          />
          <FieldError message={errors.videoPath} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Estado</label>
          <Select
            value={form.status}
            onChange={(e) => update("status", e.target.value as ExerciseFormInput["status"])}
          >
            <option value="ACTIVE">Activo</option>
            <option value="INACTIVE">Inactivo</option>
          </Select>
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
            ) : (
              "Guardar ejercicio"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
