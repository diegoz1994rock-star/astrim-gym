import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Users } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validateAssignRoutineForm } from "@/lib/domain/routineValidation";
import type { AssignRoutineValidationErrors } from "@/lib/domain/routineValidation";
import * as routineService from "@/lib/services/routineService";
import { AssignRoutineValidationError } from "@/lib/services/routineService";
import { emptyAssignRoutineForm, type AssignRoutineFormInput, type RoutineListItem } from "@/types/routine";
import type { ClientListItem } from "@/types/client";
import { ClientPickerModal } from "@/components/ClientPickerModal";

interface AssignRoutineModalProps {
  open: boolean;
  gymId: string;
  routine: RoutineListItem | null;
  clients: ClientListItem[];
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Alta en lote: cada apertura empieza con la selección vacía y solo agrega
 * clientes nuevos a la rutina (los ya asignados se gestionan y se quitan
 * desde la lista de asignaciones en RoutineDetailPage, no desde aquí).
 */
export function AssignRoutineModal({ open, gymId, routine, clients, onClose, onSaved }: AssignRoutineModalProps) {
  const [form, setForm] = useState<AssignRoutineFormInput>(() => emptyAssignRoutineForm());
  const [errors, setErrors] = useState<AssignRoutineValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(emptyAssignRoutineForm());
      setErrors({});
      setFormError(null);
    }
  }, [open]);

  const selectedClients = clients.filter((c) => form.clientIds.includes(c.id));

  function update<K extends keyof AssignRoutineFormInput>(key: K, value: AssignRoutineFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!routine) return;

    const fieldErrors = validateAssignRoutineForm(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      await routineService.assignRoutineClients(gymId, routine.id, form);
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof AssignRoutineValidationError) {
        setErrors(err.errors);
      } else {
        setFormError(err instanceof Error ? err.message : "No se pudo asignar la rutina.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Asignar clientes"
      description={routine ? `Rutina: ${routine.name}` : undefined}
      widthClassName="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Clientes *</label>
            <Button type="button" variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>
              <Users className="h-4 w-4" />
              Agregar clientes
            </Button>
          </div>
          {selectedClients.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ningún cliente seleccionado todavía.</p>
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
          {errors.clientIds && <p className="mt-1 text-xs text-danger">{errors.clientIds}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Fecha de inicio</label>
            <Input
              type="date"
              value={form.startDate ?? ""}
              onChange={(e) => update("startDate", e.target.value || null)}
            />
            {errors.startDate && <p className="mt-1 text-xs text-danger">{errors.startDate}</p>}
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
            {errors.endDate && <p className="mt-1 text-xs text-danger">{errors.endDate}</p>}
          </div>
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
              "Asignar"
            )}
          </Button>
        </div>
      </form>

      <ClientPickerModal
        open={pickerOpen}
        clients={clients}
        selectedIds={form.clientIds}
        capacity={null}
        onClose={() => setPickerOpen(false)}
        onConfirm={(ids) => {
          update("clientIds", ids);
          setPickerOpen(false);
        }}
      />
    </Modal>
  );
}
