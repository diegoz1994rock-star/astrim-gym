import { describe, expect, it } from "vitest";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  clampPan,
  clampZoom,
  computeCoverScale,
  computeSourceCropRect,
  normalizeRotation,
  rotatedDimensions,
} from "./imageCrop";

const FRAME_3_4 = { width: 300, height: 400 }; // 3:4

describe("computeCoverScale", () => {
  it("5/6. imagen vertical: el ancho es el eje limitante", () => {
    // imagen 1200x2000 (más alargada que el marco 3:4) -> el alto sobra, el ancho manda
    const scale = computeCoverScale({ width: 1200, height: 2000 }, FRAME_3_4);
    expect(scale).toBeCloseTo(300 / 1200);
    // a esa escala, el alto de la imagen cubre de sobra el marco
    expect(2000 * scale).toBeGreaterThanOrEqual(FRAME_3_4.height);
  });

  it("5. imagen horizontal: el alto es el eje limitante", () => {
    const scale = computeCoverScale({ width: 2000, height: 1200 }, FRAME_3_4);
    expect(scale).toBeCloseTo(400 / 1200);
    expect(2000 * scale).toBeGreaterThanOrEqual(FRAME_3_4.width);
  });

  it("7. imagen cuadrada también cubre el marco sin espacios", () => {
    const image = { width: 1000, height: 1000 };
    const scale = computeCoverScale(image, FRAME_3_4);
    expect(image.width * scale).toBeGreaterThanOrEqual(FRAME_3_4.width - 0.001);
    expect(image.height * scale).toBeGreaterThanOrEqual(FRAME_3_4.height - 0.001);
  });

  it("8. imagen muy grande (8000x12000) calcula una escala válida y finita", () => {
    const scale = computeCoverScale({ width: 8000, height: 12000 }, FRAME_3_4);
    expect(Number.isFinite(scale)).toBe(true);
    expect(scale).toBeGreaterThan(0);
  });
});

describe("clampZoom", () => {
  it("no permite bajar de 1 (equivalente a cover)", () => {
    expect(clampZoom(0.2)).toBe(MIN_ZOOM);
  });

  it("no permite superar el máximo", () => {
    expect(clampZoom(999)).toBe(MAX_ZOOM);
  });

  it("valores dentro de rango se mantienen", () => {
    expect(clampZoom(2)).toBe(2);
  });
});

describe("clampPan — 17. nunca deja espacios vacíos dentro del marco", () => {
  it("con zoom mínimo (cover), el único pan válido es (0,0) en el eje limitante", () => {
    const image = { width: 1200, height: 2000 };
    const scale = computeCoverScale(image, FRAME_3_4); // ancho limitante
    const pan = clampPan({ x: 500, y: 500 }, image, FRAME_3_4, scale);
    // el ancho de la imagen escalada es exactamente igual al marco -> pan.x fijo en 0
    expect(pan.x).toBeCloseTo(0);
    // el alto sobra: el pan.y debe quedar dentro de [frame.height - dispH, 0]
    const dispH = image.height * scale;
    expect(pan.y).toBeLessThanOrEqual(0);
    expect(pan.y).toBeGreaterThanOrEqual(FRAME_3_4.height - dispH);
  });

  it("no permite pan positivo más allá del borde superior/izquierdo (dejaría hueco)", () => {
    const image = { width: 1200, height: 2000 };
    const scale = computeCoverScale(image, FRAME_3_4);
    const pan = clampPan({ x: 9999, y: 9999 }, image, FRAME_3_4, scale);
    expect(pan.x).toBeLessThanOrEqual(0);
    expect(pan.y).toBeLessThanOrEqual(0);
  });

  it("no permite pan negativo excesivo (dejaría hueco en el borde opuesto)", () => {
    const image = { width: 1200, height: 2000 };
    const scale = computeCoverScale(image, FRAME_3_4);
    const pan = clampPan({ x: -9999, y: -9999 }, image, FRAME_3_4, scale);
    const dispW = image.width * scale;
    const dispH = image.height * scale;
    expect(pan.x).toBeGreaterThanOrEqual(FRAME_3_4.width - dispW - 0.001);
    expect(pan.y).toBeGreaterThanOrEqual(FRAME_3_4.height - dispH - 0.001);
  });

  it("15. simula un arrastre (mover) dentro de rango: el valor no se altera", () => {
    const image = { width: 1200, height: 2000 };
    const scale = computeCoverScale(image, FRAME_3_4);
    const dispH = image.height * scale;
    const validY = (FRAME_3_4.height - dispH) / 2; // punto medio del rango válido
    const pan = clampPan({ x: 0, y: validY }, image, FRAME_3_4, scale);
    expect(pan.y).toBeCloseTo(validY);
  });

  it("16. zoom in (escala mayor) sigue sin dejar huecos", () => {
    const image = { width: 1200, height: 2000 };
    const baseScale = computeCoverScale(image, FRAME_3_4);
    const zoomedScale = baseScale * 2;
    const pan = clampPan({ x: 100, y: 100 }, image, FRAME_3_4, zoomedScale);
    const dispW = image.width * zoomedScale;
    const dispH = image.height * zoomedScale;
    expect(pan.x).toBeLessThanOrEqual(0);
    expect(pan.y).toBeLessThanOrEqual(0);
    expect(pan.x).toBeGreaterThanOrEqual(FRAME_3_4.width - dispW - 0.001);
    expect(pan.y).toBeGreaterThanOrEqual(FRAME_3_4.height - dispH - 0.001);
  });
});

