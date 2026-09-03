/**
 * La URL de video se guarda tal cual la escribe el administrador (fuente de
 * verdad para la futura app móvil). Solo se restringe el esquema a
 * http/https: nunca se acepta `javascript:`, `data:` ni similares, ya que
 * esta URL puede terminar abriéndose directamente (ver ExerciseDetailModal).
 */
export function isValidVideoUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export type VideoEmbedKind = "youtube" | "direct" | "none";

export interface VideoEmbed {
  kind: VideoEmbedKind;
  /** URL lista para usar en <iframe> (youtube) o <video> (direct). Null si no es embebible. */
  embedUrl: string | null;
}

const DIRECT_VIDEO_EXTENSIONS = [".mp4", ".webm", ".ogg", ".ogv", ".mov"];

/**
 * Detecta proveedores conocidos para ofrecer una vista previa embebida.
 * Cualquier otra URL (Vimeo, páginas genéricas, etc.) devuelve "none": no es
 * un error, simplemente no se embebe y la interfaz debe ofrecer solo el
 * botón "Ver video" con la URL original — nunca un iframe roto.
 */
export function resolveVideoEmbed(url: string | null | undefined): VideoEmbed {
  if (!url || !isValidVideoUrl(url)) return { kind: "none", embedUrl: null };

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return { kind: "none", embedUrl: null };
  }

  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtube.com" || host === "m.youtube.com") {
    const videoId = parsed.searchParams.get("v");
    if (videoId) {
      return { kind: "youtube", embedUrl: `https://www.youtube.com/embed/${videoId}` };
    }
    const shortsMatch = parsed.pathname.match(/^\/shorts\/([^/?]+)/);
    if (shortsMatch) {
      return { kind: "youtube", embedUrl: `https://www.youtube.com/embed/${shortsMatch[1]}` };
    }
    return { kind: "none", embedUrl: null };
  }

  if (host === "youtu.be") {
    const id = parsed.pathname.replace(/^\//, "");
    if (id) return { kind: "youtube", embedUrl: `https://www.youtube.com/embed/${id}` };
    return { kind: "none", embedUrl: null };
  }

  const pathLower = parsed.pathname.toLowerCase();
  if (DIRECT_VIDEO_EXTENSIONS.some((ext) => pathLower.endsWith(ext))) {
    return { kind: "direct", embedUrl: parsed.toString() };
  }

  return { kind: "none", embedUrl: null };
}
