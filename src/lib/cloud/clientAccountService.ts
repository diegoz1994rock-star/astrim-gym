import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getCloudDb, isCloudConfigured } from "./firebase";
import { firebaseConfig } from "./firebaseConfig";
import { currentCloudUser } from "./cloudAuth";
import * as clientRepository from "../repositories/clientRepository";

/**
 * Crea el acceso a la app de clientes para UN cliente:
 *
 *  1. Alta en Firebase Auth vía la REST API de Identity Toolkit
 *     (`accounts:signUp`) usando la apiKey pública. Se usa REST y no el SDK
 *     porque `createUserWithEmailAndPassword` cambiaría la sesión activa
 *     del panel al usuario recién creado; la REST no toca la sesión.
 *  2. Escribe `userIndex/{uid}` -> { gymId, clientId, role: 'CLIENT' }.
 *     Este doc es lo que las Security Rules usan para saber qué puede leer
 *     ese cliente. La escritura la autoriza el dueño del gimnasio (sesión
 *     cloud del panel, role ADMIN).
 *  3. Guarda `clients.cloud_uid` en SQLite (dispara la sync del cliente).
 *
 * No hay service account en ningún momento.
 */

export class ClientAccountError extends Error {}

interface SignUpResponse {
  localId?: string;
  error?: { message?: string };
}

function friendlyAuthError(code: string | undefined): string {
  switch (code) {
    case "EMAIL_EXISTS":
      return "Ya existe una cuenta con ese correo.";
    case "INVALID_EMAIL":
      return "El correo no es válido.";
    case "WEAK_PASSWORD : Password should be at least 6 characters":
    case "WEAK_PASSWORD":
      return "La contraseña debe tener al menos 6 caracteres.";
    default:
      return code || "No se pudo crear la cuenta.";
  }
}

async function signUpViaRest(email: string, password: string): Promise<string> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password, returnSecureToken: true }),
    },
  );
  const body = (await res.json()) as SignUpResponse;
  if (!res.ok || !body.localId) {
    throw new ClientAccountError(friendlyAuthError(body.error?.message));
  }
  return body.localId;
}

export async function createClientLogin(
  gymId: string,
  clientId: string,
  clientName: string,
  email: string,
  password: string,
): Promise<{ uid: string }> {
  if (!currentCloudUser()) {
    throw new ClientAccountError(
      "Primero inicia sesión con la cuenta de la nube del gimnasio (Configuración → Nube).",
    );
  }

  const uid = await signUpViaRest(email, password);

  try {
    await setDoc(doc(getCloudDb(), "userIndex", uid), {
      gymId,
      clientId,
      role: "CLIENT",
      email: email.trim(),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    throw new ClientAccountError(
      `La cuenta se creó pero no se pudo vincular en Firestore (${
        err instanceof Error ? err.message : String(err)
      }). Reintenta la sincronización.`,
    );
  }

  await clientRepository.setClientCloudUid(gymId, clientId, uid);
  // Credencial en texto para recuperación: la ve el dueño (su gimnasio) y el
  // operador de ASTRIM. Misma idea que `gymCredentials` para los dueños. Si
  // esto falla, el acceso ya quedó creado igual — no se corta el flujo.
  await saveClientCredential(gymId, clientId, clientName, email, password).catch(() => {});
  return { uid };
}

/**
 * Guarda (o actualiza) la contraseña del cliente en texto en
 * `clientCredentials/{clientId}` para que se pueda recuperar si la olvida.
 * Se usa al crear el acceso y también desde la ficha del cliente cuando el
 * acceso ya existía de antes (o el dueño le puso una contraseña nueva).
 */
export async function saveClientCredential(
  gymId: string,
  clientId: string,
  clientName: string,
  email: string,
  password: string,
): Promise<void> {
  if (!currentCloudUser()) {
    throw new ClientAccountError(
      "Primero inicia sesión con la cuenta de la nube del gimnasio (Configuración → Nube).",
    );
  }
  await setDoc(doc(getCloudDb(), "clientCredentials", clientId), {
    gymId,
    clientId,
    clientName: clientName.trim(),
    email: email.trim(),
    password,
    updatedBy: "owner",
    updatedAt: serverTimestamp(),
  });
}

/**
 * Lee la credencial guardada de un cliente (correo + contraseña en texto)
 * para mostrarla en la ficha. Devuelve `null` si no hay nube, no hay sesión,
 * o el cliente no tiene credencial guardada.
 */
export async function readClientCredential(
  clientId: string,
): Promise<{ email: string; password: string } | null> {
  if (!isCloudConfigured || !currentCloudUser()) return null;
  try {
    const snap = await getDoc(doc(getCloudDb(), "clientCredentials", clientId));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      email: typeof d.email === "string" ? d.email : "",
      password: typeof d.password === "string" ? d.password : "",
    };
  } catch {
    return null;
  }
}
