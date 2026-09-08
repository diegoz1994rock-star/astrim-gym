import bcrypt from "bcryptjs";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import {
  findUserByEmail,
  touchLastLogin,
  updateUserPassword,
  upsertCloudAdminUser,
} from "../repositories/authRepository";
import {
  findGymById,
  updateGymLicense,
  upsertGymFromCloud,
} from "../repositories/gymRepository";
import { getCloudAuth, getCloudDb, isCloudConfigured } from "../cloud/firebase";
import type { AuthUser } from "@/types/auth";
import type { LicenseStatus } from "@/types/db";

export class InvalidCredentialsError extends Error {}
export class AccountInactiveError extends Error {}
export class GymSuspendedError extends Error {}
export class GymNotLinkedError extends Error {}

/** Fecha de hoy en formato YYYY-MM-DD, hora local (comparable con licenseExpiresAt). */
function todayISO(): string {
  return new Date().toLocaleDateString("en-CA");
}

function isExpired(expiresAt: string | null | undefined): boolean {
  return typeof expiresAt === "string" && expiresAt.length === 10 && expiresAt < todayISO();
}

interface CloudGym {
  name: string;
  licenseStatus: LicenseStatus;
  licenseExpiresAt: string | null;
}

/** SUSPENDED en la nube -> SUSPENDED local; cualquier otro valor -> ACTIVE. */
function mapCloudLicenseStatus(raw: unknown): LicenseStatus {
  return raw === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
}

async function fetchCloudGym(gymId: string): Promise<CloudGym | null> {
  const snap = await getDoc(doc(getCloudDb(), "gyms", gymId));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    name: typeof d.name === "string" ? d.name : "",
    licenseStatus: mapCloudLicenseStatus(d.licenseStatus),
    licenseExpiresAt: typeof d.licenseExpiresAt === "string" ? d.licenseExpiresAt : null,
  };
}

/**
 * Mantiene viva la sesión de Firebase del dueño (la usa el worker de sync y
 * la lectura de licencia) y refresca el estado de licencia local desde la
 * nube. Todo best-effort: si no hay internet o la cuenta cloud no coincide,
 * se sigue con lo último conocido.
 */
async function syncCloudSession(email: string, password: string, gymId: string): Promise<void> {
  if (!isCloudConfigured) return;
  try {
    if (!getCloudAuth().currentUser) {
      await signInWithEmailAndPassword(getCloudAuth(), email.trim(), password);
    }
    const cloudGym = await fetchCloudGym(gymId);
    if (cloudGym) {
      await updateGymLicense(gymId, cloudGym.licenseStatus, cloudGym.licenseExpiresAt);
    }
  } catch {
    /* offline / cuenta cloud distinta: se usa la licencia cacheada */
  }
}

/** Refresca el estado de licencia local desde la nube. Best-effort. */
async function refreshLocalLicense(gymId: string): Promise<void> {
  try {
    const cloudGym = await fetchCloudGym(gymId);
    if (cloudGym) {
      await updateGymLicense(gymId, cloudGym.licenseStatus, cloudGym.licenseExpiresAt);
    }
  } catch {
    /* offline: se usa la licencia cacheada */
  }
}

/**
 * Espeja la contraseña con la que el dueño acaba de entrar en la consola de
 * operador (colección `gymCredentials`). Así, si la cambió por el enlace de
 * "olvidé mi contraseña", la consola deja de mostrar la vieja. El dueño puede
 * escribir este doc pero no leerlo (ver firestore.rules). Best-effort.
 */
async function mirrorPasswordToCloudCredentials(
  gymId: string | null,
  email: string,
  password: string,
): Promise<void> {
  if (!gymId || !isCloudConfigured) return;
  try {
    await setDoc(
      doc(getCloudDb(), "gymCredentials", gymId),
      { password, ownerEmail: email, updatedBy: "owner", updatedAt: serverTimestamp() },
      { merge: true },
    );
  } catch {
    /* la consola mostrará la clave anterior hasta el próximo login/cambio */
  }
}

