import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  validateMembershipEditForm,
  type MembershipEditValidationErrors,
} from "@/lib/domain/membershipValidation";
import * as membershipService from "@/lib/services/membershipService";
import { MembershipEditValidationError } from "@/lib/services/membershipService";
import {
  PAYMENT_METHOD_LABELS,
  membershipToEditInput,
  type MembershipEditInput,
  type MembershipListItem,
  type PaymentMethod,
} from "@/types/membership";

interface MembershipEditModalProps {
  open: boolean;
  gymId: string;
  membership: MembershipListItem | null;
  onClose: () => void;
  onSaved: () => void;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-danger">{message}</p>;
}

export function MembershipEditModal({
  open,
  gymId,
  membership,
  onClose,
  onSaved,
}: MembershipEditModalProps) {
  const [form, setForm] = useState<MembershipEditInput | null>(null);
  const [errors, setErrors] = useState<MembershipEditValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open && membership) {
      setForm(membershipToEditInput(membership));
      setErrors({});
      setFormError(null);
    }
  }, [open, membership]);

  if (!membership || !form) return null;

  function update<K extends keyof MembershipEditInput>(key: K, value: MembershipEditInput[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form || !membership) return;
    setFormError(null);

    const fieldErrors = validateMembershipEditForm(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      await membershipService.updateMembership(gymId, membership.id, form);
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof MembershipEditValidationError) {
        setErrors(err.errors);
      } else {
        setFormError(err instanceof Error ? err.message : "No se pudo actualizar la membresía.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar membresía"
      description={`${membership.clientName} — ${membership.planName}`}
      widthClassName="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Fecha de inicio
            </label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => update("startDate", e.target.value)}
            />
            <FieldError message={errors.startDate} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Fecha de vencimiento
            </label>
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => update("endDate", e.target.value)}
            />
            <FieldError message={errors.endDate} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Precio</label>
            <Input
              type="number"
              min={0}
              step={1}
              value={form.price ?? ""}
              onChange={(e) => update("price", e.target.value === "" ? null : Number(e.target.value))}
            />
            <FieldError message={errors.price} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Estado de pago
            </label>
            <Select
              value={form.paymentStatus}
              onChange={(e) => update("paymentStatus", e.target.value as MembershipEditInput["paymentStatus"])}
            >
              <option value="PAID">Pagado</option>
              <option value="PENDING">Pendiente</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Método de pago
            </label>
            <Select
              value={form.method ?? ""}
              onChange={(e) => update("method", (e.target.value || null) as PaymentMethod | null)}
            >
              <option value="">Sin especificar</option>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Estado manual
            </label>
            <Select
              value={form.manualStatus ?? ""}
              onChange={(e) =>
                update("manualStatus", (e.target.value || null) as MembershipEditInput["manualStatus"])
              }
            >
              <option value="">Automático (según fechas)</option>
              <option value="SUSPENDED">Suspendida</option>
              <option value="CANCELLED">Cancelada</option>
            </Select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Notas</label>
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
              "Guardar cambios"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
