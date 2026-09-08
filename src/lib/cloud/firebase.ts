import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  type Firestore,
} from "firebase/firestore";
import { firebaseConfig, isCloudConfigured } from "./firebaseConfig";

/**
 * Inicialización perezosa del SDK de Firebase. No se toca nada si la nube
 * no está configurada (`.env.local` sin claves) — el panel sigue
 * funcionando 100% local. Cualquier consumidor debe chequear
 * `isCloudConfigured` antes de llamar a `getCloudDb()` / `getCloudAuth()`.
 */
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function ensureApp(): FirebaseApp {
  if (!isCloudConfigured) {
    throw new Error(
      "Firebase no está configurado. Completa las variables VITE_FIREBASE_* en .env.local (ver docs/FIREBASE.md).",
    );
  }
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

export function getCloudAuth(): Auth {
  if (!auth) {
    auth = getAuth(ensureApp());
    // Correos y páginas de Firebase Auth (p. ej. el enlace de "olvidé mi
    // contraseña") en español.
    auth.languageCode = "es";
  }
  return auth;
}

export function getCloudDb(): Firestore {
  if (!db) {
    // Cache local persistente (IndexedDB): cubre lecturas offline y reduce
    // lecturas facturables. Single-tab: el panel es una sola ventana.
    db = initializeFirestore(ensureApp(), {
      localCache: persistentLocalCache({ tabManager: persistentSingleTabManager(undefined) }),
    });
  }
  return db;
}

export { isCloudConfigured };
