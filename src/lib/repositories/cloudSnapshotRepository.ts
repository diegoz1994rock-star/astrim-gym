import { getDb } from "../db/client";
import type { OutboxEntity, Row } from "../cloud/mappers";

/**
 * Lee la fila ACTUAL de SQLite para una entidad del outbox, con los joins
 * que su mapper necesita (nombre del entrenador, conteo de ejercicios,
 * etc.). Solo lectura: no participa de ninguna escritura. Devuelve `null`
 * si la fila ya no existe (una edición seguida de un borrado antes de
 * sincronizar) — el worker trata ese caso como DELETE.
 */
const QUERIES: Record<OutboxEntity, string> = {
  // client_count / active_client_count: la consola de operador los muestra
  // sin tener acceso a los clientes en sí (ver mapper de `gyms`).
  gyms: `
    SELECT g.*,
      (SELECT COUNT(*) FROM clients c WHERE c.gym_id = g.id) AS client_count,
      (SELECT COUNT(*) FROM clients c WHERE c.gym_id = g.id AND c.status = 'ACTIVE') AS active_client_count
    FROM gyms g WHERE g.id = $1`,
  trainers: `SELECT * FROM trainers WHERE id = $1`,
  membership_plans: `SELECT * FROM membership_plans WHERE id = $1`,
  clients: `
    SELECT c.*, t.name AS trainer_name
    FROM clients c LEFT JOIN trainers t ON t.id = c.trainer_id
    WHERE c.id = $1`,
  memberships: `
    SELECT m.*, p.name AS plan_name
    FROM memberships m LEFT JOIN membership_plans p ON p.id = m.plan_id
    WHERE m.id = $1`,
  exercises: `SELECT * FROM exercises WHERE id = $1`,
  exercise_library: `SELECT * FROM exercises WHERE id = $1`,
  exercise_video: `SELECT * FROM exercise_videos WHERE id = $1`,
  class_types: `SELECT * FROM class_types WHERE id = $1`,
  routines: `
    SELECT r.*,
      (SELECT COUNT(*) FROM routine_exercises re WHERE re.routine_id = r.id) AS exercise_count
    FROM routines r WHERE r.id = $1`,
  routine_exercises: `
    SELECT re.*, ex.name AS exercise_name,
      (SELECT gym_id FROM routines WHERE id = re.routine_id) AS gym_id
    FROM routine_exercises re JOIN exercises ex ON ex.id = re.exercise_id
    WHERE re.id = $1`,
  routine_assignments: `
    SELECT ra.*, r.name AS routine_name, r.status AS routine_status,
      (SELECT COUNT(*) FROM routine_exercises re WHERE re.routine_id = ra.routine_id) AS exercise_count
    FROM routine_assignments ra JOIN routines r ON r.id = ra.routine_id
    WHERE ra.id = $1`,
  classes: `
    SELECT cl.*, ct.name AS class_type_name, t.name AS trainer_name,
      (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.class_id = cl.id AND ce.status != 'CANCELLED') AS enrolled_count
    FROM classes cl
    LEFT JOIN class_types ct ON ct.id = cl.class_type_id
    LEFT JOIN trainers t ON t.id = cl.trainer_id
    WHERE cl.id = $1`,
  class_blocks: `
    SELECT cb.*, (SELECT gym_id FROM classes WHERE id = cb.class_id) AS gym_id
    FROM class_blocks cb WHERE cb.id = $1`,
  class_block_exercises: `
    SELECT cbe.*, ex.name AS exercise_name, cb.class_id AS class_id,
      (SELECT c.gym_id FROM class_blocks b JOIN classes c ON c.id = b.class_id WHERE b.id = cbe.block_id) AS gym_id
    FROM class_block_exercises cbe
    JOIN exercises ex ON ex.id = cbe.exercise_id
    JOIN class_blocks cb ON cb.id = cbe.block_id
    WHERE cbe.id = $1`,
  class_enrollments: `
    SELECT ce.*, (SELECT gym_id FROM classes WHERE id = ce.class_id) AS gym_id,
      cl.name AS class_name, cl.date AS class_date, cl.start_time AS class_start_time
    FROM class_enrollments ce JOIN classes cl ON cl.id = ce.class_id
    WHERE ce.id = $1`,
  measurements: `SELECT * FROM measurements WHERE id = $1`,
  foods: `SELECT * FROM foods WHERE id = $1`,
  food_library: `SELECT * FROM foods WHERE id = $1`,
  meal_plans: `
    SELECT mp.*,
      (SELECT COUNT(*) FROM meal_plan_items mpi WHERE mpi.meal_plan_id = mp.id) AS item_count
    FROM meal_plans mp WHERE mp.id = $1`,
  meal_plan_items: `
    SELECT mpi.*, f.name AS food_name,
      (SELECT gym_id FROM meal_plans WHERE id = mpi.meal_plan_id) AS gym_id
    FROM meal_plan_items mpi LEFT JOIN foods f ON f.id = mpi.food_id
    WHERE mpi.id = $1`,
  meal_plan_assignments: `
    SELECT mpa.*, mp.name AS meal_plan_name, mp.status AS meal_plan_status,
      (SELECT COUNT(*) FROM meal_plan_items mpi WHERE mpi.meal_plan_id = mpa.meal_plan_id) AS item_count
    FROM meal_plan_assignments mpa JOIN meal_plans mp ON mp.id = mpa.meal_plan_id
    WHERE mpa.id = $1`,
  meal_plan_category_targets: `
    SELECT mpct.*, (SELECT gym_id FROM meal_plans WHERE id = mpct.meal_plan_id) AS gym_id
    FROM meal_plan_category_targets mpct WHERE mpct.id = $1`,
  meal_plan_allowed_foods: `
    SELECT maf.*, f.name AS food_name, f.category AS category, f.default_unit AS default_unit,
      f.calories_kcal AS calories_kcal, f.protein_g AS protein_g, f.carbs_g AS carbs_g, f.fat_g AS fat_g,
      (SELECT gym_id FROM meal_plans WHERE id = maf.meal_plan_id) AS gym_id
    FROM meal_plan_allowed_foods maf JOIN foods f ON f.id = maf.food_id
    WHERE maf.id = $1`,
};

export async function getSnapshotRow(entity: OutboxEntity, entityId: string): Promise<Row | null> {
  const db = await getDb();
  const rows = await db.select<Row[]>(QUERIES[entity], [entityId]);
  return rows[0] ?? null;
}
