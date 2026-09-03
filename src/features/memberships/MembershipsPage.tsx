import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  DollarSign,
  Plus,
  Power,
  PowerOff,
  Eye,
  Pencil,
  RefreshCw,
  Search,
  Users as UsersIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import * as clientService from "@/lib/services/clientService";
import * as membershipService from "@/lib/services/membershipService";
import * as membershipPlanService from "@/lib/services/membershipPlanService";
import * as paymentService from "@/lib/services/paymentService";
import { filterMemberships } from "@/lib/domain/membershipFilters";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  DEFAULT_MEMBERSHIP_FILTERS,
  type MembershipFilters,
  type MembershipListItem,
  type MembershipPlanListItem,
} from "@/types/membership";
import type { ClientListItem } from "@/types/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/StatCard";
import { MembershipStatusBadge } from "@/components/StatusBadges";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MembershipFormModal } from "./MembershipFormModal";
import { MembershipEditModal } from "./MembershipEditModal";
import { MembershipDetailModal } from "./MembershipDetailModal";
import { PlanFormModal } from "./PlanFormModal";

type Tab = "memberships" | "plans";

export function MembershipsPage() {
  const { user } = useAuth();
  const gymId = user?.gymId ?? null;
  const [searchParams] = useSearchParams();

  const [tab, setTab] = useState<Tab>("memberships");

  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [plans, setPlans] = useState<MembershipPlanListItem[]>([]);
  const [memberships, setMemberships] = useState<MembershipListItem[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<MembershipFilters>(DEFAULT_MEMBERSHIP_FILTERS);

  const [formOpen, setFormOpen] = useState(false);
  const [renewFrom, setRenewFrom] = useState<MembershipListItem | null>(null);
  const [detailTarget, setDetailTarget] = useState<MembershipListItem | null>(null);
  const [editTarget, setEditTarget] = useState<MembershipListItem | null>(null);

  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlanListItem | null>(null);
  const [planStatusTarget, setPlanStatusTarget] = useState<MembershipPlanListItem | null>(null);

  const loadData = useCallback(async () => {
    if (!gymId) return;
    setLoading(true);
    setError(null);
    try {
      const [clientsData, plansData, membershipsData, revenue] = await Promise.all([
        clientService.getClients(gymId),
        membershipPlanService.getPlans(gymId),
        membershipService.getMemberships(gymId),
        paymentService.getMonthlyRevenue(gymId),
      ]);
      setClients(clientsData);
      setPlans(plansData);
      setMemberships(membershipsData);
      setMonthlyRevenue(revenue);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la información de membresías.");
    } finally {
      setLoading(false);
    }
  }, [gymId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Permite llegar desde el Dashboard (ej. "Membresías por vencer" /
  // "Membresías vencidas") con el filtro de estado ya aplicado, sin
  // cambiar el comportamiento de entrar directamente a Membresías.
  useEffect(() => {
    const status = searchParams.get("status");
    const validStatuses: MembershipFilters["status"][] = [
      "ACTIVE",
      "EXPIRING_SOON",
      "EXPIRED",
      "SUSPENDED",
      "CANCELLED",
    ];
    if (status && (validStatuses as string[]).includes(status)) {
      setTab("memberships");
      setFilters((prev) => ({ ...prev, status: status as MembershipFilters["status"] }));
    }
  }, [searchParams]);

  const summary = useMemo(() => {
    let active = 0;
    let expiringSoon = 0;
    let expired = 0;
    for (const m of memberships) {
      if (m.status === "ACTIVE") active += 1;
      if (m.status === "EXPIRING_SOON") expiringSoon += 1;
      if (m.status === "EXPIRED") expired += 1;
    }
    return { active, expiringSoon, expired };
  }, [memberships]);

  const filteredMemberships = useMemo(
    () => filterMemberships(memberships, filters),
    [memberships, filters],
  );

  const activePlans = useMemo(() => plans.filter((p) => p.active), [plans]);

  function openCreateMembership() {
    setRenewFrom(null);
    setFormOpen(true);
  }

  function openRenew(membership: MembershipListItem) {
    setRenewFrom(membership);
    setFormOpen(true);
  }

  function openCreatePlan() {
    setEditingPlan(null);
    setPlanFormOpen(true);
  }

  function openEditPlan(plan: MembershipPlanListItem) {
    setEditingPlan(plan);
    setPlanFormOpen(true);
  }

  async function confirmTogglePlanActive() {
    if (!gymId || !planStatusTarget) return;
    await membershipPlanService.setPlanActive(gymId, planStatusTarget.id, !planStatusTarget.active);
    setPlanStatusTarget(null);
    await loadData();
  }

  if (!gymId) {
    return <div className="text-sm text-muted-foreground">No hay un gimnasio asociado a este usuario.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Membresías</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Administra los planes y membresías de los clientes de tu gimnasio.
          </p>
        </div>
        {tab === "memberships" ? (
          <Button onClick={openCreateMembership}>
            <Plus className="h-4 w-4" />
            Nueva membresía
          </Button>
        ) : (
          <Button onClick={openCreatePlan}>
            <Plus className="h-4 w-4" />
            Nuevo plan
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Membresías activas" value={summary.active.toLocaleString("es-CO")} icon={CheckCircle2} tone="primary" />
        <StatCard label="Por vencer" value={summary.expiringSoon.toLocaleString("es-CO")} icon={CalendarClock} tone="warning" delay={0.05} />
        <StatCard label="Vencidas" value={summary.expired.toLocaleString("es-CO")} icon={AlertTriangle} tone="danger" delay={0.1} />
        <StatCard label="Ingresos del mes" value={formatCurrency(monthlyRevenue)} icon={DollarSign} tone="success" delay={0.15} />
      </div>

      <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1 w-fit">
        <button
          type="button"
          onClick={() => setTab("memberships")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "memberships" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          Membresías
        </button>
        <button
          type="button"
          onClick={() => setTab("plans")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "plans" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          Planes
        </button>
      </div>

      {error && <div className="text-sm text-danger">{error}</div>}

      {!error && tab === "memberships" && (
        <>
          <Card className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Buscar por cliente o documento..."
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[440px] lg:shrink-0">
                <Select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, status: e.target.value as MembershipFilters["status"] }))
                  }
                >
                  <option value="ALL">Todos los estados</option>
                  <option value="ACTIVE">Activas</option>
                  <option value="EXPIRING_SOON">Por vencer</option>
                  <option value="EXPIRED">Vencidas</option>
                  <option value="SUSPENDED">Suspendidas</option>
                  <option value="CANCELLED">Canceladas</option>
                </Select>
                <Select
                  value={filters.planId}
                  onChange={(e) => setFilters((prev) => ({ ...prev, planId: e.target.value }))}
                >
                  <option value="ALL">Todos los planes</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            {loading && (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                Cargando membresías...
              </div>
            )}

            {!loading && filteredMemberships.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <UsersIcon className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  {memberships.length === 0
                    ? "Aún no hay membresías registradas."
                    : "No se encontraron membresías con estos filtros."}
                </p>
              </div>
            )}

            {!loading && filteredMemberships.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-6 py-3 font-medium">Cliente</th>
                      <th className="px-3 py-3 font-medium">Plan</th>
                      <th className="px-3 py-3 font-medium">Inicio</th>
                      <th className="px-3 py-3 font-medium">Vencimiento</th>
                      <th className="px-3 py-3 font-medium">Precio</th>
                      <th className="px-3 py-3 font-medium">Estado</th>
                      <th className="px-6 py-3 text-right font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMemberships.map((membership) => (
                      <tr
                        key={membership.id}
                        className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40"
                      >
                        <td className="px-6 py-3 font-medium text-foreground">{membership.clientName}</td>
                        <td className="px-3 py-3 text-muted-foreground">{membership.planName}</td>
                        <td className="px-3 py-3 text-muted-foreground">{formatDate(membership.startDate)}</td>
                        <td className="px-3 py-3 text-muted-foreground">{formatDate(membership.endDate)}</td>
                        <td className="px-3 py-3 text-muted-foreground">{formatCurrency(membership.price)}</td>
                        <td className="px-3 py-3">
                          <MembershipStatusBadge status={membership.status} />
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              title="Ver"
                              onClick={() => setDetailTarget(membership)}
                              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Editar"
                              onClick={() => setEditTarget(membership)}
                              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Renovar"
                              onClick={() => openRenew(membership)}
                              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <RefreshCw className="h-4 w-4" />
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
        </>
      )}

      {!error && tab === "plans" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {loading && (
            <p className="text-sm text-muted-foreground">Cargando planes...</p>
          )}
          {!loading && plans.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aún no tienes planes de membresía. Crea el primero con "Nuevo plan".
            </p>
          )}
          {!loading &&
            plans.map((plan) => (
              <Card key={plan.id} className="flex flex-col justify-between">
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground">{plan.durationDays} días</p>
                    </div>
                    <Badge tone={plan.active ? "success" : "neutral"}>
                      {plan.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>

                  <p className="text-2xl font-semibold tracking-tight text-foreground">
                    {formatCurrency(plan.price)}
                  </p>

                  {plan.description && (
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  )}

                  <p className="text-sm text-muted-foreground">
                    {plan.clientCount} {plan.clientCount === 1 ? "cliente" : "clientes"} actualmente
                  </p>

                  <div className="mt-2 flex justify-end gap-1 border-t border-border pt-3">
                    <Button variant="secondary" size="sm" onClick={() => openEditPlan(plan)}>
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPlanStatusTarget(plan)}
                      title={plan.active ? "Desactivar" : "Activar"}
                    >
                      {plan.active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      <MembershipFormModal
        open={formOpen}
        gymId={gymId}
        clients={clients}
        plans={activePlans}
        renewFrom={renewFrom}
        onClose={() => setFormOpen(false)}
        onSaved={loadData}
      />

      <MembershipEditModal
        open={editTarget !== null}
        gymId={gymId}
        membership={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={loadData}
      />

      <MembershipDetailModal
        open={detailTarget !== null}
        membership={detailTarget}
        onClose={() => setDetailTarget(null)}
      />

      <PlanFormModal
        open={planFormOpen}
        gymId={gymId}
        plan={editingPlan}
        onClose={() => setPlanFormOpen(false)}
        onSaved={loadData}
      />

      <ConfirmDialog
        open={planStatusTarget !== null}
        title={planStatusTarget?.active ? "Desactivar plan" : "Activar plan"}
        description={
          planStatusTarget?.active
            ? `${planStatusTarget?.name} dejará de estar disponible para nuevas membresías. Los clientes que ya lo tienen no se ven afectados.`
            : `${planStatusTarget?.name} volverá a estar disponible para nuevas membresías.`
        }
        confirmLabel={planStatusTarget?.active ? "Desactivar" : "Activar"}
        danger={planStatusTarget?.active}
        onConfirm={confirmTogglePlanActive}
        onCancel={() => setPlanStatusTarget(null)}
      />
    </div>
  );
}
