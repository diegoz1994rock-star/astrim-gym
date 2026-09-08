/**
 * Genera los 2 efectos de sonido del control de acceso de ASTRIM GYM.
 * Salida: public/access_ok.wav (acceso concedido) y public/access_denied.wav
 * (denegado / error). Mono, 44.1 kHz, 16-bit. Síntesis procedural.
 *
 * Uso: node astrim-recepcion/scripts/gen-sfx.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 44100;
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(OUT, { recursive: true });

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const buffer = (s) => new Float32Array(Math.round(s * SR));

function env(i, len, { attack = 0.003, hold = 0, tau = 0.05, release = 0.008 } = {}) {
  const t = i / SR;
  const total = len / SR;
  const relStart = total - release;
  if (t < attack) return t / attack;
  if (t < attack + hold) return 1;
  if (t >= relStart) return Math.max(0, 1 - (t - relStart) / release) * Math.exp(-(relStart - attack - hold) / tau);
  return Math.exp(-(t - attack - hold) / tau);
}

function osc(phase, shape) {
  const p = phase - Math.floor(phase);
  if (shape === "tri") return 4 * Math.abs(p - 0.5) - 1;
  if (shape === "square") return p < 0.5 ? 1 : -1;
  if (shape === "saw") return 2 * p - 1;
  return Math.sin(2 * Math.PI * p);
}

function tone(buf, { start, dur, f0, f1 = null, shape = "sine", partials = [[1, 1]], gain = 0.5, envOpts = {} }) {
  const i0 = Math.round(start * SR);
  const n = Math.round(dur * SR);
  const phases = partials.map(() => 0);
  for (let i = 0; i < n; i++) {
    const idx = i0 + i;
    if (idx >= buf.length) break;
    const freq = f1 == null ? f0 : lerp(f0, f1, i / n);
    const e = env(i, n, envOpts);
    let s = 0;
    partials.forEach(([m, a], pi) => {
      phases[pi] += (freq * m) / SR;
      s += osc(phases[pi], shape) * a;
    });
    buf[idx] += s * e * gain;
  }
}

function noiseBurst(buf, { start, dur, cutoff = 0.5, gain = 0.3, envOpts = {} }) {
  const i0 = Math.round(start * SR);
  const n = Math.round(dur * SR);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const idx = i0 + i;
    if (idx >= buf.length) break;
    lp += cutoff * (Math.random() * 2 - 1 - lp);
    buf[idx] += lp * env(i, n, envOpts) * gain;
  }
}

function saturate(buf, amount = 1.4) {
  for (let i = 0; i < buf.length; i++) buf[i] = Math.tanh(buf[i] * amount) / Math.tanh(amount);
}

function finish(buf, peak = 0.9) {
  let max = 0;
  for (const v of buf) max = Math.max(max, Math.abs(v));
  if (max > 0) for (let i = 0; i < buf.length; i++) buf[i] *= peak / max;
  const fade = Math.round(0.004 * SR);
  for (let i = 0; i < fade; i++) {
    const g = i / fade;
    buf[i] *= g;
    buf[buf.length - 1 - i] *= g;
  }
}

function toWav(buf) {
  const data = Buffer.alloc(buf.length * 2);
  for (let i = 0; i < buf.length; i++) data.writeInt16LE(Math.round(clamp(buf[i], -1, 1) * 32767), i * 2);
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

function save(name, buf) {
  finish(buf);
  writeFileSync(join(OUT, `${name}.wav`), toWav(buf));
  console.log(`  ${name}.wav  (${(buf.length / SR * 1000).toFixed(0)} ms)`);
}

// ---- Acceso concedido: triada mayor ascendente, clara y acogedora. ----
function ok() {
  const b = buffer(0.42);
  const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
  notes.forEach((f, i) => {
    tone(b, {
      start: i * 0.075, dur: i === 2 ? 0.24 : 0.11, f0: f, shape: "sine",
      partials: [[1, 1], [2, 0.22], [3, 0.06]], gain: 0.5,
      envOpts: { attack: 0.004, tau: i === 2 ? 0.16 : 0.06, release: 0.02 },
    });
  });
  // brillo de octava sobre la última nota
  tone(b, { start: 0.16, dur: 0.22, f0: 1567.98, shape: "sine", gain: 0.12, envOpts: { attack: 0.05, tau: 0.14, release: 0.04 } });
  return b;
}

// ---- Acceso denegado / error: dos notas graves descendentes, firmes. ----
function denied() {
  const b = buffer(0.4);
  noiseBurst(b, { start: 0, dur: 0.03, cutoff: 0.4, gain: 0.1, envOpts: { attack: 0.001, tau: 0.015, release: 0.008 } });
  tone(b, {
    start: 0, dur: 0.13, f0: 220, shape: "square",
    partials: [[1, 1], [2, 0.3], [3, 0.12]], gain: 0.42,
    envOpts: { attack: 0.003, tau: 0.07, release: 0.02 },
  });
  tone(b, {
    start: 0.12, dur: 0.24, f0: 164.81, shape: "square",
    partials: [[1, 1], [2, 0.28], [3, 0.1]], gain: 0.44,
    envOpts: { attack: 0.003, tau: 0.13, release: 0.03 },
  });
  // capa sinusoidal para que no sea puro "buzz"
  tone(b, { start: 0, dur: 0.34, f0: 220, f1: 164.81, shape: "sine", gain: 0.3, envOpts: { attack: 0.004, tau: 0.16, release: 0.04 } });
  saturate(b, 1.3);
  return b;
}

console.log("Generando en", OUT);
save("access_ok", ok());
save("access_denied", denied());
console.log("Listo.");
