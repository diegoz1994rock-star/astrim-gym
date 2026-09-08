export interface EnrolledFace {
  clientId: string;
  embedding: number[];
}

export interface FaceMatch {
  clientId: string;
  distance: number;
}

/**
 * Umbral para aceptar una coincidencia. face-api recomienda 0.6; acá se usa
 * 0.56, un poco más estricto para evitar falsos positivos pero sin dejar de
 * reconocer al mismo cliente con otra cámara / iluminación (con 0.5 pasaba
 * eso). El código de 6 dígitos sigue siendo el respaldo.
 */
export const DEFAULT_FACE_MATCH_THRESHOLD = 0.56;

/** Distancia euclídea entre dos embeddings del mismo espacio (128 floats). */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return Number.POSITIVE_INFINITY;
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Compara un embedding candidato contra todos los rostros enrolados y
 * devuelve el más cercano, pero solo si su distancia está estrictamente
 * por debajo del umbral. Nunca "elige el menos malo": si el mejor
 * candidato no cumple el umbral, no hay coincidencia.
 */
export function findBestMatch(
  candidate: number[],
  enrolled: EnrolledFace[],
  threshold: number = DEFAULT_FACE_MATCH_THRESHOLD,
): FaceMatch | null {
  let best: FaceMatch | null = null;
  for (const face of enrolled) {
    const distance = euclideanDistance(candidate, face.embedding);
    if (best === null || distance < best.distance) {
      best = { clientId: face.clientId, distance };
    }
  }
  if (best === null || best.distance >= threshold) return null;
  return best;
}
