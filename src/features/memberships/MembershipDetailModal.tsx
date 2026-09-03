import { Modal } from "@/components/ui/modal";
import { MembershipStatusBadge } from "@/components/StatusBadges";
import { formatCurrency, formatDate } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, type MembershipListItem } from "@/types/membership";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

interface MembershipDetailModalProps {
  open: boolean;
  membership: MembershipListItem | null;
  onClose: () => void;
}

export function MembershipDetailModal({ open, membership, onClose }: MembershipDetailModalProps) {
  if (!membership) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalle de la membresía"
      description={membership.clientName}
      widthClassName="max-w-md"
    >
      <div className="mb-4">
        <MembershipStatusBadge status={membership.status} />
      </div>
      <InfoRow label="Plan" value={membership.planName} />
      <InfoRow label="Inicio" value={formatDate(membership.startDate)} />
      <InfoRow label="Vencimiento" value={formatDate(membership.endDate)} />
      <InfoRow label="Precio" value={formatCurrency(membership.price)} />
      <InfoRow
        label="Pago"
        value={membership.paymentStatus === "PAID" ? "Pagado" : "Pendiente"}
      />
      <InfoRow
        label="Método"
        value={membership.method ? PAYMENT_METHOD_LABELS[membership.method] : "—"}
      />
      <InfoRow label="Notas" value={membership.notes || "—"} />
    </Modal>
  );
}
