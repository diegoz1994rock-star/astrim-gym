import * as syncQueueRepository from "../repositories/syncQueueRepository";
import type { SyncEvent, SyncProvider } from "./SyncProvider";

/**
 * Único proveedor real hoy: no hay ningún servidor remoto que exista
 * todavía, así que "sincronizar" es escribir en la cola local y marcarla
 * SYNCED de inmediato, porque esta misma base de datos SQLite ES el
 * destino final del evento. Cuando exista un backend remoto real, un
 * nuevo SyncProvider podrá leer los eventos PENDING que este mismo
 * esquema ya deja preparados, sin cambiar nada de accessService.
 */
export class LocalSyncProvider implements SyncProvider {
  async enqueue(gymId: string, event: SyncEvent): Promise<void> {
    const id = crypto.randomUUID();
    await syncQueueRepository.enqueueSyncEvent(id, {
      gymId,
      attendanceId: event.attendanceId,
      clientId: event.clientId,
      deviceId: event.deviceId,
      eventType: event.eventType,
    });
    await syncQueueRepository.markSynced(gymId, id);
  }

  async processPending(): Promise<void> {
    // No hay nada que procesar: enqueue() ya deja todo en SYNCED porque
    // el destino es la propia base local.
  }
}
