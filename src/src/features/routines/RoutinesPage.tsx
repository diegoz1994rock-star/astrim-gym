import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Eye, Plus, Search } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import * as clientService from "@/lib/services/clientService";
import * as routineService from "@/lib/services/routineService";
import { filterRoutines } from "@/lib/domain/routineFilters";
import { formatDate } from "@/lib/format";
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
import { RoutineFormModal } from "./RoutineFormModal";

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

  if (!gymId) {
    return <div className="text-sm text-muted-foreground">No hay un gimnasio asociado a este usuario.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Rutinas</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Administra los planes de entrenamiento de los clientes de tu gimnasio.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
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
              placeholder="Buscar por cliente o nombre de rutina..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-[520px] lg:shrink-0">
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
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
              title="Desde"
            />
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
              title="Hasta"
            />
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
                  <th className="px-6 py-3 font-medium">Cliente</th>
                  <th className="px-3 py-3 font-medium">Rutina</th>
                  <th className="px-3 py-3 font-medium">Objetivo</th>
                  <th className="px-3 py-3 font-medium">Inicio</th>
                  <th className="px-3 py-3 font-medium">Final</th>
                  <th className="px-3 py-3 font-medium">Ejercicios</th>
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
                    <td className="px-6 py-3 font-medium text-foreground">{routine.clientName}</td>
                    <td className="px-3 py-3 text-muted-foreground">{routine.name}</td>
                    <td className="px-3 py-3 text-muted-foreground">{routine.description ?? "—"}</td>
                    <td className="px-3 py-3 text-muted-foreground">{formatDate(routine.startDate)}</td>
                    <td className="px-3 py-3 text-muted-foreground">{formatDate(routine.endDate)}</td>
                    <td className="px-3 py-3 text-muted-foreground">{routine.exerciseCount}</td>
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
        routine={null}
        clients={clients}
        onClose={() => setFormOpen(false)}
        onSaved={(routineId) => {
          loadData();
          navigate(`/rutinas/${routineId}`);
        }}
      />
    </div>
  );
}
