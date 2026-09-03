import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { ATTENDANCE_METHOD_LABELS, type AttendanceListItem } from "@/types/attendance";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

interface AttendanceDetailModalProps {
  open: boolean;
  record: AttendanceListItem | null;
  onClose: () => void;
}

export function AttendanceDetailModal({ open, record, onClose }: AttendanceDetailModalProps) {
  if (!record) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalle de asistencia"
      description={record.clientName}
      widthClassName="max-w-md"
    >
      <div className="mb-4">
        {record.isInside ? (
          <Badge tone="success">Dentro del gimnasio</Badge>
        ) : (
          <Badge tone="neutral">Salida registrada</Badge>
        )}
      </div>
      <InfoRow label="Fecha" value={formatDate(record.date)} />
      <InfoRow label="Hora de entrada" value={record.checkIn ?? "—"} />
      <InfoRow label="Hora de salida" value={record.checkOut ?? "—"} />
      <InfoRow
        label="Método"
        value={
          (record.exitMethod && ATTENDANCE_METHOD_LABELS[record.exitMethod]) ||
          (record.entryMethod && ATTENDANCE_METHOD_LABELS[record.entryMethod]) ||
          "—"
        }
      />
      <InfoRow label="Membresía relacionada" value={record.planName ?? "—"} />
      <InfoRow label="Observaciones" value={record.notes || "—"} />
    </Modal>
  );
}
