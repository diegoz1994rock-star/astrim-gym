import { getDb } from "../db/client";
import type { OutboxEntity, OutboxPayload } from "../cloud/mappers";

export type OutboxOp = "UPSERT" | "DELETE";
export type OutboxStatus = "PENDING" | "SYNCED" | "FAILED";

export interface OutboxRow {
  id: string;
  entity: OutboxEntity;
  entity_id: string;
  gym_id: string | null;
  op: OutboxOp;
  payload: string | null;
  status: OutboxStatus;
  attempts: number;
  last_error: string | null;
  enqueued_at: string;
  synced_at: string | null;
}

export interface OutboxItem {
  id: string;
  entity: OutboxEntity;
  entityId: string;
  op: OutboxOp;
  payload: OutboxPayload;
  attempts: number;
}

function parsePayload(raw: string | null): OutboxPayload {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as OutboxPayload;
  } catch {
    return {};
  }
}

/**
 * Filas listas para procesar: PENDING y cuyo backoff ya venció
 * (`enqueued_at <= ahora`). En `markFailed` se empuja `enqueued_at` al
 * futuro, así una fila que falla no se reintenta en cada tick.
 */
export async function listPending(limit: number): Promise<OutboxItem[]> {
  const db = await getDb();
  const rows = await db.select<OutboxRow[]>(
    `SELECT * FROM outbox
     WHERE status = 'PENDING' AND enqueued_at <= datetime('now')
     ORDER BY enqueued_at ASC
     LIMIT $1`,
    [limit],
  );
  return rows.map((r) => ({
    id: r.id,
    entity: r.entity,
    entityId: r.entity_id,
    op: r.op,
    payload: parsePayload(r.payload),
    attempts: r.attempts,
  }));
}

export async function markSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
  await db.execute(
    `UPDATE outbox SET status = 'SYNCED', synced_at = datetime('now'), last_error = NULL
     WHERE id IN (${placeholders})`,
    ids,
  );
}

const MAX_ATTEMPTS = 6;

export async function markFailed(id: string, error: string): Promise<void> {
  const db = await getDb();
  // Backoff exponencial acotado: 1, 4, 9, 16, 25 min...
  await db.execute(
    `UPDATE outbox SET
       attempts = attempts + 1,
       last_error = $1,
       status = CASE WHEN attempts + 1 >= $2 THEN 'FAILED' ELSE 'PENDING' END,
       enqueued_at = datetime('now', '+' || ((attempts + 1) * (attempts + 1)) || ' minutes')
     WHERE id = $3`,
    [error.slice(0, 500), MAX_ATTEMPTS, id],
  );
}

export async function countByStatus(status: OutboxStatus): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ c: number }[]>(
    `SELECT COUNT(*) AS c FROM outbox WHERE status = $1`,
    [status],
  );
  return rows[0]?.c ?? 0;
}

export interface FailedOutboxItem {
  entity: OutboxEntity;
  entityId: string;
  op: OutboxOp;
  status: OutboxStatus;
  lastError: string | null;
  attempts: number;
}

/**
 * Detalle de todo lo que NO está subiendo: las filas `FAILED` (agotaron los
 * reintentos) y también las `PENDING` que ya fallaron al menos una vez y
 * están esperando el backoff. Antes solo se mostraban las `FAILED`, así que
 * el usuario no veía el motivo hasta ~1 h después. Ahora aparece al toque.
 */
export async function listFailed(limit = 20): Promise<FailedOutboxItem[]> {
  const db = await getDb();
  const rows = await db.select<OutboxRow[]>(
    `SELECT * FROM outbox
     WHERE status = 'FAILED'
        OR (status = 'PENDING' AND (attempts > 0 OR last_error IS NOT NULL))
     ORDER BY status ASC, attempts DESC, enqueued_at DESC
     LIMIT $1`,
    [limit],
  );
  return rows.map((r) => ({
    entity: r.entity,
    entityId: r.entity_id,
    op: r.op,
    status: r.status,
    lastError: r.last_error,
    attempts: r.attempts,
  }));
}

