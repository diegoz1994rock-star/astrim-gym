import { Modal } from "@/components/ui/modal";
import { formatDate } from "@/lib/format";
import { metersToCm } from "@/lib/domain/validation";
import type { MeasurementListItem } from "@/types/measurement";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

interface MeasurementDetailModalProps {
  open: boolean;
  measurement: MeasurementListItem | null;
  onClose: () => void;
}

export function MeasurementDetailModal({ open, measurement, onClose }: MeasurementDetailModalProps) {
  if (!measurement) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalle de la medición"
      description={formatDate(measurement.date)}
      widthClassName="max-w-md"
    >
      <InfoRow label="Peso" value={measurement.weight !== null ? `${measurement.weight} kg` : "—"} />
      <InfoRow
        label="Altura"
        value={measurement.height !== null ? `${metersToCm(measurement.height)} cm` : "—"}
      />
      <InfoRow label="IMC" value={measurement.bmi !== null ? measurement.bmi.toFixed(1) : "—"} />
      <InfoRow label="Cintura" value={measurement.waist !== null ? `${measurement.waist} cm` : "—"} />
      <InfoRow label="Pecho" value={measurement.chest !== null ? `${measurement.chest} cm` : "—"} />
      <InfoRow label="Brazo" value={measurement.arm !== null ? `${measurement.arm} cm` : "—"} />
      <InfoRow label="Muslo" value={measurement.leg !== null ? `${measurement.leg} cm` : "—"} />
      <InfoRow label="Pantorrilla" value={measurement.calf !== null ? `${measurement.calf} cm` : "—"} />
      <InfoRow label="Cadera" value={measurement.hip !== null ? `${measurement.hip} cm` : "—"} />
      <InfoRow
        label="Grasa corporal"
        value={measurement.bodyFat !== null ? `${measurement.bodyFat}%` : "—"}
      />
      <InfoRow
        label="Masa muscular"
        value={measurement.muscleMass !== null ? `${measurement.muscleMass} kg` : "—"}
      />
      <InfoRow label="Observaciones" value={measurement.notes || "—"} />
    </Modal>
  );
}
