import { doc, writeBatch } from "firebase/firestore";
import { getDb } from "../db/client";
import { getCloudDb } from "./firebase";
import { currentCloudUser } from "./cloudAuth";
import { mapRowToData, type Row } from "./mappers";

/**
 * Sube la biblioteca GLOBAL de ejercicios (`exercises.gym_id IS NULL`, ~200
 * filas con instrucciones) a la colección top-level compartida
 * `exerciseLibrary/{id}`, legible por cualquier usuario autenticado. Se
 * corre una vez, y de nuevo solo si cambia el catálogo global. Idempotente:
 * `setDoc` reemplaza.
 *
 * No pasa por el outbox porque no es data por-gimnasio: es un catálogo
 * común que el panel administra (y que en el futuro mantendrá un
 * superadmin).
 */
export class SeedError extends Error {}

export async function seedExerciseLibrary(): Promise<{ count: number }> {
  if (!currentCloudUser()) {
    throw new SeedError("Inicia sesión con la cuenta de la nube del gimnasio primero.");
  }

  const db = await getDb();
  const rows = await db.select<Row[]>(`SELECT * FROM exercises WHERE gym_id IS NULL`);
  const cloud = getCloudDb();

  const CHUNK = 400; // límite de Firestore: 500 ops por batch
  let count = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = writeBatch(cloud);
    for (const row of rows.slice(i, i + CHUNK)) {
      const id = String(row.id);
      const data = mapRowToData("exercises", row);
      delete (data as Record<string, unknown>).gymId; // global, no pertenece a un gimnasio
      batch.set(doc(cloud, "exerciseLibrary", id), data);
      count += 1;
    }
    await batch.commit();
  }
  return { count };
}
