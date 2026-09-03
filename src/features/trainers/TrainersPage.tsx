import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil, Plus, Power, PowerOff, Search, UserCog, Users } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import * as trainerService from "@/lib/services/trainerService";
import { filterTrainers } from "@/lib/domain/trainerFilters";
import {
  DEFAULT_TRAINER_FILTERS,
  type TrainerFilters,
  type TrainerListItem,
} from "@/types/trainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/Avatar";
import { ActiveStatusBadge } from "@/components/StatusBadges";
import { StatCard } from "@/components/StatCard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TrainerFormModal } from "./TrainerFormModal";

export function TrainersPage() {
  const { user } = useAuth();
  const gymId = user?.gymId ?? null;
  const navigate = useNavigate();

  const [trainers, setTrainers] = useState<TrainerListItem[]>([]);
  const [filters, setFilters] = useState<TrainerFilters>(DEFAULT_TRAINER_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<TrainerListItem | null>(null);
  const [statusTarget, setStatusTarget] = useState<TrainerListItem | null>(null);

  const loadData = useCallback(async () => {
    if (!gymId) return;
    setLoading(true);
    setError(null);
    try {
      setTrainers(await trainerService.getTrainers(gymId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la lista de entrenadores.");
    } finally {
      setLoading(false);
    }
  }, [gymId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const specialties = useMemo(() => {
    const values = new Set<string>();
    for (const trainer of trainers) {
      if (trainer.specialty) values.add(trainer.specialty);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b, "es"));
  }, [trainers]);

  const filteredTrainers = useMemo(() => filterTrainers(trainers, filters), [trainers, filters]);

  const summary = useMemo(() => {
    const active = trainers.filter((t) => t.status === "ACTIVE").length;
    const inactive = trainers.length - active;
    const assignedClients = trainers.reduce((sum, t) => sum + t.clientCount, 0);
    const withoutClients = trainers.filter((t) => t.clientCount === 0).length;
    return { active, inactive, assignedClients, withoutClients };
  }, [trainers]);

  function openCreateForm() {
    setEditingTrainer(null);
    setFormOpen(true);
  }

  function openEditForm(trainer: TrainerListItem) {
    setEditingTrainer(trainer);
    setFormOpen(true);
  }

  async function confirmToggleStatus() {
    if (!gymId || !statusTarget) return;
    const nextStatus = statusTarget.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await trainerService.setTrainerStatus(gymId, statusTarget.id, nextStatus);
    setStatusTarget(null);
    await loadData();
  }

  if (!gymId) {
    return <div className="text-sm text-muted-foreground">No hay un gimnasio asociado a este usuario.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Entrenadores</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Administra el equipo de entrenadores de tu gimnasio.
          </p>
        </div>
        <Button onClick={openCreateForm}>
          <Plus className="h-4 w-4" />
          Nuevo entrenador
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Entrenadores activos" value={summary.active.toLocaleString("es-CO")} icon={UserCog} tone="primary" />
        <StatCard label="Entrenadores inactivos" value={summary.inactive.toLocaleString("es-CO")} icon={UserCog} tone="primary" delay={0.05} />
        <StatCard label="Clientes asignados" value={summary.assignedClients.toLocaleString("es-CO")} icon={Users} tone="success" delay={0.1} />
        <StatCard label="Entrenadores sin clientes" value={summary.withoutClients.toLocaleString("es-CO")} icon={Users} tone="warning" delay={0.15} />
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Buscar por nombre, documento o teléfono..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[360px] lg:shrink-0">
            <Select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value as TrainerFilters["status"] }))
              }
            >
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVE">Activos</option>
              <option value="INACTIVE">Inactivos</option>
            </Select>

            <Select
              value={filters.specialty}
              onChange={(e) => setFilters((prev) => ({ ...prev, specialty: e.target.value }))}
            >
              <option value="ALL">Todas las especialidades</option>
              {specialties.map((specialty) => (
                <option key={specialty} value={specialty}>
                  {specialty}
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
            Cargando entrenadores...
          </div>
        )}

        {!error && !loading && filteredTrainers.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <UserCog className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              {trainers.length === 0
                ? "Aún no tienes entrenadores registrados."
                : "No se encontraron entrenadores con estos filtros."}
            </p>
            {trainers.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Crea el primero con el botón "Nuevo entrenador".
              </p>
            )}
          </div>
        )}

        {!error && !loading && filteredTrainers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="w-14 px-6 py-3 font-medium"></th>
                  <th className="px-3 py-3 font-medium">Entrenador</th>
                  <th className="px-3 py-3 font-medium">Documento</th>
                  <th className="px-3 py-3 font-medium">Teléfono</th>
                  <th className="px-3 py-3 font-medium">Especialidad</th>
                  <th className="px-3 py-3 font-medium">Clientes asignados</th>
                  <th className="px-3 py-3 font-medium">Estado</th>
                  <th className="px-6 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrainers.map((trainer) => (
                  <tr
                    key={trainer.id}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-6 py-3">
                      <Avatar name={trainer.name} photoPath={trainer.photoPath} />
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-foreground">{trainer.name}</p>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{trainer.document ?? "—"}</td>
                    <td className="px-3 py-3 text-muted-foreground">{trainer.phone ?? "—"}</td>
                    <td className="px-3 py-3 text-muted-foreground">{trainer.specialty ?? "—"}</td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {trainer.clientCount} {trainer.clientCount === 1 ? "cliente" : "clientes"}
                    </td>
                    <td className="px-3 py-3">
                      <ActiveStatusBadge status={trainer.status} />
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title="Ver perfil"
                          onClick={() => navigate(`/entrenadores/${trainer.id}`)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Editar"
                          onClick={() => openEditForm(trainer)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title={trainer.status === "ACTIVE" ? "Desactivar" : "Activar"}
                          onClick={() => setStatusTarget(trainer)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          {trainer.status === "ACTIVE" ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
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

      <TrainerFormModal
        open={formOpen}
        gymId={gymId}
        trainer={editingTrainer}
        onClose={() => setFormOpen(false)}
        onSaved={loadData}
      />

      <ConfirmDialog
        open={statusTarget !== null}
        title={statusTarget?.status === "ACTIVE" ? "Desactivar entrenador" : "Activar entrenador"}
        description={
          statusTarget?.status === "ACTIVE"
            ? `${statusTarget?.name} quedará marcado como inactivo. Sus clientes conservan la relación histórica y puedes reactivarlo cuando quieras.`
            : `${statusTarget?.name} volverá a marcarse como activo.`
        }
        confirmLabel={statusTarget?.status === "ACTIVE" ? "Desactivar" : "Activar"}
        danger={statusTarget?.status === "ACTIVE"}
        onConfirm={confirmToggleStatus}
        onCancel={() => setStatusTarget(null)}
      />
    </div>
  );
}
