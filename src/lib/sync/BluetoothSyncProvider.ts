import type { SyncEvent, SyncProvider } from "./SyncProvider";

/**
 * NO IMPLEMENTADO. No hay ningún transporte Bluetooth integrado hoy. Esta
 * clase deja lista la forma de un futuro canal de sincronización entre
 * dispositivos cercanos sin fingir que ya funciona.
 */
export class BluetoothSyncProvider implements SyncProvider {
  async enqueue(_gymId: string, _event: SyncEvent): Promise<void> {
    throw new Error("BluetoothSyncProvider no está implementado todavía.");
  }

  async processPending(_gymId: string): Promise<void> {
    throw new Error("BluetoothSyncProvider no está implementado todavía.");
  }
}
