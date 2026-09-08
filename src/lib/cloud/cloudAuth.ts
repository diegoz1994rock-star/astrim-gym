import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { getCloudAuth } from "./firebase";

/**
 * Sesión de Firebase Auth del PANEL. La usa el dueño/administrador del
 * gimnasio para autorizar las escrituras a Firestore (ver
 * `firestore.rules`: solo un usuario con `userIndex.role == 'ADMIN'` puede
 * escribir en `gyms/{suGym}` y `clients/*` de su gimnasio).
 *
 * No hay manejo manual de tokens ni de refresh: el SDK de Firebase
 * persiste la sesión (IndexedDB) y la renueva solo. Tampoco hay service
 * account: es una cuenta email/contraseña normal.
 */
export async function signInGymOwner(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(getCloudAuth(), email.trim(), password);
  return cred.user;
}

export async function signOutCloud(): Promise<void> {
  await signOut(getCloudAuth());
}

export function currentCloudUser(): User | null {
  return getCloudAuth().currentUser;
}

export function onCloudAuthChanged(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(getCloudAuth(), cb);
}
