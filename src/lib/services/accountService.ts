import bcrypt from "bcryptjs";
import { signInWithEmailAndPassword, updatePassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { findUserByEmail, updateUserPassword } from "../repositories/authRepository";
import { getCloudAuth, getCloudDb, isCloudConfigured } from "../cloud/firebase";

export class WrongCurrentPasswordError extends Error {}
export class WeakPasswordError extends Error {}

/**
 * Cambio de contraseña del dueño desde el panel (Configuración → General).
 *
 * La fuente de verdad del login es Firebase Auth, así que primero se
 * actualiza ahí (previa verificación de la contraseña actual con un
 * sign-in). Después se refresca el hash local para que el login offline
 * siga funcionando con la contraseña nueva.
 *
 * Si la cuenta no existe en la nube (instalación puramente local), se
 * valida y cambia solo el hash local.
 */
export async function changePassword(
  email: string,
  currentPassword: string,
  newPassword: string,
  gymId?: string | null,
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();

  if (newPassword.length < 6) {
    throw new WeakPasswordError("La nueva contraseña debe tener al menos 6 caracteres.");
  }
  if (newPassword === currentPassword) {
    throw new Error("La nueva contraseña no puede ser igual a la actual.");
  }

  const localUser = await findUserByEmail(normalizedEmail);
  let verifiedInCloud = false;

  if (isCloudConfigured) {
    try {
      const cred = await signInWithEmailAndPassword(getCloudAuth(), normalizedEmail, currentPassword);
      await updatePassword(cred.user, newPassword);
      verifiedInCloud = true;
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
        throw new WrongCurrentPasswordError("La contraseña actual es incorrecta.");
      }
      if (code === "auth/weak-password") {
        throw new WeakPasswordError("La nueva contraseña es muy débil. Probá con una más larga.");
      }
      if (code === "auth/network-request-failed") {
        throw new Error("Sin conexión. Necesitás internet para cambiar la contraseña.");
      }
      if (code === "auth/too-many-requests") {
        throw new Error("Demasiados intentos. Esperá unos minutos e intentá de nuevo.");
      }
      // auth/user-not-found: no hay cuenta en la nube -> solo cambio local (abajo).
      if (code !== "auth/user-not-found") {
        throw new Error("No se pudo cambiar la contraseña en la nube: " + (code || "error"));
      }
    }
  }

  if (!verifiedInCloud) {
    if (!localUser || !bcrypt.compareSync(currentPassword, localUser.password_hash)) {
      throw new WrongCurrentPasswordError("La contraseña actual es incorrecta.");
    }
  }

  if (localUser) {
    await updateUserPassword(localUser.id, newPassword);
  }

  // Refleja la contraseña nueva en la consola de operador. El dueño puede
  // escribir este doc pero no leerlo (ver firestore.rules → gymCredentials).
  // No es crítico: si falla, el cambio de contraseña ya quedó hecho.
  if (verifiedInCloud && gymId) {
    try {
      await setDoc(
        doc(getCloudDb(), "gymCredentials", gymId),
        {
          password: newPassword,
          ownerEmail: normalizedEmail,
          updatedBy: "owner",
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch {
      /* la consola quedará mostrando la clave anterior hasta el próximo cambio */
    }
  }
}
