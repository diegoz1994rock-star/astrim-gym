import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Users } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ClientPickerModal } from "@/components/ClientPickerModal";
import { BlockEditor } from "./BlockEditor";
import * as classService from "@/lib/services/classService";
import { ClassValidationError } from "@/lib/services/classService";
import { validateClassForm, type ClassValidationErrors } from "@/lib/domain/classValidation";
import {
  classToFormInput,
  emptyClassForm,
  type ClassDetail,
  type ClassFormInput,
  type ClassTypeOption,
  type RecurrenceFrequency,
} from "@/types/class";
import type { ClientListItem } from "@/types/client";
import type { ExerciseOptionRow, TrainerOptionRow } from "@/types/db";

const WEEKDAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const RECURRENCE_FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  DAILY: "Cada día",
  WEEKLY: "Cada semana",
  MONTHLY: "Cada mes",
};

/**
 * Igual que buildTrainerOptions en ClientFormModal: si el entrenador
 * asignado fue desactivado después, se inyecta de vuelta a la lista
 * (marcado como inactivo) para no perder ni ocultar la asignación
 * histórica de una clase ya creada.
 */
function buildTrainerOptions(
  trainers: TrainerOptionRow[],
  currentId: string | null,
  currentName: string | null,
): TrainerOptionRow[] {
  if (!currentId || trainers.some((t) => t.id === currentId)) return trainers;
  return [...trainers, { id: currentId, name: `${currentName ?? "Entrenador"} (inactivo)` }];
}

interface ClassFormModalProps {
  open: boolean;
  gymId: string;
  classItem: ClassDetail | null;
  initialDate: string | null;
  clients: ClientListItem[];
  trainers: TrainerOptionRow[];
  classTypes: ClassTypeOption[];
  exercises: ExerciseOptionRow[];
  onClose: () => void;
  onSaved: () => void;
}

