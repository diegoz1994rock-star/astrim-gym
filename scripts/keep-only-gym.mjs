/**
 * Limpieza puntual (solo dev): esta máquina acumuló varios gimnasios en la
 * base local porque se probó entrar con distintos correos de dueño (cada
 * `loginViaCloud` bootstrapea la fila `gyms` local). En producción una
 * instalación pertenece a UN solo gimnasio, así que el kiosco de recepción
 * asume "un solo gym" (`getSoleGymId` -> LIMIT 1) y terminaba tomando el
 * gimnasio equivocado (y su cliente de prueba CAMILO CASTAÑO en el
 * reconocimiento facial).
 *
 * Esto borra TODOS los gimnasios locales salvo el que se pasa por argumento
 * (o SMART VANE por defecto) y todo lo que cuelga de ellos.
 *
 * Uso (con el panel/dev CERRADO):
 *   node --experimental-sqlite scripts/keep-only-gym.mjs [gymId]
 */
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";

const KEEP = process.argv[2] || "gym_smart-vane_5p8jyx";
const DB = join(process.env.APPDATA, "com.astrimgym.desktop", "astrim_gym.db");

const db = new DatabaseSync(DB);

const gyms = db.prepare("SELECT id, name FROM gyms").all();
const toDelete = gyms.filter((g) => g.id !== KEEP).map((g) => g.id);

if (toDelete.length === 0) {
  console.log("Nada que borrar. Gimnasios:", gyms.map((g) => `${g.name} (${g.id})`).join(", "));
  db.close();
  process.exit(0);
}

console.log("Se conserva:", KEEP);
console.log("Se borran  :", gyms.filter((g) => g.id !== KEEP).map((g) => `${g.name} (${g.id})`).join(", "));

const inList = toDelete.map(() => "?").join(",");

db.exec("BEGIN");
try {
  // hijas sin gym_id -> por su padre
  db.prepare(`DELETE FROM class_block_exercises WHERE block_id IN (
    SELECT cb.id FROM class_blocks cb JOIN classes c ON c.id = cb.class_id WHERE c.gym_id IN (${inList}))`).run(...toDelete);
  db.prepare(`DELETE FROM class_blocks WHERE class_id IN (SELECT id FROM classes WHERE gym_id IN (${inList}))`).run(...toDelete);
  db.prepare(`DELETE FROM class_enrollments WHERE class_id IN (SELECT id FROM classes WHERE gym_id IN (${inList}))`).run(...toDelete);
  db.prepare(`DELETE FROM routine_exercises WHERE routine_id IN (SELECT id FROM routines WHERE gym_id IN (${inList}))`).run(...toDelete);

  for (const t of [
    "exercise_videos",
    "attendance_sync_queue",
    "attendance",
    "payments",
    "memberships",
    "measurements",
    "routine_assignments",
    "classes",
    "routines",
    "device_pairing_codes",
    "devices",
    "clients",
    "membership_plans",
    "trainers",
    "users",
    "outbox",
  ]) {
    const col = t === "outbox" ? "gym_id" : "gym_id";
    const n = db.prepare(`DELETE FROM ${t} WHERE ${col} IN (${inList})`).run(...toDelete);
    if (n.changes) console.log(`  ${t}: -${n.changes}`);
  }
  db.prepare(`DELETE FROM gyms WHERE id IN (${inList})`).run(...toDelete);
  db.exec("COMMIT");
  console.log("OK ✅  quedó solo", KEEP);
} catch (e) {
  db.exec("ROLLBACK");
  console.error("ROLLBACK:", e.message);
  process.exitCode = 1;
}

const left = db.prepare("SELECT name FROM gyms").all().map((g) => g.name);
const clientsLeft = db.prepare("SELECT name, gym_id FROM clients").all();
console.log("Gimnasios ahora:", left.join(", ") || "(ninguno)");
console.log("Clientes ahora :", clientsLeft.map((c) => c.name).join(", ") || "(ninguno)");
db.close();
