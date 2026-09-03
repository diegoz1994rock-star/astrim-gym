import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/format";
import { calculateEndDate, calculateRenewalStartDate } from "@/lib/domain/membershipDates";
import { validateMembershipForm } from "@/lib/domain/membershipValidation";
import type { MembershipValidationErrors } from "@/lib/domain/membershipValidation";
import * as membershipService from "@/lib/services/membershipService";
import { MembershipValidationError } from "@/lib/services/membershipService";
import {
  PAYMENT_METHOD_LABELS,
  emptyMembershipForm,
  type MembershipFormInput,
  type MembershipListItem,
  type PaymentMethod,
} from "@/types/membership";
import type { ClientListItem } from "@/types/client";
import type { MembershipPlanListItem } from "@/types/membership";

interface MembershipFormModalProps {
  open: boolean;
  gymId: string;
  clients: ClientListItem[];
  plans: MembershipPlanListItem[];
  /** Si se provee, el formulario abre en modo renovación para esta membresía. */
  renewFrom: MembershipListItem | null;
  onClose: () => void;
  onSaved: () => void;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-danger">{message}</p>;
}

function buildInitialForm(
  renewFrom: MembershipListItem | null,
  plans: MembershipPlanListItem[],
): MembershipFormInput {
  if (!renewFrom) return emptyMembershipForm();

  const plan = plans.find((p) => p.id === renewFrom.planId);
  const startDate = calculateRenewalStartDate(renewFrom.endDate);
  return emptyMembershipForm({
    clientId: renewFrom.clientId,
    planId: renewFrom.planId,
    startDate,
    price: plan?.price ?? renewFrom.price,
  });
}

export function MembershipFormModal({
  open,
  gymId,
  clients,
  plans,
  renewFrom,
  onClose,
  onSaved,
}: MembershipFormModalProps) {
  const [form, setForm] = useState<MembershipFormInput>(() => buildInitialForm(renewFrom, plans));
  const [errors, setErrors] = useState<MembershipValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(buildInitialForm(renewFrom, plans));
      setErrors({});
      setFormError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, renewFrom]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === form.clientId) ?? null,
    [clients, form.clientId],
  );
  const selectedPlan = useMemo(() => plans.find((p) => p.id === form.planId) ?? null, [plans, form.planId]);

  const projectedEndDate = useMemo(() => {
    if (!form.startDate || !selectedPlan) return null;
    return calculateEndDate(form.startDate, selectedPlan.durationDays);
  }, [form.startDate, selectedPlan]);

  const showActiveWarning =
    !renewFrom &&
    selectedClient &&
    (selectedClient.membershipStatus === "ACTIVE" || selectedClient.membershipStatus === "EXPIRING_SOON");

  function update<K extends keyof MembershipFormInput>(key: K, value: MembershipFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleClientChange(clientId: string) {
    setForm((prev) => ({ ...prev, clientId }));
  }

  function handlePlanChange(planId: string) {
    const plan = plans.find((p) => p.id === planId) ?? null;
    setForm((prev) => ({
      ...prev,
      planId,
      price: plan?.price ?? prev.price,
      paymentAmount: plan?.price ?? prev.paymentAmount,
    }));
  }

  function useSuggestedRenewalDate() {
    if (!selectedClient?.membershipEndDate) return;
    const suggested = calculateRenewalStartDate(selectedClient.membershipEndDate);
    setForm((prev) => ({ ...prev, startDate: suggested, paymentDate: suggested }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const fieldErrors = validateMembershipForm(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      await membershipService.createMembership(gymId, form);
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof MembershipValidationError) {
        setErrors(err.errors);
      } else {
        setFormError(err instanceof Error ? err.message : "No se pudo guardar la membresía.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={renewFrom ? "Renovar membresía" : "Nueva membresía"}
      description={
        renewFrom
          ? `${renewFrom.clientName} — plan actual: ${renewFrom.planName}`
          : "Asigna un plan a un cliente y registra el pago si corresponde."
      }
      widthClassName="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Cliente *</label>
          <Select
            value={form.clientId}
            onChange={(e) => handleClientChange(e.target.value)}
            disabled={Boolean(renewFrom)}
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
            <div className="mt-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              <p>
                Documento: <span className="text-foreground">{selectedClient.document ?? "—"}</span>
              </p>
              <p>
                Membresía actual:{" "}
                <span className="text-foreground">
                  {selectedClient.membershipPlanName
                    ? `${selectedClient.membershipPlanName} (vence ${formatDate(selectedClient.membershipEndDate)})`
                    : "Sin membresía"}
                </span>
              </p>
            </div>
          )}

          {showActiveWarning && (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p>
                  Este cliente ya tiene una membresía {selectedClient?.membershipStatus === "ACTIVE" ? "activa" : "por vencer"} hasta
                  el {formatDate(selectedClient?.membershipEndDate ?? null)}.
                </p>
                <button
                  type="button"
                  onClick={useSuggestedRenewalDate}
                  className="mt-1 font-medium underline underline-offset-2"
                >
                  Usar fecha de inicio sugerida para no perder días pagados
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Plan *</label>
            <Select value={form.planId} onChange={(e) => handlePlanChange(e.target.value)}>
              <option value="">Selecciona un plan</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} — {plan.durationDays} días — {formatCurrency(plan.price)}
                </option>
              ))}
            </Select>
            <FieldError message={errors.planId} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Fecha de inicio *
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
              Vencimiento (calculado)
            </label>
            <Input value={projectedEndDate ? formatDate(projectedEndDate) : "—"} disabled />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Precio *</label>
            <Input
              type="number"
              min={0}
              step={1}
              value={form.price ?? ""}
              onChange={(e) => update("price", e.target.value === "" ? null : Number(e.target.value))}
            />
            <FieldError message={errors.price} />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Notas</label>
          <Textarea rows={2} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
        </div>

        <div className="rounded-lg border border-border p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={form.registerPayment}
              onChange={(e) => update("registerPayment", e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Registrar pago ahora
          </label>

          {form.registerPayment && (
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Valor
                </label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={form.paymentAmount ?? ""}
                  onChange={(e) =>
                    update("paymentAmount", e.target.value === "" ? null : Number(e.target.value))
                  }
                />
                <FieldError message={errors.paymentAmount} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Método
                </label>
                <Select
                  value={form.paymentMethod}
                  onChange={(e) => update("paymentMethod", e.target.value as PaymentMethod)}
                >
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Fecha de pago
                </label>
                <Input
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) => update("paymentDate", e.target.value)}
                />
                <FieldError message={errors.paymentDate} />
              </div>
            </div>
          )}
          {!form.registerPayment && (
            <p className="mt-2 text-xs text-muted-foreground">
              La membresía quedará registrada con pago pendiente.
            </p>
          )}
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
            ) : renewFrom ? (
              "Renovar membresía"
            ) : (
              "Guardar membresía"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
