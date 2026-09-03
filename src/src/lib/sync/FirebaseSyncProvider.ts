import type { SyncEvent, SyncProvider } from "./SyncProvider";

/**
 * NO IMPLEMENTADO. No existe ningún proyecto de Firebase conectado a
 * ASTRIM GYM (ver docs/ROADMAP.md, Fase 3). Esta clase solo prueba que
 * SyncProvider es una interfaz viable para un futuro backend remoto —
 * nunca se instancia en la aplicación real. Cuando exista Firebase, debe
 * guardar únicamente los datos necesarios en Firestore (nunca imágenes,
 * capturas ni logs en Storage, según lo acordado).
 */
export class FirebaseSyncProvider implements SyncProvider {
  async enqueue(_gymId: string, _event: SyncEvent): Promise<void> {
    throw new Error("FirebaseSyncProvider no está implementado todavía.");
  }

  async processPending(_gymId: string): Promise<void> {
    throw new Error("FirebaseSyncProvider no está implementado todavía.");
  }
}
