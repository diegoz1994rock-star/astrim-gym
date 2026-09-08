import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getCloudDb } from "./firebase";
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
  return { uid };
}
