import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Eye, Pencil, Plus, Search, Trash2, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import * as clientService from "@/lib/services/clientService";
import * as routineService from "@/lib/services/routineService";
import { filterRoutines } from "@/lib/domain/routineFilters";
import {
  DEFAULT_ROUTINE_FILTERS,
  ROUTINE_STATUS_LABELS,
  type RoutineFilters,
  type RoutineListItem,
} from "@/types/routine";
import type { ClientListItem } from "@/types/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { RoutineStatusBadge } from "@/components/StatusBadges";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RoutineFormModal } from "./RoutineFormModal";
import { AssignRoutineModal } from "./AssignRoutineModal";

export function RoutinesPage() {
  const { user } = useAuth();
  const gymId = user?.gymId ?? null;
  const navigate = useNavigate();

  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [routines, setRoutines] = useState<RoutineListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<RoutineFilters>(DEFAULT_ROUTINE_FILTERS);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<RoutineListItem | null>(null);
  const [assignTarget, setAssignTarget] = useState<RoutineListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoutineListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    if (!gymId) return;
    setLoading(true);
    setError(null);
    try {
      const [clientsData, routinesData] = await Promise.all([
        clientService.getClients(gymId),
        routineService.getRoutines(gymId),
      ]);
      setClients(clientsData);
      setRoutines(routinesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la información de rutinas.");
    } finally {
      setLoading(false);
    }
  }, [gymId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredRoutines = useMemo(() => filterRoutines(routines, filters), [routines, filters]);

  function openCreateForm() {
    setEditingRoutine(null);
    setFormOpen(true);
  }

  function openEditForm(routine: RoutineListItem) {
    setEditingRoutine(routine);
    setFormOpen(true);
  }

  async function confirmDeleteRoutine() {
    if (!gymId || !deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await routineService.deleteRoutine(gymId, deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la rutina.");
    } finally {
      setDeleting(false);
    }
  }

  if (!gymId) {
    return <div className="text-sm text-muted-foreground">No hay un gimnasio asociado a este usuario.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Rutinas</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea plantillas de rutina y asígnalas a los clientes que quieras.
          </p>
        </div>
        <Button onClick={openCreateForm}>
          <Plus className="h-4 w-4" />
          Nueva rutina
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Buscar por nombre de rutina..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </div>

          <div className="lg:w-56 lg:shrink-0">
            <Select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value as RoutineFilters["status"] }))
              }
            >
              <option value="ALL">Todos los estados</option>
              {Object.entries(ROUTINE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {error && <div className="px-6 py-4 text-sm text-danger">{error}</div>}

        {!error && loading && (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            Cargando rutinas...
          </div>
        )}

        {!error && !loading && filteredRoutines.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              {routines.length === 0
                ? "Aún no hay rutinas registradas."
                : "No se encontraron rutinas con estos filtros."}
            </p>
            {routines.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Crea la primera con el botón "Nueva rutina".
              </p>
            )}
          </div>
        )}

        {!error && !loading && filteredRoutines.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Rutina</th>
                  <th className="px-3 py-3 font-medium">Objetivo</th>
                  <th className="px-3 py-3 font-medium">Ejercicios</th>
                  <th className="px-3 py-3 font-medium">Clientes asignados</th>
                  <th className="px-3 py-3 font-medium">Estado</th>
                  <th className="px-6 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoutines.map((routine) => (
                  <tr
                    key={routine.id}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-6 py-3 font-medium text-foreground">{routine.name}</td>
                    <td className="px-3 py-3 text-muted-foreground">{routine.description ?? "—"}</td>
                    <td className="px-3 py-3 text-muted-foreground">{routine.exerciseCount}</td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {routine.assignmentCount === 0 ? (
                        <span className="italic">Sin asignar</span>
                      ) : (
                        `${routine.assignmentCount} cliente${routine.assignmentCount === 1 ? "" : "s"}`
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <RoutineStatusBadge status={routine.status} />
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title="Ver detalle"
                          onClick={() => navigate(`/rutinas/${routine.id}`)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Asignar clientes"
                          onClick={() => setAssignTarget(routine)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <UserPlus className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Editar rutina"
                          onClick={() => openEditForm(routine)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Eliminar"
                          onClick={() => setDeleteTarget(routine)}
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
      </Card>

      <RoutineFormModal
        open={formOpen}
        gymId={gymId}
        routine={editingRoutine}
        onClose={() => setFormOpen(false)}
        onSaved={(routineId) => {
          loadData();
          if (!editingRoutine) navigate(`/rutinas/${routineId}`);
        }}
      />

      <AssignRoutineModal
        open={assignTarget !== null}
        gymId={gymId}
        routine={assignTarget}
        clients={clients}
        onClose={() => setAssignTarget(null)}
        onSaved={loadData}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar rutina"
        description={`¿Deseas eliminar la rutina "${deleteTarget?.name}"? Se borrará junto con sus ejercicios y dejará de estar asignada a ${deleteTarget?.assignmentCount ?? 0} cliente(s). No se puede deshacer.`}
        confirmLabel={deleting ? "Eliminando…" : "Eliminar"}
        danger
        onConfirm={confirmDeleteRoutine}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
