/**
 * Dos sonidos del modo recepción: uno al conceder el acceso, otro al
 * denegarlo o fallar. Sin ajustes de volumen (dispositivo fijo de
 * recepción). Los .wav viven en public/.
 */
type KioskSound = "ok" | "denied";

const SRC: Record<KioskSound, string> = {
  ok: "/access_ok.wav",
  denied: "/access_denied.wav",
};

const cache: Partial<Record<KioskSound, HTMLAudioElement>> = {};

function element(name: KioskSound): HTMLAudioElement {
  let el = cache[name];
  if (!el) {
    el = new Audio(SRC[name]);
    el.preload = "auto";
    el.volume = 0.9;
    cache[name] = el;
  }
  return el;
}

/** Precarga ambos sonidos (llamar al entrar al modo recepción). */
export function preloadKioskSounds(): void {
  try {
    element("ok");
    element("denied");
  } catch {
    /* entorno sin Audio */
  }
}

export function playKioskSound(name: KioskSound): void {
  try {
    const el = element(name);
    el.currentTime = 0;
    void el.play();
  } catch {
    /* reproducción bloqueada: no es crítico */
  }
}
