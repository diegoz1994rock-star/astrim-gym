import { open } from "@tauri-apps/plugin-dialog";
import { mkdir, writeFile } from "@tauri-apps/plugin-fs";
import { BaseDirectory, appLocalDataDir, join } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";
import { normalizeRotation, type CropRect } from "@/lib/domain/imageCrop";

/**
 * Fase 1 (Configuración/Entrenadores): solo se guarda la ruta local del
 * archivo elegido, sin procesar. NO tocar esta función: Configuración y
 * Entrenadores siguen dependiendo exactamente de este comportamiento. El
 * editor con recorte/compresión (más abajo) es exclusivo de Clientes por
 * ahora — ver imageCrop.ts y ImageCropperModal.
 */
export async function pickPersonPhoto(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "Imágenes", extensions: ["png", "jpg", "jpeg", "webp"] }],
  });

  if (!selected || Array.isArray(selected)) return null;
  return selected;
}

// ---------------------------------------------------------------------
// Editor y compresor de fotografías (Clientes)
// ---------------------------------------------------------------------

export class InvalidImageFileError extends Error {}
export class UnsupportedImageFormatError extends Error {}

/** Lista amplia a propósito: no limitar el selector solo a JPG. La validación real ocurre al decodificar. */
const IMAGE_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "bmp",
  "tiff",
  "tif",
  "heic",
  "heif",
];

export async function pickImageForCropping(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "Imágenes", extensions: IMAGE_EXTENSIONS }],
  });

  if (!selected || Array.isArray(selected)) return null;
  return selected;
}

/**
 * Decodifica el archivo local elegido aplicando la corrección de
 * orientación EXIF automáticamente (imageOrientation: "from-image", ya
 * soportado por WebKit y Chromium). Nunca se guarda ni se envía la imagen
 * completa: esta es solo la fuente en memoria para el editor.
 */
export async function loadImageBitmapFromPath(path: string): Promise<ImageBitmap> {
  let blob: Blob;
  try {
    const response = await fetch(convertFileSrc(path));
    if (!response.ok) throw new Error("read-failed");
    blob = await response.blob();
    if (blob.size === 0) throw new Error("empty-file");
  } catch {
    throw new InvalidImageFileError("El archivo seleccionado no es una imagen válida.");
  }

  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    throw new UnsupportedImageFormatError("Este formato de imagen no es compatible.");
  }
}

/**
 * Redibuja la imagen ya orientada en un <canvas> rotado en incrementos de
 * 90°, para no tener que arrastrar la rotación por toda la matemática de
 * pan/zoom del editor (ver imageCrop.ts): el resto del editor trata este
 * canvas como si fuera "la" imagen fuente.
 */
export function rotateToCanvas(bitmap: ImageBitmap, rotationDeg: number): HTMLCanvasElement {
  const normalized = normalizeRotation(rotationDeg);
  const swapped = normalized === 90 || normalized === 270;

  const canvas = document.createElement("canvas");
  canvas.width = swapped ? bitmap.height : bitmap.width;
  canvas.height = swapped ? bitmap.width : bitmap.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar el lienzo de edición.");

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((normalized * Math.PI) / 180);
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  ctx.restore();

  return canvas;
}

export interface CropExportOptions {
  outputWidth: number;
  outputHeight: number;
  /** 0 a 1 (ej. 0.82 = 82%). */
  quality: number;
}

/**
 * Genera la imagen final: SIEMPRE JPEG, SIEMPRE outputWidth x outputHeight,
 * con fondo blanco de base (evita transparencia negra si el origen era un
 * PNG con canal alfa). canvas.toBlob para "image/jpeg" ya descarta
 * cualquier metadata EXIF/GPS del original: el resultado es una imagen
 * rasterizada nueva, sin metadata heredada.
 */
export function exportCroppedJpeg(
  source: CanvasImageSource,
  rect: CropRect,
  options: CropExportOptions,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = options.outputWidth;
  canvas.height = options.outputHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("No se pudo preparar el lienzo de exportación."));

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    source,
    rect.sx,
    rect.sy,
    rect.sWidth,
    rect.sHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo generar la imagen final."))),
      "image/jpeg",
      options.quality,
    );
  });
}

function safeFileNamePrefix(prefix: string): string {
  const cleaned = prefix.trim().replace(/[^a-zA-Z0-9_-]+/g, "_");
  return cleaned || "photo";
}

const PHOTOS_SUBDIR = "photos";

/**
 * Guarda el JPEG ya optimizado en el directorio local de datos de la app
 * (no en una carpeta elegida por el usuario) y devuelve la ruta absoluta
 * para usar con convertFileSrc, igual que el resto de fotos de la app.
 * Nunca se guarda el archivo original: solo llega aquí el resultado del
 * recorte/compresión.
 */
export async function saveOptimizedPhoto(blob: Blob, filenamePrefix: string): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const fileName = `${safeFileNamePrefix(filenamePrefix)}_${Date.now()}.jpg`;

  await mkdir(PHOTOS_SUBDIR, { baseDir: BaseDirectory.AppLocalData, recursive: true });
  await writeFile(`${PHOTOS_SUBDIR}/${fileName}`, bytes, { baseDir: BaseDirectory.AppLocalData });

  const baseDir = await appLocalDataDir();
  return join(baseDir, PHOTOS_SUBDIR, fileName);
}