type OwnerCloudOutcome = "cloud-ok" | "offline";

/**
 * Verifica la contraseña de un dueño contra Firebase Auth (la fuente de
 * verdad). Si la nube la rechaza pero el hash local sí coincidía, significa
 * que el dueño la cambió en la nube: se invalida el hash local para que la
 * contraseña vieja deje de servir. Si no hay internet, devuelve "offline" y
 * el login cae a la verificación local.
 */
async function verifyOwnerAgainstCloud(
  userId: string,
  email: string,
  password: string,
  localHash: string,
): Promise<OwnerCloudOutcome> {
  try {
    await signInWithEmailAndPassword(getCloudAuth(), email, password);
    return "cloud-ok";
  } catch (e) {
    const code = (e as { code?: string })?.code;
    const isCredError =
      code === "auth/invalid-credential" ||
      code === "auth/wrong-password" ||
      code === "auth/user-not-found" ||
      code === "auth/invalid-email";
    if (isCredError) {
      if (bcrypt.compareSync(password, localHash)) {
        await updateUserPassword(userId, `invalidated_${crypto.randomUUID()}`);
      }
      throw new InvalidCredentialsError(friendlyFirebaseAuthError(code));
    }
    if (code === "auth/too-many-requests") {
      throw new InvalidCredentialsError(friendlyFirebaseAuthError(code));
    }
    return "offline";
  }
}

function friendlyFirebaseAuthError(code: string | undefined): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Correo o contraseña incorrectos.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Esperá unos minutos e intentá de nuevo.";
    case "auth/network-request-failed":
      return "No se pudo conectar. Revisá tu conexión a internet.";
    default:
      return "Correo o contraseña incorrectos.";
  }
}

async function loginViaCloud(email: string, password: string): Promise<{
  userId: string;
  gymId: string;
  name: string;
}> {
  if (!isCloudConfigured) {
    throw new InvalidCredentialsError("Correo o contraseña incorrectos.");
  }

  let uid: string;
  try {
    const cred = await signInWithEmailAndPassword(getCloudAuth(), email.trim(), password);
    uid = cred.user.uid;
  } catch (e) {
    const code = (e as { code?: string })?.code;
    throw new InvalidCredentialsError(friendlyFirebaseAuthError(code));
  }

  const idxSnap = await getDoc(doc(getCloudDb(), "userIndex", uid));
  if (!idxSnap.exists()) {
    throw new GymNotLinkedError(
      "Tu cuenta todavía no está vinculada a un gimnasio. Contactá a soporte de ASTRIM GYM.",
    );
  }
  const idxData = idxSnap.data();
  if (idxData.role !== "ADMIN" || typeof idxData.gymId !== "string") {
    throw new GymNotLinkedError(
      "Esta cuenta no es de administrador de un gimnasio.",
    );
  }
  const gymId: string = idxData.gymId;

  const cloudGym = await fetchCloudGym(gymId);
  if (!cloudGym) {
    throw new GymNotLinkedError(
      "No encontramos los datos de tu gimnasio. Contactá a soporte de ASTRIM GYM.",
    );
  }

  await upsertGymFromCloud(gymId, cloudGym.name, cloudGym.licenseStatus, cloudGym.licenseExpiresAt);
  const userId = await upsertCloudAdminUser(gymId, email, password);

  return { userId, gymId, name: email.split("@")[0] || email };
}

