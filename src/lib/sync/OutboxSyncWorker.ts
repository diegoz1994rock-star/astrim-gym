import { doc, deleteDoc, setDoc, type DocumentReference, type Firestore } from "firebase/firestore";
import { getCloudDb, isCloudConfigured } from "../cloud/firebase";
import { currentCloudUser } from "../cloud/cloudAuth";
import { cloudPath, mapRowToData, type CloudPath } from "../cloud/mappers";
import * as outboxRepository from "../repositories/outboxRepository";
import { getSnapshotRow } from "../repositories/cloudSnapshotRepository";
import { setMutationListener } from "../db/client";

/**
 * Drena la cola `outbox` (SQLite) hacia Firestore. El panel nunca escribe
 * directo a Firestore desde sus servicios: escribe en SQLite y los triggers
 * de la migración 0024 encolan aquí. Este worker es el único puente de
 * salida.
 *
 * - Si no hay internet, sesión cloud o config -> no-op (queda PENDING).
 * - Reintentos con backoff exponencial acotado (ver outboxRepository.markFailed).
 * - Sin realtime listeners: intervalo de 60 s + evento `online`.
 */

const BATCH_LIMIT = 300;
const CHUNK = 20;
/** Red de seguridad: aunque el "kick" tras cada escritura cubre el caso
 *  normal, se revisa igual cada tanto (reconexión, sesión que volvió, etc.). */
const INTERVAL_MS = 20_000;
/** Cada tanto, devuelve a la cola las filas que quedaron FAILED. */
const RETRY_FAILED_MS = 3 * 60_000;
/** Debounce del "kick": varias escrituras seguidas = un solo push. */
const KICK_DEBOUNCE_MS = 500;

let running = false;

/**
 * Backfill automático, una sola vez por instalación: sube a la nube TODO lo
 * que ya existía antes de que se instalaran los triggers (migración 0024),
 * incluida la biblioteca global de ejercicios. Después de esto, cada cambio
 * viaja solo por su trigger.
 */
const BACKFILL_FLAG = "astrim.autoBackfillDone.v1";
async function ensureBackfilled(): Promise<void> {
  try {
    if (localStorage.getItem(BACKFILL_FLAG) === "1") return;
    await outboxRepository.backfillAll();
    localStorage.setItem(BACKFILL_FLAG, "1");
  } catch {
    /* si falla, se reintenta en el próximo arranque */
  }
}

function refFor(db: Firestore, path: CloudPath): DocumentReference {
  const [first, ...rest] = path;
  return doc(db, first, ...rest);
}

export interface SyncResult {
  processed: number;
  synced: number;
  failed: number;
  skipped: boolean;
}

export async function syncNow(): Promise<SyncResult> {
  const empty: SyncResult = { processed: 0, synced: 0, failed: 0, skipped: true };
  if (!isCloudConfigured) return empty;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return empty;
  if (!currentCloudUser()) return empty;
  if (running) return empty;

  running = true;
  try {
    await ensureBackfilled();
    const db = getCloudDb();
    const items = await outboxRepository.listPending(BATCH_LIMIT);
    if (items.length === 0) return { processed: 0, synced: 0, failed: 0, skipped: false };

    const syncedIds: string[] = [];
    let failed = 0;

    for (let i = 0; i < items.length; i += CHUNK) {
      const chunk = items.slice(i, i + CHUNK);
      await Promise.all(
        chunk.map(async (item) => {
          try {
            if (item.op === "DELETE") {
              try {
                await deleteDoc(refFor(db, cloudPath(item.entity, item.entityId, item.payload)));
              } catch (err) {
                // Un DELETE de un doc que nunca llegó a crearse en Firestore
                // (el outbox fusionó UPSERT+DELETE antes de sincronizar) puede
                // dar permission-denied porque las reglas no pueden leer
                // `resource.data.gymId` de un doc inexistente. El objetivo —
                // que el doc no exista — ya está cumplido: se da por hecho en
                // vez de dejar la fila FAILED para siempre.
                const code = (err as { code?: string })?.code;
                if (code !== "permission-denied" && code !== "not-found") throw err;
                console.warn(
                  `[OutboxSync] DELETE ${item.entity}/${item.entityId} devolvió ${code}; se asume que el doc ya no existe.`,
                );
              }
              syncedIds.push(item.id);
              return;
            }
            const row = await getSnapshotRow(item.entity, item.entityId);
            if (!row) {
              // La fila se borró antes de que sincronizáramos: borra el doc.
              await deleteDoc(refFor(db, cloudPath(item.entity, item.entityId, item.payload)));
              syncedIds.push(item.id);
              return;
            }
            const data = mapRowToData(item.entity, row);
            const ref = refFor(db, cloudPath(item.entity, item.entityId, item.payload));
            const payload = { ...data, _syncedAt: new Date().toISOString() };
            if (item.entity === "gyms") {
              // El doc raíz del gimnasio lo comparten el panel (marca,
              // contacto) y la consola de operador (licencia). Merge para
              // que ninguno pise los campos del otro.
              await setDoc(ref, payload, { merge: true });
            } else {
              await setDoc(ref, payload);
            }
            syncedIds.push(item.id);
          } catch (err) {
            failed += 1;
            await outboxRepository.markFailed(
              item.id,
              err instanceof Error ? err.message : String(err),
            );
          }
        }),
      );
    }

    await outboxRepository.markSynced(syncedIds);
    return { processed: items.length, synced: syncedIds.length, failed, skipped: false };
  } finally {
    running = false;
  }
}

let timer: ReturnType<typeof setInterval> | null = null;
let retryTimer: ReturnType<typeof setInterval> | null = null;
let kickTimer: ReturnType<typeof setTimeout> | null = null;
let onlineHandler: (() => void) | null = null;

/** Sincroniza YA (con debounce). Lo llama el hook de escrituras de la base:
 *  cualquier alta/cambio/baja en el panel dispara el push a la nube al toque. */
function kick(): void {
  if (kickTimer) clearTimeout(kickTimer);
  kickTimer = setTimeout(() => {
    kickTimer = null;
    void syncNow();
  }, KICK_DEBOUNCE_MS);
}

/** Arranca la sincronización automática. Devuelve una función para detenerla. */
export function startOutboxSync(): () => void {
  if (timer) return stopOutboxSync;

  setMutationListener(kick);

  void syncNow();
  timer = setInterval(() => void syncNow(), INTERVAL_MS);

  retryTimer = setInterval(() => {
    void outboxRepository.retryFailed().then(() => syncNow());
  }, RETRY_FAILED_MS);

  onlineHandler = () => void syncNow();
  if (typeof window !== "undefined") window.addEventListener("online", onlineHandler);

  return stopOutboxSync;
}

export function stopOutboxSync(): void {
  setMutationListener(null);
  for (const t of [timer, retryTimer] as const) {
    if (t) clearInterval(t);
  }
  timer = null;
  retryTimer = null;
  if (kickTimer) {
    clearTimeout(kickTimer);
    kickTimer = null;
  }
  if (onlineHandler && typeof window !== "undefined") {
    window.removeEventListener("online", onlineHandler);
    onlineHandler = null;
  }
}
