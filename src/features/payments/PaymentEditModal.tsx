import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/format";
import { validatePaymentEditForm } from "@/lib/domain/paymentValidation";
import type { PaymentEditValidationErrors } from "@/lib/domain/paymentValidation";
import * as paymentService from "@/lib/services/paymentService";
import { PaymentEditValidationError } from "@/lib/services/paymentService";
import {
  paymentToEditInput,
  type PaymentEditInput,
  type PaymentListItem,
  type PaymentMethod,
} from "@/types/payment";
import { PAYMENT_METHOD_LABELS } from "@/types/membership";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-danger">{message}</p>;
}

interface PaymentEditModalProps {
  open: boolean;
  gymId: string;
  payment: PaymentListItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export function PaymentEditModal({ open, gymId, payment, onClose, onSaved }: PaymentEditModalProps) {
  const [form, setForm] = useState<PaymentEditInput | null>(null);
  const [errors, setErrors] = useState<PaymentEditValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open && payment) {
      setForm(paymentToEditInput(payment));
      setErrors({});
      setFormError(null);
    }
  }, [open, payment]);

  if (!payment || !form) return null;

  function update<K extends keyof PaymentEditInput>(key: K, value: PaymentEditInput[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form || !payment) return;
    setFormError(null);

    const fieldErrors = validatePaymentEditForm(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      await paymentService.updatePaymentConcept(gymId, payment.id, form);
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof PaymentEditValidationError) {
        setErrors(err.errors);
      } else {
        setFormError(err instanceof Error ? err.message : "No se pudo actualizar el pago.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar pago"
      description={`${payment.clientName} — ${formatCurrency(payment.amount)} del ${formatDate(payment.date)}`}
      widthClassName="max-w-md"
    >
      <div className="mb-4 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        Por integridad del historial financiero, solo puedes corregir el método y el concepto de un
        pago ya registrado. El valor, la fecha, el cliente y la membresía no se pueden modificar.
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Método de pago</label>
          <Select value={form.method} onChange={(e) => update("method", e.target.value as PaymentMethod)}>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <FieldError message={errors.method} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Concepto / motivo
          </label>
          <Textarea rows={2} value={form.concept} onChange={(e) => update("concept", e.target.value)} />
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
