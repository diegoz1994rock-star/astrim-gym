import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import * as clientService from "@/lib/services/clientService";
import * as routineService from "@/lib/services/routineService";
import * as exerciseService from "@/lib/services/exerciseService";
import { formatDate } from "@/lib/format";
import { formatRoutineExerciseSummary } from "@/lib/domain/exerciseConfigMode";
import { ROUTINE_STATUS_LABELS, type RoutineExerciseListItem, type RoutineListItem } from "@/types/routine";
import type { ClientListItem } from "@/types/client";
import type { ExerciseOptionRow } from "@/types/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RoutineStatusBadge } from "@/components/StatusBadges";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RoutineFormModal } from "./RoutineFormModal";
import { RoutineExerciseFormModal } from "./RoutineExerciseFormModal";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

export function RoutineDetailPage() {
  const { routineId } = useParams<{ routineId: string }>();
  const { user } = useAuth();
  const gymId = user?.gymId ?? null;
  const navigate = useNavigate();

  const [routine, setRoutine] = useState<RoutineListItem | null>(null);
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [exerciseOptions, setExerciseOptions] = useState<ExerciseOptionRow[]>([]);
  const [routineExercises, setRoutineExercises] = useState<RoutineExerciseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [exerciseFormOpen, setExerciseFormOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<RoutineExerciseListItem | null>(null);
  const [removeTarget, setRemoveTarget] = useState<RoutineExerciseListItem | null>(null);

  const loadData = useCallback(async () => {
    if (!gymId || !routineId) return;
    setLoading(true);
    setError(null);
    try {
      const routineData = await routineService.getRoutineById(gymId, routineId);
      if (!routineData) {
        setError("La rutina no existe o fue eliminada.");
        setRoutine(null);
        return;
      }
      const [clientsData, exerciseOptionsData, routineExercisesData] = await Promise.all([
        clientService.getClients(gymId),
        exerciseService.getExerciseOptions(gymId),
        routineService.getRoutineExercises(gymId, routineId),
      ]);
      setRoutine(routineData);
      setClients(clientsData);
      setExerciseOptions(exerciseOptionsData);
      setRoutineExercises(routineExercisesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la rutina.");
    } finally {
      setLoading(false);
    }
  }, [gymId, routineId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function confirmRemoveExercise() {
    if (!gymId || !routineId || !removeTarget) return;
    await routineService.removeRoutineExercise(gymId, routineId, removeTarget.id);
    setRemoveTarget(null);
    await loadData();
  }

  function openAddExercise() {
    setEditingExercise(null);
    setExerciseFormOpen(true);
  }

  function openEditExercise(exercise: RoutineExerciseListItem) {
    setEditingExercise(exercise);
    setExerciseFormOpen(true);
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Cargando rutina...</div>;
  }

  if (error || !routine) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-danger">{error ?? "Rutina no encontrada."}</p>
        <Button variant="secondary" onClick={() => navigate("/rutinas")}>
          <ArrowLeft className="h-4 w-4" />
          Volver a Rutinas
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={() => navigate("/rutinas")}
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Rutinas
      </button>

      <Card>
        <CardContent className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">{routine.name}</h2>
              <RoutineStatusBadge status={routine.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {routine.clientName} {routine.clientDocument ? `— ${routine.clientDocument}` : ""}
            </p>
          </div>
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Editar rutina
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información general</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Objetivo" value={routine.description || "—"} />
            <InfoRow label="Fecha de inicio" value={formatDate(routine.startDate)} />
            <InfoRow label="Fecha final" value={formatDate(routine.endDate)} />
            <InfoRow label="Estado" value={ROUTINE_STATUS_LABELS[routine.status]} />
            <InfoRow label="Observaciones" value={routine.notes || "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Nombre" value={routine.clientName} />
            <InfoRow label="Documento" value={routine.clientDocument ?? "—"} />
            <div className="pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/clientes/${routine.clientId}`)}
              >
                Ver perfil del cliente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ejercicios ({routineExercises.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex justify-end">
            <Button size="sm" onClick={openAddExercise}>
              <Plus className="h-4 w-4" />
              Agregar ejercicio
            </Button>
          </div>

          {routineExercises.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              Esta rutina todavía no tiene ejercicios asignados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">#</th>
                    <th className="py-2 pr-3 font-medium">Ejercicio</th>
                    <th className="py-2 pr-3 font-medium">Configuración</th>
                    <th className="py-2 pr-3 font-medium">Observaciones</th>
                    <th className="py-2 pr-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {routineExercises.map((exercise, index) => (
                    <tr key={exercise.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2.5 pr-3 text-muted-foreground">{index + 1}</td>
                      <td className="py-2.5 pr-3 font-medium text-foreground">{exercise.exerciseName}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">
                        {formatRoutineExerciseSummary(exercise)}
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{exercise.notes || "—"}</td>
                      <td className="py-2.5 pr-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title="Editar ejercicio"
                            onClick={() => openEditExercise(exercise)}
                            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Quitar ejercicio"
                            onClick={() => setRemoveTarget(exercise)}
                            className="rounded-lg p-2 text-muted-foreground hover:bg-danger/10 hover:text-danger"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <RoutineFormModal
        open={editOpen}
        gymId={gymId ?? ""}
        routine={routine}
        clients={clients}
        onClose={() => setEditOpen(false)}
        onSaved={loadData}
      />

      <RoutineExerciseFormModal
        open={exerciseFormOpen}
        gymId={gymId ?? ""}
        routineId={routine.id}
        exercises={exerciseOptions}
        routineExercise={editingExercise}
        onClose={() => setExerciseFormOpen(false)}
        onSaved={loadData}
      />

      <ConfirmDialog
        open={removeTarget !== null}
        title="Quitar ejercicio"
        description={`Se quitará "${removeTarget?.exerciseName}" de esta rutina.`}
        confirmLabel="Quitar"
        danger
        onConfirm={confirmRemoveExercise}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}
