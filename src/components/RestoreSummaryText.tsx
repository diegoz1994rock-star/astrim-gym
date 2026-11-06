import type { RestoreSummary } from "@/lib/cloud/cloudRestoreService";

/** "120 clientes · 340 pagos · …" con solo lo que efectivamente se restauró. */
export function restoreSummaryParts(s: RestoreSummary): string[] {
  const parts: [number, string, string][] = [
    [s.clients, "cliente", "clientes"],
    [s.trainers, "entrenador", "entrenadores"],
    [s.membershipPlans, "plan de membresía", "planes de membresía"],
    [s.memberships, "membresía", "membresías"],
    [s.payments, "pago", "pagos"],
    [s.attendance, "asistencia", "asistencias"],
    [s.measurements, "medida", "medidas"],
    [s.routines, "rutina", "rutinas"],
    [s.routineAssignments, "rutina asignada", "rutinas asignadas"],
    [s.classes, "clase", "clases"],
    [s.classEnrollments, "inscripción a clase", "inscripciones a clases"],
    [s.mealPlans, "plan de alimentación", "planes de alimentación"],
    [s.mealPlanAssignments, "plan de alimentación asignado", "planes de alimentación asignados"],
    [s.exercises, "ejercicio propio", "ejercicios propios"],
    [s.foods, "alimento propio", "alimentos propios"],
  ];
  return parts.filter(([n]) => n > 0).map(([n, one, many]) => `${n} ${n === 1 ? one : many}`);
}

export function RestoreSummaryText({ summary }: { summary: RestoreSummary }) {
  const parts = restoreSummaryParts(summary);
  return (
    <>
      <span>{parts.length > 0 ? parts.join(" · ") : "No había datos nuevos para traer."}</span>
      {summary.errors.length > 0 && (
        <span className="text-warning">Con avisos: {summary.errors.join(" · ")}</span>
      )}
    </>
  );
}
