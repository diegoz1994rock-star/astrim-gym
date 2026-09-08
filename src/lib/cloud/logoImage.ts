import { loadImageBitmapFromPath } from "../services/photoService";

/**
 * Convierte el logo local del gimnasio (archivo elegido en Configuración,
 * `gyms.logo_path`) en un PNG/WebP pequeño codificado en base64, listo para
 * guardar en `gyms.logo_base64` y sincronizar a Firestore. NUNCA se sube el
 * archivo original ni se usa Firebase Storage: la app de clientes decodifica
 * este string.
 *
 * Salida: como máximo MAX_PX de lado mayor, fondo transparente, sin el
 * prefijo `data:image/...;base64,` (solo la carga útil).
 */
const MAX_PX = 128;

export async function buildOptimizedLogoBase64(logoPath: string): Promise<string> {
  const bitmap = await loadImageBitmapFromPath(logoPath);

  const scale = Math.min(1, MAX_PX / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar el lienzo del logo.");
  ctx.drawImage(bitmap, 0, 0, w, h);

  // WebP mantiene transparencia y pesa menos; ~5-15 KB a 128px.
  const dataUrl = canvas.toDataURL("image/webp", 0.85);
  const comma = dataUrl.indexOf(",");
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}