export function ClassFormModal({
  open,
  gymId,
  classItem,
  initialDate,
  clients,
  trainers,
  classTypes,
  exercises,
  onClose,
  onSaved,
}: ClassFormModalProps) {
  const [form, setForm] = useState<ClassFormInput>(() => (classItem ? classToFormInput(classItem) : emptyClassForm(initialDate ?? undefined)));
  const [errors, setErrors] = useState<ClassValidationErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [repeatEnabled, setRepeatEnabled] = useState(false);

  useEffect(() => {
    if (!open) return;
    const initial = classItem ? classToFormInput(classItem) : emptyClassForm(initialDate ?? undefined);
    setForm(initial);
    setRepeatEnabled(false);
    setErrors({});
    setFormError(null);
  }, [open, classItem, initialDate]);

  function update<K extends keyof ClassFormInput>(key: K, value: ClassFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const trainerOptions = buildTrainerOptions(trainers, classItem?.trainerId ?? null, classItem?.trainerName ?? null);
  const selectedClients = clients.filter((c) => form.clientIds.includes(c.id));

  function toggleRepeat(checked: boolean) {
    setRepeatEnabled(checked);
    update("repeat", checked ? { frequency: "WEEKLY", weekdays: [], until: form.date } : null);
  }

  function toggleWeekday(day: number) {
    if (!form.repeat) return;
    const weekdays = form.repeat.weekdays.includes(day)
      ? form.repeat.weekdays.filter((d) => d !== day)
      : [...form.repeat.weekdays, day];
    update("repeat", { ...form.repeat, weekdays });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const fieldErrors = validateClassForm(form, exercises);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      if (classItem) {
        await classService.updateClass(gymId, classItem.id, form);
      } else {
        await classService.createClass(gymId, form);
      }
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ClassValidationError) {
        setErrors(err.errors);
      } else {
        setFormError(err instanceof Error ? err.message : "No se pudo guardar la clase.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={classItem ? "Editar clase" : "Crear nueva clase"}
        widthClassName="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Nombre de la clase</label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Ej. Cross Training — Lunes" />
            {errors.name && <p className="mt-1 text-xs text-danger">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Tipo de clase</label>
              <Select value={form.classTypeId} onChange={(e) => update("classTypeId", e.target.value)}>
                <option value="">Selecciona un tipo</option>
                {classTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </Select>
              {errors.classTypeId && <p className="mt-1 text-xs text-danger">{errors.classTypeId}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Entrenador</label>
              <Select
                value={form.trainerId ?? ""}
                onChange={(e) => update("trainerId", e.target.value || null)}
              >
                <option value="">Sin asignar</option>
                {trainerOptions.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Fecha</label>
              <Input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} />
              {errors.date && <p className="mt-1 text-xs text-danger">{errors.date}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Hora de inicio</label>
              <Input type="time" value={form.startTime} onChange={(e) => update("startTime", e.target.value)} />
              {errors.startTime && <p className="mt-1 text-xs text-danger">{errors.startTime}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Hora de finalización</label>
              <Input type="time" value={form.endTime} onChange={(e) => update("endTime", e.target.value)} />
              {errors.endTime && <p className="mt-1 text-xs text-danger">{errors.endTime}</p>}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Cupo máximo</label>
            <Input
              type="number"
              value={form.capacity}
              onChange={(e) => update("capacity", Number(e.target.value))}
              className="w-32"
            />
            {errors.capacity && <p className="mt-1 text-xs text-danger">{errors.capacity}</p>}
          </div>

          <div className="border-t border-border pt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">Clientes inscritos</h3>
              <Button type="button" variant="secondary" size="sm" onClick={() => setClientPickerOpen(true)}>
                <Users className="h-4 w-4" />
                Agregar clientes
              </Button>
            </div>
            {selectedClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin clientes inscritos todavía.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedClients.map((client) => (
                  <span
                    key={client.id}
                    className="flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-xs text-foreground"
                  >
                    {client.name}
                    <button
                      type="button"
                      onClick={() => update("clientIds", form.clientIds.filter((id) => id !== client.id))}
                      className="text-muted-foreground hover:text-danger"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedClients.length} / {form.capacity} inscritos
            </p>
            {errors.clientIds && <p className="mt-1 text-xs text-danger">{errors.clientIds}</p>}
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground">
              Bloques de entrenamiento
            </h3>
            <BlockEditor blocks={form.blocks} exercises={exercises} onChange={(blocks) => update("blocks", blocks)} />
            {errors.blocks && <p className="mt-1 text-xs text-danger">{errors.blocks}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Descripción</label>
            <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={2} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Observaciones</label>
            <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2} />
          </div>

          {!classItem && (
            <div className="border-t border-border pt-4">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={repeatEnabled}
                  onChange={(e) => toggleRepeat(e.target.checked)}
                  className="h-4 w-4 rounded border-border-strong"
                />
                Repetir clase
              </label>

              {repeatEnabled && form.repeat && (
                <div className="mt-3 flex flex-col gap-3 rounded-lg border border-border p-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Repetir</label>
                    <div className="flex gap-4">
                      {(Object.keys(RECURRENCE_FREQUENCY_LABELS) as RecurrenceFrequency[]).map((freq) => (
                        <label key={freq} className="flex items-center gap-1.5 text-sm text-foreground">
                          <input
                            type="radio"
                            name="recurrence-frequency"
                            checked={form.repeat!.frequency === freq}
                            onChange={() => update("repeat", { ...form.repeat!, frequency: freq })}
                          />
                          {RECURRENCE_FREQUENCY_LABELS[freq]}
                        </label>
                      ))}
                    </div>
                  </div>

                  {form.repeat.frequency === "WEEKLY" && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Días</label>
                      <div className="flex flex-wrap gap-3">
                        {WEEKDAY_LABELS.map((label, day) => (
                          <label key={day} className="flex items-center gap-1.5 text-sm text-foreground">
                            <input
                              type="checkbox"
                              checked={form.repeat!.weekdays.includes(day)}
                              onChange={() => toggleWeekday(day)}
                              className="h-4 w-4 rounded border-border-strong"
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Hasta</label>
                    <Input
                      type="date"
                      value={form.repeat.until}
                      onChange={(e) => update("repeat", { ...form.repeat!, until: e.target.value })}
                      className="w-44"
                    />
                  </div>
                  {errors.repeat && <p className="text-xs text-danger">{errors.repeat}</p>}
                </div>
              )}
            </div>
          )}

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
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : classItem ? "Guardar cambios" : "Crear clase"}
            </Button>
          </div>
        </form>
      </Modal>

      <ClientPickerModal
        open={clientPickerOpen}
        clients={clients}
        selectedIds={form.clientIds}
        capacity={form.capacity || null}
        onClose={() => setClientPickerOpen(false)}
        onConfirm={(ids) => {
          update("clientIds", ids);
          setClientPickerOpen(false);
        }}
      />
    </>
  );
}
