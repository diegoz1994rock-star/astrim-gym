import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  validatePlanForm,
  type MembershipPlanValidationErrors,
} from "@/lib/domain/membershipPlanValidation";
import * as membershipPlanService from "@/lib/services/membershipPlanService";
import { PlanValidationError } from "@/lib/services/membershipPlanService";
import {
  emptyPlanForm,
  planToFormInput,
  type MembershipPlanFormInput,
  type MembershipPlanListItem,
} from "@/types/membership";

interface PlanFormModalProps {
  open: boolean;
  gymId: string;
  plan: MembershipPlanListItem | null;
  onClose: () => void;
  onSaved: () => void;
}

function toFormInput(plan: MembershipPlanListItem | null): MembershipPlanFormInput {
  return plan ? planToFormInput(plan) : emptyPlanForm();
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-danger">{message}</p>;
}

export function PlanFormModal({ open, gymId, plan, onClose, onSaved }: PlanFormModalProps) {
  const [form, setForm] = useState<MembershipPlanFormInput>(() => toFormInput(plan));
  const [errors, setErrors] = useState<MembershipPlanValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(toFormInput(plan));
      setErrors({});
      setFormError(null);
    }
  }, [open, plan]);

  function update<K extends keyof MembershipPlanFormInput>(key: K, value: MembershipPlanFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const fieldErrors = validatePlanForm(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      if (plan) {
        await membershipPlanService.updatePlan(gymId, plan.id, form);
      } else {
        await membershipPlanService.createPlan(gymId, form);
      }
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof PlanValidationError) {
        setErrors(err.errors);
      } else {
        setFormError(err instanceof Error ? err.message : "No se pudo guardar el plan.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={plan ? "Editar plan" : "Nuevo plan de membresía"}
      description={plan ? plan.name : "Define un plan que luego podrás asignar a tus clientes."}
      widthClassName="max-w-md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Nombre del plan *
          </label>
          <Input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Ej. Mensual"
          />
          <FieldError message={errors.name} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Duración (días) *
            </label>
            <Input
              type="number"
              min={1}
              step={1}
              value={form.durationDays ?? ""}
              onChange={(e) =>
                update("durationDays", e.target.value === "" ? null : Number(e.target.value))
              }
              placeholder="30"
            />
            <FieldError message={errors.durationDays} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Precio *</label>
            <Input
              type="number"
              min={0}
              step={1}
              value={form.price ?? ""}
              onChange={(e) => update("price", e.target.value === "" ? null : Number(e.target.value))}
              placeholder="80000"
            />
            <FieldError message={errors.price} />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Descripción</label>
          <Textarea
            rows={2}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Estado</label>
          <Select
            value={form.active ? "1" : "0"}
            onChange={(e) => update("active", e.target.value === "1")}
          >
            <option value="1">Activo</option>
            <option value="0">Inactivo</option>
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
              "Guardar plan"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
