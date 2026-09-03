import { BaseDirectory, exists, mkdir, readTextFile, remove, writeTextFile } from "@tauri-apps/plugin-fs";

const FILE_NAME = "device.json";

export interface StoredDevice {
  gymId: string;
  gymName: string;
  deviceId: string;
  deviceName: string;
  apiToken: string;
  serverHost: string;
}

export async function loadStoredDevice(): Promise<StoredDevice | null> {
  const found = await exists(FILE_NAME, { baseDir: BaseDirectory.AppLocalData });
  if (!found) return null;
  const raw = await readTextFile(FILE_NAME, { baseDir: BaseDirectory.AppLocalData });
  try {
    return JSON.parse(raw) as StoredDevice;
  } catch {
    return null;
  }
}

export async function saveStoredDevice(device: StoredDevice): Promise<void> {
  await mkdir("", { baseDir: BaseDirectory.AppLocalData, recursive: true });
  await writeTextFile(FILE_NAME, JSON.stringify(device), { baseDir: BaseDirectory.AppLocalData });
}

/** "Olvidar este dispositivo": borra las credenciales locales. No revoca nada del lado del gimnasio (eso lo hace el administrador desde el panel). */
export async function forgetStoredDevice(): Promise<void> {
  const found = await exists(FILE_NAME, { baseDir: BaseDirectory.AppLocalData });
  if (found) {
    await remove(FILE_NAME, { baseDir: BaseDirectory.AppLocalData });
  }
}
