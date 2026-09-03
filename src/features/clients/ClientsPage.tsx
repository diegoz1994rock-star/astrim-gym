import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, Pencil, Plus, Power, PowerOff, Search, Users as UsersIcon } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import * as clientService from "@/lib/services/clientService";
import * as trainerService from "@/lib/services/trainerService";
import { filterClients } from "@/lib/domain/clientFilters";
import { formatDate } from "@/lib/format";
import { metersToCm } from "@/lib/domain/validation";
import { DEFAULT_CLIENT_FILTERS, type ClientFilters, type ClientListItem } from "@/types/client";
import type { TrainerOptionRow } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/Avatar";
import { MembershipStatusBadge } from "@/components/StatusBadges";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ClientFormModal } from "./ClientFormModal";

export function ClientsPage() {
  const { user } = useAuth();
  const gymId = user?.gymId ?? null;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [trainers, setTrainers] = useState<TrainerOptionRow[]>([]);
  const [filters, setFilters] = useState<ClientFilters>(DEFAULT_CLIENT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientListItem | null>(null);
  const [statusTarget, setStatusTarget] = useState<ClientListItem | null>(null);

  const loadData = useCallback(async () => {
    if (!gymId) return;
    setLoading(true);
    setError(null);
    try {
      const [clientsData, trainersData] = await Promise.all([
        clientService.getClients(gymId),
        trainerService.getActiveTrainerOptions(gymId),
      ]);
      setClients(clientsData);
      setTrainers(trainersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la lista de clientes.");
    } finally {
      setLoading(false);
    }
  }, [gymId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Permite llegar desde el Dashboard (ej. "Clientes activos") con el
  // filtro de estado ya aplicado, sin cambiar el comportamiento de entrar
  // directamente a Clientes (los filtros siguen en "ALL" por defecto).
  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "ACTIVE" || status === "INACTIVE") {
      setFilters((prev) => ({ ...prev, status }));
    }
  }, [searchParams]);

  const filteredClients = useMemo(() => filterClients(clients, filters), [clients, filters]);

  function openCreateForm() {
    setEditingClient(null);
    setFormOpen(true);
  }

  function openEditForm(client: ClientListItem) {
    setEditingClient(client);
    setFormOpen(true);
  }

  async function confirmToggleStatus() {
    if (!gymId || !statusTarget) return;
    const nextStatus = statusTarget.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await clientService.setClientStatus(gymId, statusTarget.id, nextStatus);
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
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Clientes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Administra los miembros de tu gimnasio y consulta su información.
          </p>
        </div>
        <Button onClick={openCreateForm}>
          <Plus className="h-4 w-4" />
          Nuevo cliente
        </Button>
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-[520px] lg:shrink-0">
            <Select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value as ClientFilters["status"] }))
              }
            >
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVE">Activos</option>
              <option value="INACTIVE">Inactivos</option>
            </Select>

            <Select
              value={filters.membership}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  membership: e.target.value as ClientFilters["membership"],
                }))
              }
            >
              <option value="ALL">Toda membresía</option>
              <option value="ACTIVE">Activas</option>
              <option value="EXPIRING_SOON">Por vencer</option>
              <option value="EXPIRED">Vencidas</option>
            </Select>

            <Select
              value={filters.trainerId}
              onChange={(e) => setFilters((prev) => ({ ...prev, trainerId: e.target.value }))}
            >
              <option value="ALL">Todos los entrenadores</option>
              {trainers.map((trainer) => (
                <option key={trainer.id} value={trainer.id}>
                  {trainer.name}
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
            Cargando clientes...
          </div>
        )}

        {!error && !loading && filteredClients.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <UsersIcon className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              {clients.length === 0
                ? "Aún no tienes clientes registrados."
                : "No se encontraron clientes con estos filtros."}
            </p>
            {clients.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Crea el primer cliente con el botón "Nuevo cliente".
              </p>
            )}
          </div>
        )}

        {!error && !loading && filteredClients.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="w-14 px-6 py-3 font-medium"></th>
                  <th className="px-3 py-3 font-medium">Cliente</th>
                  <th className="px-3 py-3 font-medium">Documento</th>
                  <th className="px-3 py-3 font-medium">Teléfono</th>
                  <th className="px-3 py-3 font-medium">Peso</th>
                  <th className="px-3 py-3 font-medium">Altura</th>
                  <th className="px-3 py-3 font-medium">Membresía</th>
                  <th className="px-3 py-3 font-medium">Vencimiento</th>
                  <th className="px-3 py-3 font-medium">Estado</th>
                  <th className="px-6 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-6 py-3">
                      <Avatar name={client.name} photoPath={client.photoPath} />
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-foreground">{client.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {client.trainerName ? `Entrenador: ${client.trainerName}` : "Sin entrenador"}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{client.document ?? "—"}</td>
                    <td className="px-3 py-3 text-muted-foreground">{client.phone ?? "—"}</td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {client.weight ? `${client.weight} kg` : "—"}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {client.height !== null ? `${metersToCm(client.height)} cm` : "—"}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {client.membershipPlanName ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {formatDate(client.membershipEndDate)}
                    </td>
                    <td className="px-3 py-3">
                      {client.status === "INACTIVE" ? (
                        <Badge tone="neutral">Inactivo</Badge>
                      ) : (
                        <MembershipStatusBadge status={client.membershipStatus} />
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title="Ver perfil"
                          onClick={() => navigate(`/clientes/${client.id}`)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Editar"
                          onClick={() => openEditForm(client)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title={client.status === "ACTIVE" ? "Desactivar" : "Activar"}
                          onClick={() => setStatusTarget(client)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          {client.status === "ACTIVE" ? (
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

      <ClientFormModal
        open={formOpen}
        gymId={gymId}
        client={editingClient}
        trainers={trainers}
        onClose={() => setFormOpen(false)}
        onSaved={loadData}
      />

      <ConfirmDialog
        open={statusTarget !== null}
        title={statusTarget?.status === "ACTIVE" ? "Desactivar cliente" : "Activar cliente"}
        description={
          statusTarget?.status === "ACTIVE"
            ? `${statusTarget?.name} quedará marcado como inactivo. Su historial se conserva y puedes reactivarlo cuando quieras.`
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
