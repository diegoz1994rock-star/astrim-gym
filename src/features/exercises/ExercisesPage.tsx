import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Dumbbell, Eye, Pencil, Plus, Power, PowerOff, Search } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import * as exerciseService from "@/lib/services/exerciseService";
import { filterExercises } from "@/lib/domain/exerciseFilters";
import { resolveEditAttempt } from "@/lib/domain/exerciseSelection";
import { cn } from "@/lib/utils";
import {
  DEFAULT_EXERCISE_FILTERS,
  EQUIPMENT_OPTIONS,
  EXERCISE_CATEGORY_OPTIONS,
  EXERCISE_TYPE_LABELS,
  MUSCLE_GROUP_LABELS,
  type ExerciseFilters,
  type ExerciseListItem,
} from "@/types/exercise";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActiveStatusBadge } from "@/components/StatusBadges";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExerciseFormModal } from "./ExerciseFormModal";
import { ExerciseDetailModal } from "./ExerciseDetailModal";

const NO_CATEGORY_LABEL = "Sin categoría";

interface ExerciseTableProps {
  exercises: ExerciseListItem[];
  showCategory?: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onView: (exercise: ExerciseListItem) => void;
  onEdit: (exercise: ExerciseListItem) => void;
  onToggleStatus: (exercise: ExerciseListItem) => void;
}

