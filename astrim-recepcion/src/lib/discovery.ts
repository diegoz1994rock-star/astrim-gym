import { invoke } from "@tauri-apps/api/core";

/**
 * Manda un broadcast UDP en la red local y espera la respuesta del
 * computador principal. Si la red no permite broadcast (algunos routers lo
 * bloquean), devuelve null y la pantalla de vinculación cae al respaldo de
 * IP manual — nunca se bloquea la vinculación por esto.
 */
export async function discoverServerHost(): Promise<string | null> {
  try {
    const host = await invoke<string | null>("discover_server");
    return host;
  } catch {
    return null;
  }
}
