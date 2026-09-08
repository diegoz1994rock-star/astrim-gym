/**
 * Dos sonidos del control de acceso: uno al conceder el paso, otro al
 * denegarlo o fallar. Sin ajustes de volumen: es un dispositivo de recepción
 * fijo. Los .wav viven en public/ (se empaquetan en la app).
 */
type AccessSound = "ok" | "denied";

const SRC: Record<AccessSound, string> = {
  ok: "/access_ok.wav",
  denied: "/access_denied.wav",
};

const cache: Partial<Record<AccessSound, HTMLAudioElement>> = {};

function element(name: AccessSound): HTMLAudioElement {
  let el = cache[name];
  if (!el) {
    el = new Audio(SRC[name]);
    el.preload = "auto";
    el.volume = 0.9;
    cache[name] = el;
  }
  return el;
}

/** Precarga ambos sonidos (llamar una vez al montar la pantalla de acceso). */
export function preloadAccessSounds(): void {
  try {
    element("ok");
    element("denied");
  } catch {
    /* entorno sin Audio: se ignora */
  }
}

export function playAccessSound(name: AccessSound): void {
  try {
    const el = element(name);
    el.currentTime = 0;
    void el.play();
  } catch {
    /* reproducción bloqueada o sin audio: no es crítico */
  }
}
