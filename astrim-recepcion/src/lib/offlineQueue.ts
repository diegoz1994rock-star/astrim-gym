const STORAGE_KEY = "astrim_reception_pending_codes";

interface PendingAttempt {
  id: string;
  code: string;
  attemptedAt: string;
}

function readQueue(): PendingAttempt[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as PendingAttempt[];
  } catch {
    return [];
  }
}

function writeQueue(queue: PendingAttempt[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

/**
 * Cola local mínima para cuando el servidor LAN no responde (sin conexión
 * al computador principal). No decide entrada/salida por su cuenta: solo
 * reintenta el mismo /access en cuanto vuelve la conexión. El propio
 * accessService del lado del computador ya evita duplicados (una entrada
 * abierta no se vuelve a abrir dos veces), así que reintentar es seguro.
 */
export function enqueuePendingCode(code: string): void {
  const queue = readQueue();
  queue.push({ id: crypto.randomUUID(), code, attemptedAt: new Date().toISOString() });
  writeQueue(queue);
}

export function getPendingCount(): number {
  return readQueue().length;
}

export function peekOldestPending(): PendingAttempt | null {
  const queue = readQueue();
  return queue[0] ?? null;
}

export function removePending(id: string): void {
  writeQueue(readQueue().filter((item) => item.id !== id));
}
