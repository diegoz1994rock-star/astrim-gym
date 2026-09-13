/**
 * Aviso interno "cambió la asistencia". Lo emite accessService cada vez que
 * se registra una entrada o salida (kiosco local, reconocimiento facial y,
 * sobre todo, la app de asistencia por LAN). Las pantallas que muestran
 * asistencia lo escuchan para recargarse solas, sin que el recepcionista
 * tenga que salir y volver a entrar a la sección.
 */
const ATTENDANCE_CHANGED = "astrim:attendance-changed";

export function emitAttendanceChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ATTENDANCE_CHANGED));
}

export function onAttendanceChanged(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(ATTENDANCE_CHANGED, handler);
  return () => window.removeEventListener(ATTENDANCE_CHANGED, handler);
}
