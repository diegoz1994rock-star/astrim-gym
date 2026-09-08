/**
 * Alta de un gimnasio real en el panel (paso a producción).
 *
 * Cuando un dueño te compra la aplicación y te pasa los datos de su
 * gimnasio, este script deja su base SQLite lista para que pueda iniciar
 * sesión en el panel:
 *
 *   1. Inserta la fila en `gyms` (con la licencia/mensualidad).
 *   2. Inserta su usuario ADMIN en `users` (contraseña hasheada con el
 *      mismo bcrypt que valida el login — src/lib/services/authService.ts).
 *   3. Con --firebase, además crea su cuenta en Firebase Auth (REST, con la
 *      apiKey pública de .env.local) y te imprime el UID.
 *
 * Lo único que queda a mano después es crear el documento
 * `userIndex/{uid}` en Firestore (el bootstrap del primer ADMIN de un gym
 * no lo pueden hacer las reglas) — el script te imprime exactamente qué
 * pegar en la consola.
 *
 * Uso:
 *   node --experimental-sqlite scripts/provision-gym.mjs \
 *     --name "POWER GYM" --email juan@gmail.com --password "ClaveInicial123" \
 *     [--owner "Juan"] [--months 1] [--plan STANDARD] [--firebase] [--db "<ruta>"]
 *
 * --db por defecto: la base del panel instalado en esta máquina
 *   Windows: %APPDATA%\com.astrimgym.desktop\astrim_gym.db
 *   macOS:   ~/Library/Application Support/com.astrimgym.desktop/astrim_gym.db
 *   Linux:   ~/.config/com.astrimgym.desktop/astrim_gym.db
 */

import { DatabaseSync } from "node:sqlite";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";

const require = createRequire(import.meta.url);
const bcrypt = require("bcryptjs");

// ---- argumentos -----------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

const name = typeof args.name === "string" ? args.name.trim() : "";
const email = typeof args.email === "string" ? args.email.trim().toLowerCase() : "";
const password = typeof args.password === "string" ? args.password : "";
const owner = typeof args.owner === "string" ? args.owner.trim() : name;
const plan = typeof args.plan === "string" ? args.plan.trim() : "STANDARD";
const months = Number.isFinite(Number(args.months)) ? Number(args.months) : 1;
const wantFirebase = args.firebase === true;

if (!name || !email || !password) {
  console.error(
    "Faltan datos. Uso:\n" +
      '  node --experimental-sqlite scripts/provision-gym.mjs --name "POWER GYM" ' +
      '--email juan@gmail.com --password "ClaveInicial123" [--owner "Juan"] ' +
      "[--months 1] [--plan STANDARD] [--firebase] [--db <ruta>]",
  );
  process.exit(1);
}
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error(`Correo inválido: ${email}`);
  process.exit(1);
}
if (password.length < 6) {
  console.error("La contraseña debe tener al menos 6 caracteres (requisito de Firebase Auth).");
  process.exit(1);
}

// ---- ruta de la base -----------------------------------------------------

function defaultDbPath() {
  const id = "com.astrimgym.desktop";
  const file = "astrim_gym.db";
  if (process.platform === "win32") {
    return join(process.env.APPDATA || join(homedir(), "AppData", "Roaming"), id, file);
  }
  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Application Support", id, file);
  }
  return join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), id, file);
}

const dbPath = typeof args.db === "string" ? args.db : defaultDbPath();
if (!existsSync(dbPath)) {
  console.error(
    `No encuentro la base en:\n  ${dbPath}\n` +
      "Abrí el panel al menos una vez en esa máquina para que se cree, o pasá --db con la ruta correcta.",
  );
  process.exit(1);
}

// ---- helpers ------------------------------------------------------------