function ExerciseTable({
  exercises,
  showCategory,
  selectedId,
  onSelect,
  onView,
  onEdit,
  onToggleStatus,
}: ExerciseTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="w-10 px-4 py-3 font-medium">
              <span className="sr-only">Seleccionar</span>
            </th>
            <th className="px-3 py-3 font-medium">Nombre</th>
            {showCategory && <th className="px-3 py-3 font-medium">Categoría</th>}
            <th className="px-3 py-3 font-medium">Grupo muscular</th>
            <th className="px-3 py-3 font-medium">Tipo</th>
            <th className="px-3 py-3 font-medium">Equipamiento</th>
            <th className="px-3 py-3 font-medium">Estado</th>
            <th className="px-6 py-3 text-right font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {exercises.map((exercise) => {
            const isSelected = exercise.id === selectedId;
            return (
              <tr
                key={exercise.id}
                onClick={() => onSelect(exercise.id)}
                aria-selected={isSelected}
                className={cn(
                  "cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40",
                  isSelected && "bg-primary/5 hover:bg-primary/10",
                )}
              >
                <td className="px-4 py-3">
                  <input
                    type="radio"
                    name="selected-exercise"
                    checked={isSelected}
                    onChange={() => onSelect(exercise.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 accent-primary"
                    aria-label={`Seleccionar ${exercise.name}`}
                  />
                </td>
                <td className="px-3 py-3">
                  <p className="font-medium text-foreground">{exercise.name}</p>
                  {exercise.isGlobal && (
                    <Badge tone="primary" className="mt-1">
                      Global
                    </Badge>
                  )}
                </td>
                {showCategory && (
                  <td className="px-3 py-3 text-muted-foreground">{exercise.category ?? NO_CATEGORY_LABEL}</td>
                )}
                <td className="px-3 py-3 text-muted-foreground">
                  {exercise.muscleGroup ? MUSCLE_GROUP_LABELS[exercise.muscleGroup] : "—"}
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {exercise.exerciseType ? EXERCISE_TYPE_LABELS[exercise.exerciseType] : "—"}
                </td>
                <td className="px-3 py-3 text-muted-foreground">{exercise.equipment ?? "—"}</td>
                <td className="px-3 py-3">
                  <ActiveStatusBadge status={exercise.status} />
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      title="Ver"
                      onClick={(e) => {
                        e.stopPropagation();
                        onView(exercise);
                      }}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Editar"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(exercise);
                      }}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {!exercise.isGlobal && (
                      <button
                        type="button"
                        title={exercise.status === "ACTIVE" ? "Desactivar" : "Activar"}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStatus(exercise);
                        }}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        {exercise.status === "ACTIVE" ? (
                          <PowerOff className="h-4 w-4" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ExercisesPage() {
  const { user } = useAuth();
  const gymId = user?.gymId ?? null;

  const [exercises, setExercises] = useState<ExerciseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ExerciseFilters>(DEFAULT_EXERCISE_FILTERS);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const [formOpen, setFormOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<ExerciseListItem | null>(null);
  const [detailTarget, setDetailTarget] = useState<ExerciseListItem | null>(null);
  const [statusTarget, setStatusTarget] = useState<ExerciseListItem | null>(null);

  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!gymId) return;
    setLoading(true);
    setError(null);
    try {
      setExercises(await exerciseService.getExercises(gymId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la biblioteca de ejercicios.");
    } finally {
      setLoading(false);
    }
  }, [gymId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Vista por defecto: acordeón colapsado por categoría. En cuanto hay texto
  // de búsqueda o cualquier filtro activo, se cambia a una tabla plana con
  // los resultados filtrados (así la búsqueda global funciona sin necesidad
  // de abrir antes una categoría).
  const isBrowsingDefault = useMemo(
    () =>
      filters.search.trim() === "" &&
      filters.category === "ALL" &&
      filters.muscleGroup === "ALL" &&
      filters.exerciseType === "ALL" &&
      filters.equipment === "ALL" &&
      filters.status === "ALL",
    [filters],
  );

  const filteredExercises = useMemo(() => filterExercises(exercises, filters), [exercises, filters]);

  const groupedByCategory = useMemo(() => {
    const map = new Map<string, ExerciseListItem[]>();
    for (const exercise of exercises) {
      const key = exercise.category ?? NO_CATEGORY_LABEL;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(exercise);
    }

    const ordered: [string, ExerciseListItem[]][] = [];
    for (const category of EXERCISE_CATEGORY_OPTIONS) {
      const items = map.get(category);
      if (items) {
        ordered.push([category, items]);
        map.delete(category);
      }
    }
    const leftovers = Array.from(map.keys())
      .filter((key) => key !== NO_CATEGORY_LABEL)
      .sort((a, b) => a.localeCompare(b, "es"));
    for (const key of leftovers) ordered.push([key, map.get(key)!]);
    if (map.has(NO_CATEGORY_LABEL)) ordered.push([NO_CATEGORY_LABEL, map.get(NO_CATEGORY_LABEL)!]);

    return ordered;
  }, [exercises]);

  function toggleCategory(category: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  function handleSelectRow(id: string) {
    setSelectedExerciseId(id);
    setSelectionMessage(null);
  }

  function openCreateForm() {
    setEditingExercise(null);
    setFormOpen(true);
  }

  function openEditForm(exercise: ExerciseListItem) {
    setEditingExercise(exercise);
    setFormOpen(true);
  }

  function handleEditButtonClick() {
    const result = resolveEditAttempt(exercises, selectedExerciseId);
    switch (result.kind) {
      case "no-selection":
        setSelectionMessage("Selecciona un ejercicio para editarlo.");
        return;
      case "not-found":
        setSelectedExerciseId(null);
        setSelectionMessage("El ejercicio seleccionado ya no está disponible.");
        return;
      case "ok":
        setSelectionMessage(null);
        openEditForm(result.exercise);
    }
  }

  async function confirmToggleStatus() {
    if (!gymId || !statusTarget) return;
    const nextStatus = statusTarget.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await exerciseService.setExerciseStatus(gymId, statusTarget.id, nextStatus);
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
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Ejercicios</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Administra la biblioteca de ejercicios de tu gimnasio para usarla en las rutinas.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Button onClick={openCreateForm}>
              <Plus className="h-4 w-4" />
              Nuevo ejercicio
            </Button>
            <Button variant="secondary" onClick={handleEditButtonClick}>
              <Pencil className="h-4 w-4" />
              Editar ejercicio
            </Button>
          </div>
          {selectionMessage && <p className="text-xs text-muted-foreground">{selectionMessage}</p>}
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Buscar ejercicio en todas las categorías..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Select
              value={filters.category}
              onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
            >
              <option value="ALL">Todas las categorías</option>
              {EXERCISE_CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>

            <Select
              value={filters.muscleGroup}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, muscleGroup: e.target.value as ExerciseFilters["muscleGroup"] }))
              }
            >
              <option value="ALL">Todos los grupos</option>
              {Object.entries(MUSCLE_GROUP_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>

            <Select
              value={filters.exerciseType}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, exerciseType: e.target.value as ExerciseFilters["exerciseType"] }))
              }
            >
              <option value="ALL">Todos los tipos</option>
              {Object.entries(EXERCISE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>

            <Select
              value={filters.equipment}
              onChange={(e) => setFilters((prev) => ({ ...prev, equipment: e.target.value }))}
            >
              <option value="ALL">Todo equipamiento</option>
              {EQUIPMENT_OPTIONS.map((equipment) => (
                <option key={equipment} value={equipment}>
                  {equipment}
                </option>
              ))}
            </Select>

            <Select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value as ExerciseFilters["status"] }))
              }
            >
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVE">Activos</option>
              <option value="INACTIVE">Inactivos</option>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {error && <div className="px-6 py-4 text-sm text-danger">{error}</div>}

        {!error && loading && (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            Cargando ejercicios...
          </div>
        )}

        {!error && !loading && exercises.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <Dumbbell className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Aún no tienes ejercicios propios registrados.</p>
            <p className="text-sm text-muted-foreground">Crea el primero con el botón "Nuevo ejercicio".</p>
          </div>
        )}

        {!error && !loading && exercises.length > 0 && isBrowsingDefault && (
          <div className="divide-y divide-border">
            {groupedByCategory.map(([category, items]) => {
              const isOpen = expandedCategories.has(category);
              return (
                <div key={category}>
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-muted/40"
                  >
                    <span className="text-sm font-semibold uppercase tracking-wide text-foreground">
                      {category}
                    </span>
                    <span className="flex items-center gap-3 text-xs text-muted-foreground">
                      {items.length} {items.length === 1 ? "ejercicio" : "ejercicios"}
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-border/60">
                      <ExerciseTable
                        exercises={items}
                        selectedId={selectedExerciseId}
                        onSelect={handleSelectRow}
                        onView={setDetailTarget}
                        onEdit={openEditForm}
                        onToggleStatus={setStatusTarget}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!error && !loading && exercises.length > 0 && !isBrowsingDefault && filteredExercises.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <Dumbbell className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No se encontraron ejercicios con estos filtros.</p>
          </div>
        )}

        {!error && !loading && !isBrowsingDefault && filteredExercises.length > 0 && (
          <ExerciseTable
            exercises={filteredExercises}
            showCategory
            selectedId={selectedExerciseId}
            onSelect={handleSelectRow}
            onView={setDetailTarget}
            onEdit={openEditForm}
            onToggleStatus={setStatusTarget}
          />
        )}
      </Card>

      <ExerciseFormModal
        open={formOpen}
        gymId={gymId}
        exercise={editingExercise}
        onClose={() => setFormOpen(false)}
        onSaved={loadData}
      />

      <ExerciseDetailModal
        open={detailTarget !== null}
        exercise={detailTarget}
        onClose={() => setDetailTarget(null)}
      />

      <ConfirmDialog
        open={statusTarget !== null}
        title={statusTarget?.status === "ACTIVE" ? "Desactivar ejercicio" : "Activar ejercicio"}
        description={
          statusTarget?.status === "ACTIVE"
            ? `${statusTarget?.name} dejará de estar disponible para nuevas rutinas. Las rutinas que ya lo usan conservan su historial.`
            : `${statusTarget?.name} volverá a estar disponible para nuevas rutinas.`
        }
        confirmLabel={statusTarget?.status === "ACTIVE" ? "Desactivar" : "Activar"}
        danger={statusTarget?.status === "ACTIVE"}
        onConfirm={confirmToggleStatus}
        onCancel={() => setStatusTarget(null)}
      />
    </div>
  );
}
