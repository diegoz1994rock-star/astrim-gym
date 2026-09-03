import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/format";
import { validatePaymentForm } from "@/lib/domain/paymentValidation";
import type { PaymentValidationErrors } from "@/lib/domain/paymentValidation";
import * as paymentService from "@/lib/services/paymentService";
import * as membershipService from "@/lib/services/membershipService";
import { PaymentValidationError } from "@/lib/services/paymentService";
import { emptyPaymentForm, type PaymentFormInput, type PaymentMethod } from "@/types/payment";
import type { ClientListItem } from "@/types/client";
import { PAYMENT_METHOD_LABELS, type MembershipListItem } from "@/types/membership";

interface PaymentFormModalProps {
  open: boolean;
  gymId: string;
  clients: ClientListItem[];
  onClose: () => void;
  onSaved: () => void;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-danger">{message}</p>;
}

export function PaymentFormModal({ open, gymId, clients, onClose, onSaved }: PaymentFormModalProps) {
  const [form, setForm] = useState<PaymentFormInput>(() => emptyPaymentForm());
  const [errors, setErrors] = useState<PaymentValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [clientMemberships, setClientMemberships] = useState<MembershipListItem[]>([]);

  useEffect(() => {
    if (open) {
      setForm(emptyPaymentForm());
      setErrors({});
      setFormError(null);
      setClientMemberships([]);
    }
  }, [open]);

  useEffect(() => {
    if (!form.clientId) {
      setClientMemberships([]);
      return;
    }
    let cancelled = false;
    membershipService.getMembershipsByClient(gymId, form.clientId).then((data) => {
      if (!cancelled) setClientMemberships(data);
    });
    return () => {
      cancelled = true;
    };
  }, [gymId, form.clientId]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === form.clientId) ?? null,
    [clients, form.clientId],
  );

  function update<K extends keyof PaymentFormInput>(key: K, value: PaymentFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleClientChange(clientId: string) {
    setForm((prev) => ({ ...prev, clientId, membershipId: null }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const fieldErrors = validatePaymentForm(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      await paymentService.createPayment(gymId, form);
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof PaymentValidationError) {
        setErrors(err.errors);
      } else {
        setFormError(err instanceof Error ? err.message : "No se pudo registrar el pago.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar pago"
      description="Registra un pago de un cliente, relacionado o no con una membresía."
      widthClassName="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Cliente *</label>
          <Select value={form.clientId} onChange={(e) => handleClientChange(e.target.value)}>
            <option value="">Selecciona un cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name} {client.document ? `— ${client.document}` : ""}
              </option>
            ))}
          </Select>
          <FieldError message={errors.clientId} />
          {selectedClient?.document && (
            <p className="mt-1 text-xs text-muted-foreground">Documento: {selectedClient.document}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Membresía relacionada
          </label>
          <Select
            value={form.membershipId ?? ""}
            onChange={(e) => update("membershipId", e.target.value || null)}
            disabled={!form.clientId || clientMemberships.length === 0}
          >
            <option value="">Sin membresía relacionada</option>
            {clientMemberships.map((membership) => (
              <option key={membership.id} value={membership.id}>
                {membership.planName} ({formatDate(membership.startDate)} – {formatDate(membership.endDate)})
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Valor *</label>
            <Input
              type="number"
              min={0}
              step={1}
              value={form.amount ?? ""}
              onChange={(e) => update("amount", e.target.value === "" ? null : Number(e.target.value))}
            />
            <FieldError message={errors.amount} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Fecha *</label>
            <Input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} />
            <FieldError message={errors.date} />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Método de pago *</label>
          <Select value={form.method} onChange={(e) => update("method", e.target.value as PaymentMethod)}>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Concepto / motivo
          </label>
          <Textarea
            rows={2}
            value={form.concept}
            onChange={(e) => update("concept", e.target.value)}
            placeholder="Ej. Pago de membresía, inscripción, producto..."
          />
        </div>

        {form.amount !== null && form.amount > 0 && (
          <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            Se registrará un pago de <span className="font-medium text-foreground">{formatCurrency(form.amount)}</span>
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
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Registrar pago"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
