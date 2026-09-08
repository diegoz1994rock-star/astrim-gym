import { useNavigate } from "react-router-dom";
import { CalendarClock, CheckCircle2, DoorOpen, PlayCircle, Trash2, UserCheck, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { computeCapacityStatus } from "@/lib/domain/classFilters";
import { CAPACITY_STATUS_LABELS, CLASS_STATUS_LABELS, type ClassListItem, type ClassStatus } from "@/types/class";

const STATUS_META: Record<ClassStatus, { tone: "neutral" | "primary" | "success" | "warning" | "danger"; icon: typeof CalendarClock }> = {
  PROGRAMADA: { tone: "neutral", icon: CalendarClock },
  ABIERTA: { tone: "primary", icon: DoorOpen },
  COMPLETA: { tone: "warning", icon: UserCheck },
  EN_CURSO: { tone: "success", icon: PlayCircle },
  FINALIZADA: { tone: "neutral", icon: CheckCircle2 },
  CANCELADA: { tone: "danger", icon: XCircle },
};

const CAPACITY_TONE: Record<ReturnType<typeof computeCapacityStatus>, "success" | "warning" | "danger"> = {
  AVAILABLE: "success",
  ALMOST_FULL: "warning",
  FULL: "danger",
};

interface ClassCardProps {
  classItem: ClassListItem;
  onEdit: () => void;
  onDelete: () => void;
}

export function ClassCard({ classItem, onEdit, onDelete }: ClassCardProps) {
  const navigate = useNavigate();
  const statusMeta = STATUS_META[classItem.status];
  const StatusIcon = statusMeta.icon;
  const capacityStatus = computeCapacityStatus(classItem.enrolledCount, classItem.capacity);

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              {classItem.startTime} — {classItem.endTime} · {classItem.classTypeName}
            </p>
            <p className="text-base font-semibold text-foreground">{classItem.name}</p>
          </div>
          <Badge tone={statusMeta.tone}>
            <StatusIcon className="h-3 w-3" />
            {CLASS_STATUS_LABELS[classItem.status]}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{classItem.trainerName ?? "Sin entrenador asignado"}</span>
          <Badge tone={CAPACITY_TONE[capacityStatus]}>
            {classItem.enrolledCount} / {classItem.capacity} · {CAPACITY_STATUS_LABELS[capacityStatus]}
          </Badge>
        </div>

        <div className="mt-1 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate(`/clases/${classItem.id}`)}>
            Ver clase
          </Button>
          <Button variant="secondary" size="sm" onClick={onEdit}>
            Editar
          </Button>
          {classItem.status !== "CANCELADA" && (
            <Button variant="danger" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
              Eliminar clase
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