export async function lastSyncedAt(): Promise<string | null> {
  const db = await getDb();
  const rows = await db.select<{ t: string | null }[]>(
    `SELECT MAX(synced_at) AS t FROM outbox`,
  );
  return rows[0]?.t ?? null;
}

/** Reintenta las FAILED: las vuelve a PENDING con backoff a cero. */
export async function retryFailed(): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE outbox SET status = 'PENDING', attempts = 0, enqueued_at = datetime('now')
     WHERE status = 'FAILED'`,
  );
}

/**
 * Adelanta el backoff de todas las PENDING para que el próximo syncNow las
 * procese ya. Lo llama el botón "Sincronizar ahora" — si el usuario lo
 * aprieta a mano, quiere que se intente de verdad, no esperar el backoff.
 */
export async function releaseBackoff(): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE outbox SET enqueued_at = datetime('now')
     WHERE status = 'PENDING' AND enqueued_at > datetime('now')`,
  );
}

/**
 * Encola un UPSERT de TODA la data sincronizable existente. Necesario una
 * vez tras instalar los triggers (0024), porque los datos ya sembrados no
 * dispararon ningún trigger. Idempotente: el ON CONFLICT no duplica.
 */
export async function backfillAll(): Promise<void> {
  const db = await getDb();
  const uid = `lower(hex(randomblob(16)))`;
  // El `WHERE ...` antes de ON CONFLICT es obligatorio en la forma
  // `INSERT ... SELECT ... ON CONFLICT`: sin él SQLite lee el ON como el
  // ON de un JOIN. Ver https://sqlite.org/lang_upsert.html (nota final).
  const onConflict = `ON CONFLICT (entity, entity_id) WHERE status = 'PENDING' DO NOTHING`;
  const stmts = [
    `INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
     SELECT ${uid}, 'gyms', id, id, 'UPSERT', json_object('gymId', id) FROM gyms WHERE 1=1 ${onConflict}`,
    `INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
     SELECT ${uid}, 'trainers', id, gym_id, 'UPSERT', json_object('gymId', gym_id) FROM trainers WHERE 1=1 ${onConflict}`,
    `INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
     SELECT ${uid}, 'membership_plans', id, gym_id, 'UPSERT', json_object('gymId', gym_id) FROM membership_plans WHERE 1=1 ${onConflict}`,
    `INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
     SELECT ${uid}, 'clients', id, gym_id, 'UPSERT', json_object('gymId', gym_id, 'clientId', id) FROM clients WHERE 1=1 ${onConflict}`,
    `INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
     SELECT ${uid}, 'memberships', id, gym_id, 'UPSERT', json_object('gymId', gym_id, 'clientId', client_id) FROM memberships WHERE 1=1 ${onConflict}`,
    `INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
     SELECT ${uid}, 'exercises', id, gym_id, 'UPSERT', json_object('gymId', gym_id) FROM exercises WHERE gym_id IS NOT NULL ${onConflict}`,
    // exercise_library / food_library (catálogo global, gym_id IS NULL) NO se
    // suben en el backfill: son colecciones compartidas y cada instalación
    // siembra su propia copia con ids distintos (0008/0032), así que
    // re-subirlas duplica el catálogo en Firestore. La biblioteca global se
    // siembra una sola vez (botón "Subir biblioteca de ejercicios" /
    // seedExerciseLibrary). Ver también el distinctBy en la app de clientes.
    `INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
     SELECT ${uid}, 'class_types', id, gym_id, 'UPSERT', json_object('gymId', gym_id) FROM class_types WHERE gym_id IS NOT NULL ${onConflict}`,
    `INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
     SELECT ${uid}, 'routines', id, gym_id, 'UPSERT', json_object('gymId', gym_id) FROM routines WHERE 1=1 ${onConflict}`,
    `INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
     SELECT ${uid}, 'routine_exercises', re.id, r.gym_id, 'UPSERT', json_object('gymId', r.gym_id, 'routineId', re.routine_id)
     FROM routine_exercises re JOIN routines r ON r.id = re.routine_id WHERE 1=1 ${onConflict}`,
    `INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
     SELECT ${uid}, 'routine_assignments', id, gym_id, 'UPSERT', json_object('gymId', gym_id, 'clientId', client_id, 'routineId', routine_id)
     FROM routine_assignments WHERE 1=1 ${onConflict}`,
    `INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
     SELECT ${uid}, 'classes', id, gym_id, 'UPSERT', json_object('gymId', gym_id) FROM classes WHERE 1=1 ${onConflict}`,
    `INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
     SELECT ${uid}, 'class_blocks', cb.id, c.gym_id, 'UPSERT', json_object('gymId', c.gym_id, 'classId', cb.class_id)
     FROM class_blocks cb JOIN classes c ON c.id = cb.class_id WHERE 1=1 ${onConflict}`,
    `INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
     SELECT ${uid}, 'class_block_exercises', cbe.id, c.gym_id, 'UPSERT',
            json_object('gymId', c.gym_id, 'classId', cb.class_id, 'blockId', cbe.block_id)
     FROM class_block_exercises cbe JOIN class_blocks cb ON cb.id = cbe.block_id JOIN classes c ON c.id = cb.class_id WHERE 1=1 ${onConflict}`,
    `INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
     SELECT ${uid}, 'class_enrollments', ce.id, c.gym_id, 'UPSERT',
            json_object('gymId', c.gym_id, 'clientId', ce.client_id, 'classId', ce.class_id)
     FROM class_enrollments ce JOIN classes c ON c.id = ce.class_id WHERE 1=1 ${onConflict}`,
    `INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
     SELECT ${uid}, 'measurements', id, gym_id, 'UPSERT', json_object('gymId', gym_id, 'clientId', client_id) FROM measurements WHERE 1=1 ${onConflict}`,
    `INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
     SELECT ${uid}, 'foods', id, gym_id, 'UPSERT', json_object('gymId', gym_id) FROM foods WHERE gym_id IS NOT NULL ${onConflict}`,
    // food_library: ver nota arriba (no se sube en el backfill).
    `INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
     SELECT ${uid}, 'meal_plans', id, gym_id, 'UPSERT', json_object('gymId', gym_id) FROM meal_plans WHERE 1=1 ${onConflict}`,
    `INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
     SELECT ${uid}, 'meal_plan_items', mpi.id, mp.gym_id, 'UPSERT', json_object('gymId', mp.gym_id, 'mealPlanId', mpi.meal_plan_id)
     FROM meal_plan_items mpi JOIN meal_plans mp ON mp.id = mpi.meal_plan_id WHERE 1=1 ${onConflict}`,
    `INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
     SELECT ${uid}, 'meal_plan_assignments', id, gym_id, 'UPSERT', json_object('gymId', gym_id, 'clientId', client_id, 'mealPlanId', meal_plan_id)
     FROM meal_plan_assignments WHERE 1=1 ${onConflict}`,
    `INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
     SELECT ${uid}, 'meal_plan_category_targets', mpct.id, mp.gym_id, 'UPSERT', json_object('gymId', mp.gym_id, 'mealPlanId', mpct.meal_plan_id)
     FROM meal_plan_category_targets mpct JOIN meal_plans mp ON mp.id = mpct.meal_plan_id WHERE 1=1 ${onConflict}`,
    `INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
     SELECT ${uid}, 'meal_plan_allowed_foods', maf.id, mp.gym_id, 'UPSERT', json_object('gymId', mp.gym_id, 'mealPlanId', maf.meal_plan_id)
     FROM meal_plan_allowed_foods maf JOIN meal_plans mp ON mp.id = maf.meal_plan_id WHERE 1=1 ${onConflict}`,
  ];
  for (const sql of stmts) {
    await db.execute(sql);
  }
}
