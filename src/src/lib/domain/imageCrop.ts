/**
 * Matemática pura del editor de recorte de fotografías (sin DOM/canvas, por
 * eso es 100% testeable). El resto del proceso (decodificar la imagen,
 * dibujar en <canvas>, exportar a JPEG) vive en photoService.ts, que sí
 * depende del navegador/WebView.
 *
 * Convención de coordenadas: el "marco" (frame) es el área fija de recorte
 * que ve el usuario, con la proporción deseada (ej. 3:4). La imagen se
 * dibuja dentro de ese marco con una escala y un desplazamiento (pan); el
 * pan siempre se expresa como la posición de la esquina superior izquierda
 * de la imagen respecto a la esquina superior izquierda del marco.
 */

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Escala mínima a la que la imagen, dibujada dentro del marco, lo cubre
 * completamente sin dejar espacios vacíos (equivalente a CSS `object-fit:
 * cover`). zoom=1 corresponde exactamente a esta escala.
 */
export function computeCoverScale(image: Size, frame: Size): number {
  if (image.width <= 0 || image.height <= 0) return 1;
  return Math.max(frame.width / image.width, frame.height / image.height);
}

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return MIN_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/**
 * Garantiza que la imagen (ya escalada) siempre cubra el marco por
 * completo: el borde de la imagen nunca puede quedar dentro del marco
 * dejando un espacio vacío. Esta es la única función responsable de
 * cumplir la regla "el marco siempre debe estar cubierto".
 */
export function clampPan(pan: Point, image: Size, frame: Size, effectiveScale: number): Point {
  const dispW = image.width * effectiveScale;
  const dispH = image.height * effectiveScale;

  // Si la imagen escalada es más chica que el marco en algún eje (no
  // debería ocurrir si effectiveScale >= coverScale, pero por seguridad
  // ante errores de redondeo se centra en ese eje).
  const minX = Math.min(0, frame.width - dispW);
  const maxX = Math.max(0, frame.width - dispW);
  const minY = Math.min(0, frame.height - dispH);
  const maxY = Math.max(0, frame.height - dispH);

  return {
    x: Math.min(maxX, Math.max(minX, pan.x)),
    y: Math.min(maxY, Math.max(minY, pan.y)),
  };
}

export interface CropRect {
  sx: number;
  sy: number;
  sWidth: number;
  sHeight: number;
}

/**
 * Traduce el estado visual (pan + zoom) al rectángulo de recorte en el
 * espacio de píxeles de la imagen fuente (ya rotada si corresponde).
 */
export function computeSourceCropRect(
  pan: Point,
  image: Size,
  frame: Size,
  effectiveScale: number,
): CropRect {
  const sx = -pan.x / effectiveScale;
  const sy = -pan.y / effectiveScale;
  const sWidth = frame.width / effectiveScale;
  const sHeight = frame.height / effectiveScale;

  // Recorte defensivo por si el redondeo de punto flotante deja el
  // rectángulo apenas fuera de los límites reales de la imagen.
  return {
    sx: Math.max(0, Math.min(sx, image.width - sWidth)),
    sy: Math.max(0, Math.min(sy, image.height - sHeight)),
    sWidth: Math.min(sWidth, image.width),
    sHeight: Math.min(sHeight, image.height),
  };
}

/** Dimensiones efectivas de la imagen tras rotarla en incrementos de 90°. */
export function rotatedDimensions(image: Size, rotationDeg: number): Size {
  const normalized = ((rotationDeg % 360) + 360) % 360;
  return normalized === 90 || normalized === 270
    ? { width: image.height, height: image.width }
    : { width: image.width, height: image.height };
}

export function normalizeRotation(rotationDeg: number): number {
  return ((rotationDeg % 360) + 360) % 360;
}
