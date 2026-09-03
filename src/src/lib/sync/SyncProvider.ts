export type SyncEventType = "ENTRY" | "EXIT";

export interface SyncEvent {
  attendanceId: string;
  clientId: string;
  deviceId: string | null;
  eventType: SyncEventType;
}

/**
 * Canal de sincronización de eventos de asistencia. LocalSyncProvider es
 * hoy el único que se instancia de verdad (la base SQLite local ya es la
 * fuente de verdad). FirebaseSyncProvider/BluetoothSyncProvider existen
 * como abstracción para cuando exista ese backend/hardware — no se
 * conectan a nada real todavía.
 */
export interface SyncProvider {
  enqueue(gymId: string, event: SyncEvent): Promise<void>;
  processPending(gymId: string): Promise<void>;
}
