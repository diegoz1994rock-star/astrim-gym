import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, Pencil, Users, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import * as classService from "@/lib/services/classService";
import * as clientService from "@/lib/services/clientService";
import * as trainerService from "@/lib/services/trainerService";
import * as exerciseService from "@/lib/services/exerciseService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ClassFormModal } from "./ClassFormModal";
import { formatRoutineExerciseSummary } from "@/lib/domain/exerciseConfigMode";
import { CLASS_BLOCK_TYPE_LABELS, CLASS_STATUS_LABELS } from "@/types/class";
import type { ClassDetail, ClassTypeOption } from "@/types/class";
import type { ClientListItem } from "@/types/client";
import type { ExerciseOptionRow, TrainerOptionRow } from "@/types/db";

export function ClassDetailPage() {
  const { classId } = useParams<{ classId: string }>();
  const { user } = useAuth();
  const gymId = user?.gymId ?? null;
  const navigate = useNavigate();

  const [classItem, setClassItem] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [trainers, setTrainers] = useState<TrainerOptionRow[]>([]);
  const [classTypes, setClassTypes] = useState<ClassTypeOption[]>([]);
  const [exercises, setExercises] = useState<ExerciseOptionRow[]>([]);

  const loadClass = useCallback(async () => {
    if (!gymId || !classId) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await classService.getClassDetail(gymId, classId);
      if (!detail) setError("La clase no existe o fue eliminada.");
      setClassItem(detail);
    } finally {
      setLoading(false);
    }
  }, [gymId, classId]);

  useEffect(() => {
    loadClass();
  }, [loadClass]);

  useEffect(() => {
    if (!gymId) return;
    Promise.all([
      clientService.getClients(gymId),
      trainerService.getActiveTrainerOptions(gymId),
      classService.getClassTypeOptions(gymId),
      exerciseService.getExerciseOptions(gymId),
    ]).then(([clientsData, trainersData, classTypesData, exercisesData]) => {
      setClients(clientsData);
      setTrainers(trainersData);
      setClassTypes(classTypesData);
      setExercises(exercisesData);
    });
  }, [gymId]);

  async function handleCancelClass() {
    if (!gymId || !classId) return;
    await classService.cancelClass(gymId, classId);
    setCancelConfirmOpen(false);
    await loadClass();
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Cargando clase...</div>;
  }

  if (error || !classItem) {
    return <div className="text-sm text-danger">{error ?? "La clase no existe."}</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={() => navigate("/clases")}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al calendario
      </button>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>{classItem.name}</CardTitle>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarClock className="h-4 w-4" />
              {classItem.date} · {classItem.startTime} - {classItem.endTime}
            </p>
          </div>
          <Badge tone={classItem.status === "CANCELADA" ? "danger" : "neutral"}>
            {CLASS_STATUS_LABELS[classItem.status]}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>Entrenador: {classItem.trainerName ?? "Sin asignar"}</span>
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {classItem.enrolledCount} / {classItem.capacity} clientes
            </span>
          </div>

          {classItem.description && <p className="text-sm text-foreground">{classItem.description}</p>}

          <div className="flex flex-col gap-4">
            {classItem.blocks.map((block) => (
              <div key={block.id} className="border-t border-border pt-3">
                <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground">
                  {block.name || CLASS_BLOCK_TYPE_LABELS[block.blockType]}
                </h4>
                <ul className="flex flex-col gap-1.5">
                  {block.exercises.map((ex) => {
                    const summary = formatRoutineExerciseSummary(ex);
                    return (
                      <li key={ex.id} className="text-sm text-foreground">
                        • {ex.exerciseName}
                        {summary !== "—" && <span className="text-muted-foreground"> — {summary}</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {classItem.enrollments.length > 0 && (
            <div className="border-t border-border pt-3">
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground">Clientes inscritos</h4>
              <div className="flex flex-wrap gap-2">
                {classItem.enrollments.map((enrollment) => (
                  <span key={enrollment.id} className="rounded-full bg-surface-muted px-3 py-1 text-xs text-foreground">
                    {enrollment.clientName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {classItem.notes && (
            <div className="border-t border-border pt-3">
              <h4 className="mb-1 text-sm font-semibold uppercase tracking-wide text-foreground">Observaciones</h4>
              <p className="text-sm text-muted-foreground">{classItem.notes}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              Editar clase
            </Button>
            {classItem.status !== "CANCELADA" && (
              <Button variant="danger" onClick={() => setCancelConfirmOpen(true)}>
                <XCircle className="h-4 w-4" />
                Cancelar clase
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {gymId && (
        <ClassFormModal
          open={editOpen}
          gymId={gymId}
          classItem={classItem}
          initialDate={null}
          clients={clients}
          trainers={trainers}
          classTypes={classTypes}
          exercises={exercises}
          onClose={() => setEditOpen(false)}
          onSaved={loadClass}
        />
      )}

      <ConfirmDialog
        open={cancelConfirmOpen}
        title="¿Cancelar esta clase?"
        description={
          classItem.enrolledCount > 0
            ? `Hay ${classItem.enrolledCount} clientes inscritos. La clase quedará marcada como CANCELADA.`
            : "La clase quedará marcada como CANCELADA."
        }
        confirmLabel="Cancelar clase"
        danger
        onConfirm={handleCancelClass}
        onCancel={() => setCancelConfirmOpen(false)}
      />
    </div>
  );
}
