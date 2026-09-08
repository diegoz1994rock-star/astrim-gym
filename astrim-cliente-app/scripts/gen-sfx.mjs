/**
 * Genera los efectos de sonido de ASTRIM GYM (síntesis procedural, sin
 * librerías). Salida: app/src/main/res/raw/sfx_*.wav — mono, 44.1 kHz, 16-bit.
 *
 * Estética: gimnasio + tecnología + espartano + videojuego premium. Cortos,
 * secos, marcados. Sin glissandos de dibujo animado.
 *
 * Uso: node astrim-cliente-app/scripts/gen-sfx.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 44100;
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "src", "main", "res", "raw");
mkdirSync(OUT, { recursive: true });

// ---------- helpers de síntesis ----------

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;

/** Buffer de N segundos, mono Float32 en [-1,1]. */
function buffer(seconds) {
  return new Float32Array(Math.round(seconds * SR));
}

/** Envolvente: ataque lineal + caída/soltado exponencial. hold = meseta a 1. */
function env(i, len, { attack = 0.003, hold = 0, tau = 0.05, release = 0.008 } = {}) {
  const t = i / SR;
  const total = len / SR;
  const relStart = total - release;
  if (t < attack) return t / attack;
  if (t < attack + hold) return 1;
  if (t >= relStart) return Math.max(0, 1 - (t - relStart) / release) * Math.exp(-(relStart - attack - hold) / tau);
  return Math.exp(-(t - attack - hold) / tau);
}

/** Oscilador. shape: 'sine' | 'tri' | 'saw' | 'square'. */
function osc(phase, shape) {
  const p = phase - Math.floor(phase);
  switch (shape) {
    case "tri": return 4 * Math.abs(p - 0.5) - 1;
    case "saw": return 2 * p - 1;
    case "square": return p < 0.5 ? 1 : -1;
    default: return Math.sin(2 * Math.PI * p);
  }
}

/**
 * Añade un "tono" al buffer: una nota con parciales, envolvente propia y
 * glide de frecuencia opcional. start/dur en segundos.
 */
function tone(buf, { start, dur, f0, f1 = null, shape = "sine", partials = [[1, 1]], gain = 0.5, envOpts = {}, chirp = 0 }) {
  const i0 = Math.round(start * SR);
  const n = Math.round(dur * SR);
  let phases = partials.map(() => 0);
  for (let i = 0; i < n; i++) {
    const idx = i0 + i;
    if (idx >= buf.length) break;
    const k = i / n;
    const freq = (f1 == null ? f0 : lerp(f0, f1, k)) + chirp * k;
    const e = env(i, n, envOpts);
    let s = 0;
    partials.forEach(([mult, amp], pi) => {
      phases[pi] += (freq * mult) / SR;
      s += osc(phases[pi], shape) * amp;
    });
    buf[idx] += s * e * gain;
  }
}

/** Ruido filtrado (one-pole lowpass) para transientes/clicks. */
function noiseBurst(buf, { start, dur, cutoff = 0.5, gain = 0.3, envOpts = {} }) {
  const i0 = Math.round(start * SR);
  const n = Math.round(dur * SR);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const idx = i0 + i;
    if (idx >= buf.length) break;
    const white = Math.random() * 2 - 1;
    lp += cutoff * (white - lp);
    buf[idx] += lp * env(i, n, envOpts) * gain;
  }
}

/** Soft-clip (saturación suave estilo "punch"). */
function saturate(buf, amount = 1.4) {
  for (let i = 0; i < buf.length; i++) buf[i] = Math.tanh(buf[i] * amount) / Math.tanh(amount);
}

/** Normaliza a un pico objetivo y aplica micro-fade final anti-click. */
function finish(buf, peak = 0.92) {
  let max = 0;
  for (const v of buf) max = Math.max(max, Math.abs(v));
  if (max > 0) {
    const g = peak / max;
    for (let i = 0; i < buf.length; i++) buf[i] *= g;
  }
  const fade = Math.round(0.004 * SR);
  for (let i = 0; i < fade; i++) {
    const g = i / fade;
    buf[i] *= g;
    buf[buf.length - 1 - i] *= g;
  }
}