describe("computeSourceCropRect — 9. el recorte resultante siempre respeta la proporción 3:4 del marco", () => {
  it("el rectángulo de recorte tiene la misma proporción que el marco", () => {
    const image = { width: 1200, height: 2000 };
    const scale = computeCoverScale(image, FRAME_3_4) * 1.5;
    const pan = clampPan({ x: -50, y: -50 }, image, FRAME_3_4, scale);
    const rect = computeSourceCropRect(pan, image, FRAME_3_4, scale);
    expect(rect.sWidth / rect.sHeight).toBeCloseTo(FRAME_3_4.width / FRAME_3_4.height, 3);
  });

  it("el rectángulo de recorte nunca se sale de los límites de la imagen fuente", () => {
    const image = { width: 1200, height: 2000 };
    const scale = computeCoverScale(image, FRAME_3_4);
    const pan = clampPan({ x: 0, y: 0 }, image, FRAME_3_4, scale);
    const rect = computeSourceCropRect(pan, image, FRAME_3_4, scale);
    expect(rect.sx).toBeGreaterThanOrEqual(0);
    expect(rect.sy).toBeGreaterThanOrEqual(0);
    expect(rect.sx + rect.sWidth).toBeLessThanOrEqual(image.width + 0.001);
    expect(rect.sy + rect.sHeight).toBeLessThanOrEqual(image.height + 0.001);
  });
});

describe("rotatedDimensions", () => {
  it("6/8. rotación de 90° intercambia ancho y alto", () => {
    expect(rotatedDimensions({ width: 400, height: 300 }, 90)).toEqual({ width: 300, height: 400 });
  });

  it("rotación de 270° también intercambia ancho y alto", () => {
    expect(rotatedDimensions({ width: 400, height: 300 }, 270)).toEqual({ width: 300, height: 400 });
  });

  it("rotación de 0° o 180° conserva las dimensiones", () => {
    expect(rotatedDimensions({ width: 400, height: 300 }, 0)).toEqual({ width: 400, height: 300 });
    expect(rotatedDimensions({ width: 400, height: 300 }, 180)).toEqual({ width: 400, height: 300 });
  });
});

describe("normalizeRotation", () => {
  it("mantiene el rango [0, 360)", () => {
    expect(normalizeRotation(90)).toBe(90);
    expect(normalizeRotation(360)).toBe(0);
    expect(normalizeRotation(450)).toBe(90);
    expect(normalizeRotation(-90)).toBe(270);
  });
});
