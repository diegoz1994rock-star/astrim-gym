import { invoke } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";

const DB_URL = "sqlite:astrim_gym.db";

let dbPromise: Promise<Database> | null = null;

/**
 * Se dispara después de CUALQUIER escritura en la base (INSERT/UPDATE/DELETE),
 * salvo las que el propio worker de sync hace sobre `outbox`. El worker se
 * registra acá para sincronizar a la nube al instante, sin esperar el
 * intervalo ni que nadie apriete un botón.
 */
let mutationListener: (() => void) | null = null;
export function setMutationListener(fn: (() => void) | null): void {
  mutationListener = fn;
}

const OUTBOX_WRITE = /^\s*(update|insert(\s+or\s+\w+)?|delete)\s+(into\s+)?"?outbox"?\b/i;

function withMutationHook(db: Database): Database {
  const execute = db.execute.bind(db);
  db.execute = async (query: string, bindValues?: unknown[]) => {
    const result = await execute(query, bindValues);
    if (mutationListener && !OUTBOX_WRITE.test(query)) {
      try {
        mutationListener();
      } catch {
        /* el hook nunca debe romper una escritura */
      }
    }
    return result;
  };
  return db;
}

/**
 * Antes de abrir la base, el backend re-sella los checksums de migraciones
 * que solo difieren por finales de línea (CRLF/LF según dónde se compiló el
 * instalador). Sin esto sqlx rechaza la base y nada funciona — ni el login.
 * Best-effort: si falla, se intenta abrir igual y el error real sale de load.
 */
async function openDb(): Promise<Database> {
  try {
    await invoke("prepare_database");
  } catch (e) {
    console.warn("prepare_database:", e);
  }
  return withMutationHook(await Database.load(DB_URL));
}

export function getDb(): Promise<Database> {
  if (!dbPromise) {
    // Si la apertura falla no se cachea el rechazo: el próximo intento
    // (p. ej. volver a apretar "Ingresar") lo reintenta.
    dbPromise = openDb().catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}
