/**
 * Arreglo puntual (solo dev): la migración 0028 se editó DESPUÉS de haberse
 * aplicado a la base local, así que sqlx la rechaza al arrancar con
 * "migration 28 was previously applied but has been modified" y el panel no
 * carga la BD (no se puede ni iniciar sesión).
 *
 * Esto recalcula el checksum del archivo actual y lo escribe en
 * _sqlx_migrations. La tabla `exercise_videos` y sus triggers ya existen, así
 * que no se pierde nada. Los 11 items pendientes del outbox se sincronizan
 * solos cuando el panel vuelva a levantar.
 *
 * Uso (con el panel/dev CERRADO):
 *   node --experimental-sqlite scripts/fix-migration-28-checksum.mjs
 */
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATION = "src-tauri/migrations/0028_exercise_videos.sql";
const DB = join(process.env.APPDATA, "com.astrimgym.desktop", "astrim_gym.db");

const checksum = createHash("sha384").update(readFileSync(MIGRATION)).digest();

const db = new DatabaseSync(DB);
const before = db.prepare("SELECT hex(checksum) c FROM _sqlx_migrations WHERE version = 28").get();
db.prepare("UPDATE _sqlx_migrations SET checksum = ? WHERE version = 28").run(checksum);
const after = db.prepare("SELECT hex(checksum) c FROM _sqlx_migrations WHERE version = 28").get();
db.close();

console.log("BD      :", DB);
console.log("checksum antes :", before?.c);
console.log("checksum ahora :", after?.c);
console.log(after?.c === checksum.toString("hex").toUpperCase() ? "OK ✅  volvé a abrir el panel" : "algo no cuadró");