/** Float32 [-1,1] -> WAV PCM 16-bit mono. */
function toWav(buf) {
  const data = Buffer.alloc(buf.length * 2);
  for (let i = 0; i < buf.length; i++) {
    const s = clamp(buf[i], -1, 1);
    data.writeInt16LE(Math.round(s * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

function save(name, buf) {
  finish(buf);
  writeFileSync(join(OUT, `${name}.wav`), toWav(buf));
  console.log(`  ${name}.wav  (${(buf.length / SR * 1000).toFixed(0)} ms)`);
}

// ---------- los sonidos ----------

// Pulsación de botón: tick minúsculo y brillante.
function tap() {
  const b = buffer(0.03);
  tone(b, { start: 0, dur: 0.026, f0: 2600, shape: "sine", gain: 0.6, envOpts: { attack: 0.0005, tau: 0.006, release: 0.004 } });
  tone(b, { start: 0, dur: 0.02, f0: 5200, shape: "sine", gain: 0.16, envOpts: { attack: 0.0004, tau: 0.004, release: 0.003 } });
  return b;
}

// "Entrando a los últimos 10 s": alerta descendente, sobria.
function countdownEnter() {
  const b = buffer(0.27);
  tone(b, { start: 0, dur: 0.1, f0: 760, shape: "tri", partials: [[1, 1], [2, 0.18]], gain: 0.5, envOpts: { attack: 0.008, tau: 0.06, release: 0.02 } });
  tone(b, { start: 0.09, dur: 0.16, f0: 560, shape: "tri", partials: [[1, 1], [2, 0.14]], gain: 0.5, envOpts: { attack: 0.006, tau: 0.09, release: 0.03 } });
  return b;
}

// Tick del conteo (9..4): seco, mecánico pero refinado.
function tick() {
  const b = buffer(0.06);
  tone(b, {
    start: 0, dur: 0.055, f0: 1350, shape: "square",
    partials: [[1, 1], [2, 0.35], [3, 0.16]], gain: 0.5,
    envOpts: { attack: 0.0015, tau: 0.014, release: 0.006 },
  });
  return b;
}

// Tick urgente (3..1): más agudo, con micro-chirp ascendente, más marcado.
function tickUrgent() {
  const b = buffer(0.07);
  tone(b, {
    start: 0, dur: 0.062, f0: 1750, f1: 1750, chirp: 130, shape: "square",
    partials: [[1, 1], [2, 0.4], [3, 0.22], [5, 0.1]], gain: 0.62,
    envOpts: { attack: 0.001, tau: 0.016, release: 0.006 },
  });
  return b;
}

// Cero / fin del descanso: resolución con punch.
function go() {
  const b = buffer(0.48);
  // whoosh corto hacia arriba
  tone(b, { start: 0, dur: 0.07, f0: 620, f1: 930, shape: "saw", partials: [[1, 1], [2, 0.3]], gain: 0.45, envOpts: { attack: 0.002, tau: 0.05, release: 0.01 } });
  // acorde sostenido (quinta + suboctava)
  tone(b, { start: 0.05, dur: 0.42, f0: 930, shape: "sine", partials: [[1, 1], [2, 0.25], [3, 0.1]], gain: 0.5, envOpts: { attack: 0.004, tau: 0.18, release: 0.04 } });
  tone(b, { start: 0.05, dur: 0.42, f0: 1395, shape: "sine", partials: [[1, 0.7]], gain: 0.32, envOpts: { attack: 0.006, tau: 0.16, release: 0.04 } });
  tone(b, { start: 0.05, dur: 0.42, f0: 465, shape: "tri", partials: [[1, 0.8]], gain: 0.3, envOpts: { attack: 0.004, tau: 0.2, release: 0.05 } });
  saturate(b, 1.5);
  return b;
}

// Iniciar entrenamiento: "engage" ascendente de 3 notas + cuerpo grave.
function start() {
  const b = buffer(0.64);
  const notes = [294, 440, 587];
  notes.forEach((f, i) => {
    const st = i * 0.085;
    const dur = i === 2 ? 0.36 : 0.11;
    tone(b, {
      start: st, dur, f0: f, shape: "saw",
      partials: [[1, 1], [2, 0.4], [3, 0.15]], gain: 0.4,
      envOpts: { attack: 0.003, tau: i === 2 ? 0.22 : 0.05, release: 0.02 },
    });
    tone(b, { start: st, dur, f0: f, shape: "sine", gain: 0.28, envOpts: { attack: 0.003, tau: i === 2 ? 0.24 : 0.05, release: 0.02 } });
  });
  // octava shimmer sobre la nota final
  tone(b, { start: 0.19, dur: 0.36, f0: 1174, shape: "sine", gain: 0.16, envOpts: { attack: 0.08, tau: 0.2, release: 0.05 } });
  // thump grave bajo la primera nota
  tone(b, { start: 0, dur: 0.05, f0: 73, shape: "sine", gain: 0.55, envOpts: { attack: 0.002, tau: 0.03, release: 0.01 } });
  saturate(b, 1.35);
  return b;
}

function pause() {
  const b = buffer(0.24);
  tone(b, { start: 0, dur: 0.08, f0: 620, shape: "sine", partials: [[1, 1], [2, 0.12]], gain: 0.5, envOpts: { attack: 0.01, tau: 0.06, release: 0.02 } });
  tone(b, { start: 0.075, dur: 0.15, f0: 415, shape: "tri", partials: [[1, 1], [2, 0.1]], gain: 0.5, envOpts: { attack: 0.008, tau: 0.1, release: 0.03 } });
  return b;
}

function resume() {
  const b = buffer(0.24);
  tone(b, { start: 0, dur: 0.08, f0: 415, shape: "tri", partials: [[1, 1], [2, 0.1]], gain: 0.5, envOpts: { attack: 0.008, tau: 0.06, release: 0.02 } });
  tone(b, { start: 0.075, dur: 0.15, f0: 620, shape: "sine", partials: [[1, 1], [2, 0.14]], gain: 0.5, envOpts: { attack: 0.006, tau: 0.1, release: 0.03 } });
  return b;
}

// Serie completada: check brillante, confiado.
function complete() {
  const b = buffer(0.16);
  tone(b, { start: 0, dur: 0.06, f0: 784, shape: "sine", partials: [[1, 1], [2, 0.3]], gain: 0.5, envOpts: { attack: 0.002, tau: 0.03, release: 0.008 } });
  tone(b, { start: 0.05, dur: 0.09, f0: 1175, shape: "sine", partials: [[1, 1], [2, 0.25]], gain: 0.5, envOpts: { attack: 0.002, tau: 0.045, release: 0.012 } });
  return b;
}

// Ejercicio completado: motivo de 3 notas, "logro" contenido.
function reward() {
  const b = buffer(0.36);
  const notes = [659, 880, 1319];
  notes.forEach((f, i) => {
    tone(b, {
      start: i * 0.075, dur: i === 2 ? 0.2 : 0.1, f0: f, shape: "sine",
      partials: [[1, 1], [2, 0.22]], gain: 0.46,
      envOpts: { attack: 0.003, tau: i === 2 ? 0.12 : 0.05, release: 0.02 },
    });
  });
  tone(b, { start: 0.15, dur: 0.2, f0: 2638, shape: "sine", gain: 0.1, envOpts: { attack: 0.04, tau: 0.12, release: 0.04 } });
  return b;
}

// Entrenamiento terminado: acorde mayor de victoria con cola.
function finishFx() {
  const b = buffer(0.72);
  const chord = [523, 659, 784, 1047];
  const add = (off, g, det) => chord.forEach((f) =>
    tone(b, { start: off, dur: 0.6, f0: f + det, shape: "sine", partials: [[1, 1], [2, 0.28], [3, 0.1]], gain: g, envOpts: { attack: 0.004, tau: 0.26, release: 0.06 } }));
  add(0, 0.34, 0);
  add(0.06, 0.16, 4); // copia retrasada y desafinada = ancho/cola
  tone(b, { start: 0, dur: 0.5, f0: 131, shape: "sine", gain: 0.4, envOpts: { attack: 0.004, tau: 0.3, release: 0.06 } });
  noiseBurst(b, { start: 0, dur: 0.04, cutoff: 0.85, gain: 0.12, envOpts: { attack: 0.001, tau: 0.02, release: 0.01 } });
  saturate(b, 1.5);
  return b;
}

// Advertencia / acción no permitida: doble golpe grave, discreto.
function warning() {
  const b = buffer(0.2);
  const hit = (st, dur) => {
    tone(b, { start: st, dur, f0: 190, shape: "sine", partials: [[1, 1], [2, 0.2]], gain: 0.5, envOpts: { attack: 0.003, tau: 0.04, release: 0.015 } });
    tone(b, { start: st, dur, f0: 190, shape: "square", gain: 0.12, envOpts: { attack: 0.003, tau: 0.03, release: 0.015 } });
  };
  hit(0, 0.055);
  hit(0.09, 0.07);
  return b;
}

console.log("Generando efectos en", OUT);
save("sfx_tap", tap());
save("sfx_countdown_enter", countdownEnter());
save("sfx_tick", tick());
save("sfx_tick_urgent", tickUrgent());
save("sfx_go", go());
save("sfx_start", start());
save("sfx_pause", pause());
save("sfx_resume", resume());
save("sfx_complete", complete());
save("sfx_reward", reward());
save("sfx_finish", finishFx());
save("sfx_warning", warning());
console.log("Listo.");
