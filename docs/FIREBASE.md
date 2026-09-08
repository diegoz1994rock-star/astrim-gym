# Firebase — puesta en marcha

La app de clientes (`astrim-cliente-app/`) y el panel (`astrim-gym/`) hablan con **Firestore
+ Firebase Auth**. Sin Firebase Storage, sin service account / private keys en ningún lado.
Plan **Spark** (gratis, sin tarjeta).

## 1. Crear el proyecto (una vez)

1. https://console.firebase.google.com → **Agregar proyecto**. Sin Google Analytics.
2. **Authentication → Comenzar → Sign-in method → Correo/contraseña → Habilitar**.
3. **Firestore Database → Crear base de datos** → modo **producción** → región
   `southamerica-east1` (o la más cercana a tus gimnasios).

## 2. Registrar las apps

### App Android (para la APK)
1. En **Configuración del proyecto → Tus apps → Android**.
2. Nombre del paquete: `com.astrimgym.cliente`. (SHA-1 no hace falta para email/contraseña.)
3. Descarga `google-services.json` y ponlo en `astrim-cliente-app/app/google-services.json`
   (ese archivo está en `.gitignore`; hay un `.example` al lado como referencia).

### App Web (para el panel Tauri)
1. En **Configuración del proyecto → Tus apps → Web** (`</>`).
2. Copia el objeto `firebaseConfig`.
3. En `astrim-gym/`, copia `.env.example` a `.env.local` y completa las variables
   `VITE_FIREBASE_*` con esos valores. Reinicia `npm run tauri dev`.

## 3. Desplegar las reglas de seguridad

```bash
npm install -g firebase-tools     # una vez
firebase login
# edita .firebaserc y pon el project id real en "default"
firebase deploy --only firestore:rules
```

(O pega el contenido de `firestore.rules` en **Firestore → Reglas** en la consola.)

## 4. Bootstrap del primer gimnasio

Las reglas exigen que exista un `userIndex/{uid}` con `role: ADMIN` para poder crear los
demás. El primero se siembra **a mano** (la consola ignora las reglas):

1. **Authentication → Users → Agregar usuario**: crea la cuenta del dueño del gimnasio
   (ej. `dueño@migimnasio.com`). Copia su **UID**.
2. **Firestore → Iniciar colección** `userIndex` → ID del documento = ese UID → campos:
   - `gymId` (string) = el id del gimnasio en SQLite (normalmente `gym_demo_001`; se ve en
     el panel o en la BD local).
   - `role` (string) = `ADMIN`
3. En el panel: **Configuración → Nube** → inicia sesión con esa cuenta →
   **Sincronización inicial completa** → **Subir biblioteca de ejercicios**.

A partir de acá, cada cliente recibe su acceso desde **su ficha → "Crear acceso a la app"**.

## 5. Verificar

- Panel: DevTools offline → editá una rutina → **Configuración → Nube** muestra
  "Pendientes: 1" → online → "Sincronizar ahora" → 0 pendientes; el doc aparece en la
  consola de Firestore.
- APK: iniciá sesión con un cliente creado en el paso anterior → Inicio muestra nombre,
  gimnasio, logo, color de acento y la rutina activa. Modo avión → reabrir → sigue
  mostrándose (cache de Firestore).
- Reglas: **Firestore → Reglas → Área de juegos** — simulá que el cliente A lee
  `clients/B` → *denegado*; `clients/A` y `gyms/{suGym}` → *permitido*.

## Costos (plan gratis)

Firestore: 50 000 lecturas / 20 000 escrituras / 20 000 borrados / 1 GiB por día. Auth:
gratis para email/contraseña. La app lee con cache primero (~15–30 lecturas por apertura);
el panel escribe en lotes y encola con coalescing. Ver `docs/CLOUD_SYNC.md`.