function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "gym";
}

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function readEnvLocal() {
  const p = join(process.cwd(), ".env.local");
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

async function createFirebaseAuthUser(apiKey, email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const body = await res.json();
  if (res.ok && body.localId) return { uid: body.localId, existed: false };
  const code = body?.error?.message || "";
  if (code === "EMAIL_EXISTS") return { uid: null, existed: true };
  throw new Error(`Firebase signUp falló: ${code || res.status}`);
}

// ---- provisioning -----------------------------------------------------------

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON");

// La base tiene que estar migrada (incluida la 0027 que borra el demo).
const maxMigration =
  db.prepare("SELECT MAX(version) AS v FROM _sqlx_migrations").get()?.v ?? 0;
if (maxMigration < 27) {
  console.error(
    `La base está en la migración ${maxMigration}. Abrí el panel una vez para que aplique ` +
      "hasta la 0027 antes de dar de alta un gimnasio.",
  );
  process.exit(1);
}

const emailTaken = db.prepare("SELECT 1 FROM users WHERE email = ?").get(email);
if (emailTaken) {
  console.error(`Ya existe un usuario del panel con el correo ${email} en esta base.`);
  process.exit(1);
}

let slug = slugify(name);
if (db.prepare("SELECT 1 FROM gyms WHERE slug = ?").get(slug)) {
  slug = `${slug}-${randomBytes(2).toString("hex")}`;
}

const suffix = randomBytes(3).toString("hex");
const gymId = `gym_${slug.replace(/-/g, "_")}_${suffix}`.slice(0, 60);
const userId = `user_${slug.replace(/-/g, "_")}_${suffix}`.slice(0, 60);
const passwordHash = bcrypt.hashSync(password, 10);

const startDate = isoDate(new Date());
const expirationDate = isoDate(addMonths(new Date(), months));

db.exec("BEGIN");
try {
  db.prepare(
    `INSERT INTO gyms (id, name, slug, license_status, license_plan,
       license_start_date, license_expiration_date, email)
     VALUES (?, ?, ?, 'ACTIVE', ?, ?, ?, ?)`,
  ).run(gymId, name, slug, plan, startDate, expirationDate, email);

  db.prepare(
    `INSERT INTO users (id, gym_id, name, email, password_hash, role, status)
     VALUES (?, ?, ?, ?, ?, 'ADMIN', 'ACTIVE')`,
  ).run(userId, gymId, owner || name, email, passwordHash);

  db.exec("COMMIT");
} catch (e) {
  db.exec("ROLLBACK");
  console.error(`No se pudo insertar el gimnasio: ${e.message}`);
  process.exit(1);
}

// ---- Firebase Auth (opcional) ---------------------------------------------

let firebaseUid = null;
let firebaseNote = "";
if (wantFirebase) {
  const env = readEnvLocal();
  const apiKey = env.VITE_FIREBASE_API_KEY;
  if (!apiKey) {
    firebaseNote =
      "  (--firebase pedido pero no encontré VITE_FIREBASE_API_KEY en .env.local — creá la cuenta a mano)";
  } else {
    try {
      const r = await createFirebaseAuthUser(apiKey, email, password);
      if (r.existed) {
        firebaseNote = `  La cuenta ${email} YA existía en Firebase Auth — buscá su UID en la consola.`;
      } else {
        firebaseUid = r.uid;
      }
    } catch (e) {
      firebaseNote = `  No se pudo crear la cuenta en Firebase Auth: ${e.message}`;
    }
  }
}

db.close();

// ---- resumen -------------------------------------------------------------

const line = "─".repeat(64);
console.log(`\n${line}`);
console.log(`  Gimnasio dado de alta en:  ${dbPath}`);
console.log(line);
console.log(`  Nombre:        ${name}`);
console.log(`  gymId:         ${gymId}`);
console.log(`  Login panel:   ${email}`);
console.log(`  Contraseña:    ${password}   (comunicásela y que la cambie)`);
console.log(`  Rol:           ADMIN`);
console.log(`  Licencia:      ${plan} · ${startDate} → ${expirationDate} (${months} mes/es)`);
console.log(line);
console.log("  YA PUEDE INICIAR SESIÓN EN EL PANEL con ese correo y contraseña.");
console.log(line);
console.log("  Para que además funcione la APK de clientes (sync a la nube):");
console.log("");
if (firebaseUid) {
  console.log(`  1. Cuenta Firebase Auth creada. UID = ${firebaseUid}`);
} else {
  console.log("  1. Firebase Console → Authentication → Agregar usuario:");
  console.log(`        ${email}  /  ${password}`);
  console.log("     Copiá el UID que queda.");
  if (firebaseNote) console.log(firebaseNote);
}
console.log("");
console.log("  2. Firebase Console → Firestore → colección 'userIndex' →");
console.log("     documento con ID = ese UID → campos:");
console.log(`        gymId  (string) = ${gymId}`);
console.log(`        role   (string) = ADMIN`);
console.log("");
console.log("  3. El dueño abre el panel → Configuración → Nube → inicia sesión");
console.log("     con ese correo → 'Sincronización inicial completa'.");
console.log(`${line}\n`);
