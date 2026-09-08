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

export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL).then(withMutationHook);
  }
  return dbPromise;
}