/**
 * "¿Olvidaste tu contraseña?" — manda el correo de restablecimiento de
 * Firebase. Firebase envía el enlace y hospeda la página donde el dueño pone
 * la nueva; el operador no hace nada. Con la protección de enumeración
 * activada, un correo inexistente igual resuelve OK (no revela si existe).
 * Al cambiarla, el próximo login del panel entra por la nube y re-sincroniza
 * el hash local automáticamente.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
    throw new Error("Escribí un correo válido en el campo de arriba.");
  }
  if (!isCloudConfigured) {
    throw new Error(
      "Este equipo no tiene la nube configurada, así que no se puede restablecer por correo.",
    );
  }
  try {
    await sendPasswordResetEmail(getCloudAuth(), normalizedEmail);
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === "auth/user-not-found") return; // no revelar si existe o no
    if (code === "auth/invalid-email") throw new Error("El correo no es válido.");
    if (code === "auth/too-many-requests") {
      throw new Error("Demasiados intentos. Esperá unos minutos e intentá de nuevo.");
    }
    if (code === "auth/network-request-failed") {
      throw new Error("Sin conexión. Necesitás internet para restablecer la contraseña.");
    }
    throw new Error("No se pudo enviar el correo de restablecimiento.");
  }
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const normalizedEmail = email.trim().toLowerCase();
  const localUser = await findUserByEmail(normalizedEmail);

  let userId: string;
  let gymId: string | null;
  let name: string;
  let role: AuthUser["role"];

  if (localUser) {
    if (localUser.status !== "ACTIVE") {
      throw new AccountInactiveError("Esta cuenta está inactiva. Contacta al administrador.");
    }

    const ownerGymId = localUser.gym_id;
    const isCloudOwner = localUser.role === "ADMIN" && !!ownerGymId && isCloudConfigured;

    if (isCloudOwner && ownerGymId) {
      // Dueño de gimnasio con nube: Firebase Auth manda. Si cambió la
      // contraseña por el enlace de "olvidé mi contraseña", la nueva
      // funciona al instante y la vieja deja de servir. Sin internet se
      // cae a la verificación local.
      const outcome = await verifyOwnerAgainstCloud(
        localUser.id,
        normalizedEmail,
        password,
        localUser.password_hash,
      );
      if (outcome === "cloud-ok") {
        await updateUserPassword(localUser.id, password);
        await mirrorPasswordToCloudCredentials(ownerGymId, normalizedEmail, password);
        await refreshLocalLicense(ownerGymId);
      } else if (!bcrypt.compareSync(password, localUser.password_hash)) {
        throw new InvalidCredentialsError("Correo o contraseña incorrectos.");
      }
    } else {
      if (!bcrypt.compareSync(password, localUser.password_hash)) {
        throw new InvalidCredentialsError("Correo o contraseña incorrectos.");
      }
      if (ownerGymId) await syncCloudSession(normalizedEmail, password, ownerGymId);
    }

    userId = localUser.id;
    gymId = localUser.gym_id;
    name = localUser.name;
    role = localUser.role;
  } else {
    // Sin usuario local: primer login del dueño contra Firebase.
    const viaCloud = await loginViaCloud(normalizedEmail, password);
    userId = viaCloud.userId;
    gymId = viaCloud.gymId;
    name = viaCloud.name;
    role = "ADMIN";
    await mirrorPasswordToCloudCredentials(viaCloud.gymId, normalizedEmail, password);
  }

  // El SUPERADMIN no pertenece a ningún gimnasio; el resto pasa por el
  // chequeo de licencia (estado + vencimiento).
  let gymName: string | null = null;
  let gymLogoPath: string | null = null;
  if (gymId) {
    const gym = await findGymById(gymId);
    if (!gym) {
      throw new GymNotLinkedError("No encontramos tu gimnasio. Contactá a soporte de ASTRIM GYM.");
    }
    if (gym.license_status === "SUSPENDED" || gym.license_status === "CANCELLED") {
      throw new GymSuspendedError(
        "El acceso de este gimnasio está suspendido. Contactá a soporte de ASTRIM GYM.",
      );
    }
    if (isExpired(gym.license_expiration_date)) {
      throw new GymSuspendedError(
        "La licencia de este gimnasio venció. Contactá a soporte de ASTRIM GYM para renovarla.",
      );
    }
    gymName = gym.name;
    gymLogoPath = gym.logo_path;
  }

  await touchLastLogin(userId);

  return {
    id: userId,
    gymId,
    gymName,
    gymLogoPath,
    name,
    email: normalizedEmail,
    role,
  };
}
