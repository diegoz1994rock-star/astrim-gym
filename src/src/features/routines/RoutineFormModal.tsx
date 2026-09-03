import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { validateRoutineForm } from "@/lib/domain/routineValidation";
import type { RoutineValidationErrors } from "@/lib/domain/routineValidation";
import * as routineService from "@/lib/services/routineService";
import { RoutineValidationError } from "@/lib/services/routineService";
import {
  ROUTINE_NAME_GROUPS,
  ROUTINE_NAME_OPTIONS,
  ROUTINE_OBJECTIVE_OPTIONS,
  ROUTINE_STATUS_LABELS,
  emptyRoutineForm,
  routineToFormInput,
  type RoutineFormInput,
  type RoutineListItem,
} from "@/types/routine";
import type { ClientListItem } from "@/types/client";

interface RoutineFormModalProps {
  open: boolean;
  gymId: string;
  routine: RoutineListItem | null;
  clients: ClientListItem[];
  /** Cliente preseleccionado al crear una rutina desde su perfil (opcional). */
  defaultClientId?: string;
  onClose: () => void;
  onSaved: (routineId: string) => void;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-danger">{message}</p>;
}

function toFormInput(routine: RoutineListItem | null, defaultClientId?: string): RoutineFormInput {
  return routine ? routineToFormInput(routine) : emptyRoutineForm(defaultClientId);
}

export function RoutineFormModal({
  open,
  gymId,
  routine,
  clients,
  defaultClientId,
  onClose,
  onSaved,
}: RoutineFormModalProps) {
  const [form, setForm] = useState<RoutineFormInput>(() => toFormInput(routine, defaultClientId));
  const [errors, setErrors] = useState<RoutineValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(toFormInput(routine, defaultClientId));
      setErrors({});
      setFormError(null);
    }
  }, [open, routine, defaultClientId]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === form.clientId) ?? null,
    [clients, form.clientId],
  );

  function update<K extends keyof RoutineFormInput>(key: K, value: RoutineFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const fieldErrors = validateRoutineForm(form, {
      allowedName: routine?.name,
      allowedDescription: routine?.description,
    });
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const id = routine
        ? await routineService.updateRoutine(gymId, routine.id, form).then(() => routine.id)
        : await routineService.createRoutine(gymId, form);
      onSaved(id);
      onClose();
    } catch (err) {
      if (err instanceof RoutineValidationError) {
        setErrors(err.errors);
      } else {
        setFormError(err instanceof Error ? err.message : "No se pudo guardar la rutina.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={routine ? "Editar rutina" : "Nueva rutina"}
      description={routine ? routine.name : "Asigna un plan de entrenamiento a un cliente."}
      widthClassName="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Cliente *</label>
          <Select
            value={form.clientId}
            onChange={(e) => update("clientId", e.target.value)}
            disabled={Boolean(routine) || Boolean(defaultClientId)}
          >
            <option value="">Selecciona un cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name} {client.document ? `— ${client.document}` : ""}
              </option>
            ))}
          </Select>
          <FieldError message={errors.clientId} />
          {selectedClient && (
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedClient.trainerName ? `Entrenador: ${selectedClient.trainerName}` : "Sin entrenador asignado"}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Nombre de la rutina *
          </label>
          <Select value={form.name} onChange={(e) => update("name", e.target.value)}>
            <option value="">Seleccionar rutina</option>
            {/* Rutina histórica que ya no está en el catálogo: se conserva visible para no perderla al editar. */}
            {form.name && !ROUTINE_NAME_OPTIONS.includes(form.name) && (
              <option value={form.name}>{form.name} (histórica)</option>
            )}
            {ROUTINE_NAME_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
          <FieldError message={errors.name} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Objetivo / descripción
          </label>
          <Select value={form.description} onChange={(e) => update("description", e.target.value)}>
            <option value="">Seleccionar objetivo</option>
            {form.description && !ROUTINE_OBJECTIVE_OPTIONS.includes(form.description) && (
              <option value={form.description}>{form.description} (histórico)</option>
            )}
            {ROUTINE_OBJECTIVE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
          <FieldError message={errors.description} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Fecha de inicio
            </label>
            <Input
              type="date"
              value={form.startDate ?? ""}
              onChange={(e) => update("startDate", e.target.value || null)}
            />
            <FieldError message={errors.startDate} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Fecha final (opcional)
            </label>
            <Input
              type="date"
              value={form.endDate ?? ""}
              onChange={(e) => update("endDate", e.target.value || null)}
            />
            <FieldError message={errors.endDate} />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Estado</label>
          <Select
            value={form.status}
            onChange={(e) => update("status", e.target.value as RoutineFormInput["status"])}
          >
            {Object.entries(ROUTINE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

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
            ) : (
              "Guardar rutina"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
