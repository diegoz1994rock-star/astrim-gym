import { useCallback, useEffect, useState } from "react";

/**
 * Lista de cámaras (`videoinput`) disponibles en el equipo. Sirve para que la
 * recepción elija qué cámara usar cuando hay más de una (típico en una PC con
 * webcam externa). En una tablet con una sola cámara no hace falta elegir.
 *
 * Las etiquetas (`label`) del navegador solo se rellenan DESPUÉS de conceder
 * permiso de cámara una vez; por eso se re-enumera al evento `devicechange` y
 * cuando el consumidor lo pide con `refresh()` (p. ej. al arrancar el stream).
 */
export function useVideoInputs(active: boolean) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const refresh = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === "videoinput"));
    } catch {
      setDevices([]);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    refresh();
    const onChange = () => refresh();
    navigator.mediaDevices?.addEventListener?.("devicechange", onChange);
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", onChange);
  }, [active, refresh]);

  return { devices, refresh };
}
