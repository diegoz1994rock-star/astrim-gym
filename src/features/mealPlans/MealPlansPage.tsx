import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Apple, Eye, Images, Pencil, Plus, Search, Trash2, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import * as clientService from "@/lib/services/clientService";
import * as mealPlanService from "@/lib/services/mealPlanService";
import { filterMealPlans } from "@/lib/domain/mealPlanFilters";
import {
  DEFAULT_MEAL_PLAN_FILTERS,
  MEAL_PLAN_STATUS_LABELS,
  type MealPlanFilters,
  type MealPlanListItem,
} from "@/types/mealPlan";
import type { ClientListItem } from "@/types/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { MealPlanGoalBadge, MealPlanStatusBadge } from "@/components/StatusBadges";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MealPlanFormModal } from "./MealPlanFormModal";
import { AssignMealPlanModal } from "./AssignMealPlanModal";

export function MealPlansPage() {
  const { user } = useAuth();
  const gymId = user?.gymId ?? null;
  const navigate = useNavigate();

  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MealPlanFilters>(DEFAULT_MEAL_PLAN_FILTERS);
  const [formOpen, setFormOpen] = useState(false);
  const [editingMealPlan, setEditingMealPlan] = useState<MealPlanListItem | null>(null);
  const [assignTarget, setAssignTarget] = useState<MealPlanListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MealPlanListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    if (!gymId) return;
    setLoading(true);
    setError(null);
    try {
      const [clientsData, mealPlansData] = await Promise.all([
        clientService.getClients(gymId),
        mealPlanService.getMealPlans(gymId),
      ]);
      setClients(clientsData);
      setMealPlans(mealPlansData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la información de planes de alimentación.");
    } finally {
      setLoading(false);
    }
  }, [gymId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredMealPlans = useMemo(() => filterMealPlans(mealPlans, filters), [mealPlans, filters]);

  function openCreateForm() {
    setEditingMealPlan(null);
    setFormOpen(true);
  }

  function openEditForm(mealPlan: MealPlanListItem) {
    setEditingMealPlan(mealPlan);
    setFormOpen(true);
  }

  async function confirmDeleteMealPlan() {
    if (!gymId || !deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await mealPlanService.deleteMealPlan(gymId, deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el plan de alimentación.");
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
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Plan de Alimentación</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea plantillas de alimentación y asígnalas a los clientes que quieras.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate("/alimentacion/alimentos")}>
            <Images className="h-4 w-4" />
            Alimentos
          </Button>
          <Button onClick={openCreateForm}>
            <Plus className="h-4 w-4" />
            Nuevo plan
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Buscar por nombre del plan..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </div>

          <div className="lg:w-56 lg:shrink-0">
            <Select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value as MealPlanFilters["status"] }))
              }
            >
              <option value="ALL">Todos los estados</option>
              {Object.entries(MEAL_PLAN_STATUS_LABELS).map(([value, label]) => (
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
            Cargando planes de alimentación...
          </div>
        )}

        {!error && !loading && filteredMealPlans.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <Apple className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              {mealPlans.length === 0
                ? "Aún no hay planes de alimentación registrados."
                : "No se encontraron planes con estos filtros."}
            </p>
            {mealPlans.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Crea el primero con el botón "Nuevo plan".
              </p>
            )}
          </div>
        )}

        {!error && !loading && filteredMealPlans.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Plan</th>
                  <th className="px-3 py-3 font-medium">Objetivo</th>
                  <th className="px-3 py-3 font-medium">Clientes asignados</th>
                  <th className="px-3 py-3 font-medium">Estado</th>
                  <th className="px-6 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredMealPlans.map((mealPlan) => (
                  <tr
                    key={mealPlan.id}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-6 py-3 font-medium text-foreground">{mealPlan.name}</td>
                    <td className="px-3 py-3">
                      <MealPlanGoalBadge goal={mealPlan.goal} />
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {mealPlan.assignmentCount === 0 ? (
                        <span className="italic">Sin asignar</span>
                      ) : (
                        `${mealPlan.assignmentCount} cliente${mealPlan.assignmentCount === 1 ? "" : "s"}`
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <MealPlanStatusBadge status={mealPlan.status} />
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title="Ver detalle"
                          onClick={() => navigate(`/alimentacion/${mealPlan.id}`)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Asignar clientes"
                          onClick={() => setAssignTarget(mealPlan)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <UserPlus className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Editar plan"
                          onClick={() => openEditForm(mealPlan)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Eliminar"
                          onClick={() => setDeleteTarget(mealPlan)}
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

      <MealPlanFormModal
        open={formOpen}
        gymId={gymId}
        mealPlan={editingMealPlan}
        onClose={() => setFormOpen(false)}
        onSaved={(mealPlanId) => {
          loadData();
          if (!editingMealPlan) navigate(`/alimentacion/${mealPlanId}`);
        }}
      />

      <AssignMealPlanModal
        open={assignTarget !== null}
        gymId={gymId}
        mealPlan={assignTarget}
        clients={clients}
        onClose={() => setAssignTarget(null)}
        onSaved={loadData}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar plan de alimentación"
        description={`¿Deseas eliminar el plan "${deleteTarget?.name}"? Se borrará junto con sus metas por categoría y alimentos permitidos, y dejará de estar asignado a ${deleteTarget?.assignmentCount ?? 0} cliente(s). No se puede deshacer.`}
        confirmLabel={deleting ? "Eliminando…" : "Eliminar"}
        danger
        onConfirm={confirmDeleteMealPlan}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
