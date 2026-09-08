/**
 * Configuración de Firebase para el panel (SDK Web/JS, que corre dentro del
 * WebView de Tauri). TODOS estos valores son públicos por diseño — la
 * seguridad real la dan las Firestore Security Rules (`firestore.rules`),
 * no el secreto de estas claves. Aun así se leen de variables de entorno de
 * Vite (`.env.local`, no versionado) para no fijar un proyecto Firebase
 * concreto en el repo.
 *
 * Ver `.env.example` y `docs/FIREBASE.md`.
 *
 * IMPORTANTE: nunca poner aquí una service account / private key. El panel
 * escribe en Firestore autenticado como el usuario "dueño del gimnasio"
 * (Firebase Auth email/contraseña), igual que un cliente cualquiera.
 */
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const raw: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
};

/** true solo si las 3 claves imprescindibles están presentes. */
export const isCloudConfigured: boolean = Boolean(
  raw.apiKey && raw.authDomain && raw.projectId,
);

export const firebaseConfig: FirebaseConfig = raw;
