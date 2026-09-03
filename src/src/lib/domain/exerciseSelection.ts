import type { ExerciseListItem } from "@/types/exercise";

/**
 * Resultado de intentar editar el ejercicio actualmente seleccionado en la
 * tabla. La fuente de verdad es siempre la lista ya cargada por la página
 * (la misma que devuelve exerciseService.getExercises), nunca una segunda
 * consulta/búsqueda independiente — así "not-found" cubre tanto un id
 * obsoleto como (estructuralmente) un ejercicio de otro gimnasio, ya que
 * esa lista siempre viene filtrada por gym_id.
 *
 * Decisión explícita del administrador (2026-08-29): los ejercicios
 * globales ya no bloquean la edición aquí — cualquier ejercicio presente
 * en la lista (global o propio) se puede editar. La única fuente de
 * verdad sobre qué gym_id puede escribir sobre qué fila sigue siendo el
 * repositorio (ver exerciseRepository.updateExercise).
 */
export type EditAttemptResult =
  | { kind: "no-selection" }
  | { kind: "not-found" }
  | { kind: "ok"; exercise: ExerciseListItem };

export function resolveEditAttempt(
  exercises: ExerciseListItem[],
  selectedId: string | null,
): EditAttemptResult {
  if (!selectedId) return { kind: "no-selection" };

  const exercise = exercises.find((e) => e.id === selectedId) ?? null;
  if (!exercise) return { kind: "not-found" };

  return { kind: "ok", exercise };
}
