import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import * as classService from "@/lib/services/classService";
import * as clientService from "@/lib/services/clientService";
import * as trainerService from "@/lib/services/trainerService";
import * as exerciseService from "@/lib/services/exerciseService";
import { sortClassesByStartTime } from "@/lib/domain/classFilters";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MonthCalendar } from "./MonthCalendar";
import { ClassCard } from "./ClassCard";
import { ClassFormModal } from "./ClassFormModal";
import type { ClassDetail, ClassListItem, ClassTypeOption } from "@/types/class";
import type { ClientListItem } from "@/types/client";
import type { ExerciseOptionRow, TrainerOptionRow } from "@/types/db";

const WEEKDAY_LONG_LABELS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTH_LONG_LABELS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatLongDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return `${WEEKDAY_LONG_LABELS[date.getDay()]} ${date.getDate()} de ${MONTH_LONG_LABELS[date.getMonth()]} de ${date.getFullYear()}`;
}

export function ClassesPage() {
  const { user } = useAuth();
  const gymId = user?.gymId ?? null;

  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => toIso(new Date()));
  const [classes, setClasses] = useState<ClassListItem[]>([]);
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [trainers, setTrainers] = useState<TrainerOptionRow[]>([]);
  const [classTypes, setClassTypes] = useState<ClassTypeOption[]>([]);
  const [exercises, setExercises] = useState<ExerciseOptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassDetail | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClassListItem | null>(null);

  const monthRange = useMemo(() => {
    const from = toIso(new Date(month.getFullYear(), month.getMonth(), 1));
    const to = toIso(new Date(month.getFullYear(), month.getMonth() + 1, 0));
    return { from, to };
  }, [month]);

  const loadClasses = useCallback(async () => {
    if (!gymId) return;
    setLoading(true);
    try {
      setClasses(await classService.getClassesByDateRange(gymId, monthRange.from, monthRange.to));
    } finally {
      setLoading(false);
    }
  }, [gymId, monthRange]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

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

  const countsByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of classes) {
      map.set(item.date, (map.get(item.date) ?? 0) + 1);
    }
    return map;
  }, [classes]);

  const dayClasses = useMemo(
    () => sortClassesByStartTime(classes.filter((c) => c.date === selectedDate)),
    [classes, selectedDate],
  );

  function openCreate() {
    setEditingClass(null);
    setFormOpen(true);
  }

  async function openEdit(classId: string) {
    if (!gymId) return;
    const detail = await classService.getClassDetail(gymId, classId);
    if (detail) {
      setEditingClass(detail);
      setFormOpen(true);
    }
  }

  async function confirmDelete() {
    if (!gymId || !deleteTarget) return;
    await classService.cancelClass(gymId, deleteTarget.id);
    setDeleteTarget(null);
    await loadClasses();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Clases y Sesiones</h2>
          <p className="text-sm text-muted-foreground">Programa y administra las clases grupales del gimnasio.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Agregar clase
        </Button>
      </div>

      <MonthCalendar
        month={month}
        selectedDate={selectedDate}
        countsByDate={countsByDate}
        onSelectDate={setSelectedDate}
        onChangeMonth={(delta) => setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))}
      />

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground">
          {formatLongDate(selectedDate)}
        </h3>

        {loading && <p className="text-sm text-muted-foreground">Cargando clases...</p>}

        {!loading && dayClasses.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay clases programadas este día.</p>
        )}

        <div className="flex flex-col gap-3">
          {dayClasses.map((item) => (
            <ClassCard
              key={item.id}
              classItem={item}
              onEdit={() => openEdit(item.id)}
              onDelete={() => setDeleteTarget(item)}
            />
          ))}
        </div>
      </div>

      {gymId && (
        <ClassFormModal
          open={formOpen}
          gymId={gymId}
          classItem={editingClass}
          initialDate={selectedDate}
          clients={clients}
          trainers={trainers}
          classTypes={classTypes}
          exercises={exercises}
          onClose={() => setFormOpen(false)}
          onSaved={loadClasses}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="¿Cancelar esta clase?"
        description={
          deleteTarget && deleteTarget.enrolledCount > 0
            ? `Hay ${deleteTarget.enrolledCount} clientes inscritos. La clase quedará marcada como CANCELADA (no se borra el historial).`
            : "La clase quedará marcada como CANCELADA."
        }
        confirmLabel="Eliminar clase"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
