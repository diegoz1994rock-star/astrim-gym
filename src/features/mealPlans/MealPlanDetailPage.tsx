import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Eye, Pencil, Save, Trash2, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import * as clientService from "@/lib/services/clientService";
import * as mealPlanService from "@/lib/services/mealPlanService";
import { formatDate } from "@/lib/format";
import {
  CATEGORY_TARGET_UNIT_LABELS,
  type CategoryTargetListItem,
  type MealPlanAssignmentListItem,
  type MealPlanListItem,
} from "@/types/mealPlan";
import type { ClientListItem } from "@/types/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MealPlanGoalBadge, MealPlanStatusBadge } from "@/components/StatusBadges";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MealPlanFormModal } from "./MealPlanFormModal";
import { MealPlanTargetsModal } from "./MealPlanTargetsModal";
import { AssignMealPlanModal } from "./AssignMealPlanModal";

function formatStat(value: number | null, unit: string): string {
  if (value === null) return "Sin definir";
  return `${Number.isInteger(value) ? value : value.toFixed(1)} ${unit}`;
}

function StatTile({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${value === null ? "text-muted-foreground" : "text-foreground"}`}>
        {formatStat(value, unit)}
      </p>
    </div>
  );
}

export function MealPlanDetailPage() {
  const { mealPlanId } = useParams<{ mealPlanId: string }>();
  const { user } = useAuth();
  const gymId = user?.gymId ?? null;
  const navigate = useNavigate();

  const [mealPlan, setMealPlan] = useState<MealPlanListItem | null>(null);
  const [categoryTargets, setCategoryTargets] = useState<CategoryTargetListItem[]>([]);
  const [assignments, setAssignments] = useState<MealPlanAssignmentListItem[]>([]);
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [targetsOpen, setTargetsOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [unassignTarget, setUnassignTarget] = useState<MealPlanAssignmentListItem | null>(null);

  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const loadData = useCallback(async () => {
    if (!gymId || !mealPlanId) return;
    setLoading(true);
    setError(null);
    try {
      const mealPlanData = await mealPlanService.getMealPlanById(gymId, mealPlanId);
      if (!mealPlanData) {
        setError("El plan de alimentación no existe o fue eliminado.");
        setMealPlan(null);
        return;
      }
      const [clientsData, categoryTargetsData, assignmentsData] = await Promise.all([
        clientService.getClients(gymId),
        mealPlanService.getCategoryTargets(gymId, mealPlanId),
        mealPlanService.getMealPlanAssignments(gymId, mealPlanId),
      ]);
      setMealPlan(mealPlanData);
      setClients(clientsData);
      setCategoryTargets(categoryTargetsData);
      setAssignments(assignmentsData);
      setNotesDraft(mealPlanData.notes ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el plan de alimentación.");
    } finally {
      setLoading(false);
    }
  }, [gymId, mealPlanId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const notesDirty = mealPlan !== null && notesDraft !== (mealPlan.notes ?? "");
  const verduraTarget = categoryTargets.find((t) => t.category === "VERDURA") ?? null;
  const frutaTarget = categoryTargets.find((t) => t.category === "FRUTA") ?? null;

  async function saveNotes() {
    if (!gymId || !mealPlanId || savingNotes) return;
    setSavingNotes(true);
    try {
      await mealPlanService.updateMealPlanNotes(gymId, mealPlanId, notesDraft);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar las reglas y recomendaciones.");
    } finally {
      setSavingNotes(false);
    }
  }

  async function confirmUnassign() {
    if (!gymId || !mealPlanId || !unassignTarget) return;
    await mealPlanService.removeMealPlanAssignment(gymId, mealPlanId, unassignTarget.id);
    setUnassignTarget(null);
    await loadData();
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Cargando plan de alimentación...</div>;
  }

  if (error || !mealPlan) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-danger">{error ?? "Plan de alimentación no encontrado."}</p>
        <Button variant="secondary" onClick={() => navigate("/alimentacion")}>
          <ArrowLeft className="h-4 w-4" />
          Volver a Plan de Alimentación
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={() => navigate("/alimentacion")}
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Plan de Alimentación
      </button>

      <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{mealPlan.name}</h2>
            <MealPlanStatusBadge status={mealPlan.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {assignments.length === 0
              ? "Sin clientes asignados"
              : `Asignado a ${assignments.length} cliente${assignments.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      {/* ---- Objetivo ---- */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Objetivo</CardTitle>
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <MealPlanGoalBadge goal={mealPlan.goal} />
          <p className="text-sm text-muted-foreground">{mealPlan.description || "Sin descripción."}</p>
        </CardContent>
      </Card>

      {/* ---- Metas ---- */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Metas diarias</CardTitle>
          <Button variant="secondary" size="sm" onClick={() => setTargetsOpen(true)}>
            <Pencil className="h-4 w-4" />
            Editar metas
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatTile label="Calorías" value={mealPlan.dailyCaloriesTarget} unit="kcal" />
            <StatTile label="Proteína" value={mealPlan.dailyProteinTarget} unit="g" />
            <StatTile label="Carbohidratos" value={mealPlan.dailyCarbsTarget} unit="g" />
            <StatTile label="Grasa" value={mealPlan.dailyFatTarget} unit="g" />
            <StatTile
              label="Verdura"
              value={verduraTarget?.targetQuantity ?? null}
              unit={verduraTarget ? CATEGORY_TARGET_UNIT_LABELS[verduraTarget.targetUnit] : "g"}
            />
            <StatTile
              label="Fruta"
              value={frutaTarget?.targetQuantity ?? null}
              unit={frutaTarget ? CATEGORY_TARGET_UNIT_LABELS[frutaTarget.targetUnit] : "porciones"}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Calorías es la suma de todo lo demás (proteína, carbohidratos y grasa) — no se edita directo.
          </p>
        </CardContent>
      </Card>

      {/* ---- Reglas y recomendaciones ---- */}
      <Card>
        <CardHeader>
          <CardTitle>Reglas y recomendaciones</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Textarea
            rows={4}
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Ej: evitar frituras, tomar al menos 2 litros de agua al día, no saltarse el desayuno..."
          />
          <div className="flex justify-end">
            <Button size="sm" disabled={!notesDirty || savingNotes} onClick={saveNotes}>
              <Save className="h-4 w-4" />
              {savingNotes ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ---- Clientes asignados ---- */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Clientes asignados ({assignments.length})</CardTitle>
          <Button size="sm" onClick={() => setAssignOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Asignar clientes
          </Button>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              Este plan todavía no está asignado a ningún cliente.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Cliente</th>
                    <th className="py-2 pr-3 font-medium">Documento</th>
                    <th className="py-2 pr-3 font-medium">Inicio</th>
                    <th className="py-2 pr-3 font-medium">Final</th>
                    <th className="py-2 pr-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment) => (
                    <tr key={assignment.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2.5 pr-3 font-medium text-foreground">{assignment.clientName}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{assignment.clientDocument ?? "—"}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{formatDate(assignment.startDate)}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{formatDate(assignment.endDate)}</td>
                      <td className="py-2.5 pr-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title="Ver perfil"
                            onClick={() => navigate(`/clientes/${assignment.clientId}`)}
                            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Quitar asignación"
                            onClick={() => setUnassignTarget(assignment)}
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

      <MealPlanFormModal
        open={editOpen}
        gymId={gymId ?? ""}
        mealPlan={mealPlan}
        onClose={() => setEditOpen(false)}
        onSaved={loadData}
      />

      <MealPlanTargetsModal
        open={targetsOpen}
        gymId={gymId ?? ""}
        mealPlan={mealPlan}
        categoryTargets={categoryTargets}
        onClose={() => setTargetsOpen(false)}
        onSaved={loadData}
      />

      <AssignMealPlanModal
        open={assignOpen}
        gymId={gymId ?? ""}
        mealPlan={mealPlan}
        clients={clients}
        onClose={() => setAssignOpen(false)}
        onSaved={loadData}
      />

      <ConfirmDialog
        open={unassignTarget !== null}
        title="Quitar asignación"
        description={`${unassignTarget?.clientName} dejará de tener este plan asignado.`}
        confirmLabel="Quitar"
        danger
        onConfirm={confirmUnassign}
        onCancel={() => setUnassignTarget(null)}
      />
    </div>
  );
}
