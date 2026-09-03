import { Modal } from "@/components/ui/modal";
import { PaymentStatusBadge } from "@/components/StatusBadges";
import { formatCurrency, formatDate } from "@/lib/format";
import type { PaymentListItem } from "@/types/payment";
import { PAYMENT_METHOD_LABELS } from "@/types/membership";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

interface PaymentDetailModalProps {
  open: boolean;
  payment: PaymentListItem | null;
  onClose: () => void;
}

export function PaymentDetailModal({ open, payment, onClose }: PaymentDetailModalProps) {
  if (!payment) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalle del pago"
      description={payment.clientName}
      widthClassName="max-w-md"
    >
      <div className="mb-4">
        <PaymentStatusBadge status={payment.status} />
      </div>
      <InfoRow label="Valor" value={formatCurrency(payment.amount)} />
      <InfoRow label="Fecha" value={formatDate(payment.date)} />
      <InfoRow label="Método" value={PAYMENT_METHOD_LABELS[payment.method]} />
      <InfoRow label="Membresía relacionada" value={payment.planName ?? "Ninguna"} />
      <InfoRow label="Concepto" value={payment.concept || "—"} />
    </Modal>
  );
}
