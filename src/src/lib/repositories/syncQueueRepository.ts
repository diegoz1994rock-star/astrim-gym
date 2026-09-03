import { getDb } from "../db/client";

export type SyncEventType = "ENTRY" | "EXIT";
export type SyncStatus = "PENDING" | "SYNCED" | "FAILED";

export interface SyncQueueRow {
  id: string;
  gym_id: string;
  attendance_id: string;
  client_id: string;
  device_id: string | null;
  event_type: SyncEventType;
  sync_status: SyncStatus;
  created_at: string;
  synced_at: string | null;
}

export interface EnqueueSyncEventInput {
  gymId: string;
  attendanceId: string;
  clientId: string;
  deviceId: string | null;
  eventType: SyncEventType;
}

export async function enqueueSyncEvent(id: string, input: EnqueueSyncEventInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO attendance_sync_queue (id, gym_id, attendance_id, client_id, device_id, event_type)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, input.gymId, input.attendanceId, input.clientId, input.deviceId, input.eventType],
  );
}

export async function markSynced(gymId: string, id: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE attendance_sync_queue SET sync_status = 'SYNCED', synced_at = datetime('now')
     WHERE id = $1 AND gym_id = $2`,
    [id, gymId],
  );
}

export async function listPending(gymId: string): Promise<SyncQueueRow[]> {
  const db = await getDb();
  return db.select<SyncQueueRow[]>(
    `SELECT * FROM attendance_sync_queue WHERE gym_id = $1 AND sync_status = 'PENDING'`,
    [gymId],
  );
}
