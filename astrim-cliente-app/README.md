# astrim-cliente-app

App Android nativa (Kotlin + Jetpack Compose) para los clientes del
gimnasio: login, inicio con su entrenamiento de hoy, y (en fases
siguientes) rutinas, calendario, progreso y perfil.

Habla con **Firebase** (Firestore + Firebase Auth) — los mismos datos que
administra el panel `astrim-gym/`, que los sincroniza a Firestore vía su
outbox (ver `docs/CLOUD_SYNC.md`). Sin Firebase Storage: el logo del
gimnasio llega como base64 dentro del documento del gimnasio; los videos
son URLs externas.

## Estado (Fase 3)

Compila y genera un APK real (`./gradlew.bat :app:assembleDebug` verificado
en esta máquina). Funcionalmente:

- **Login** contra Firebase Auth (email/contraseña). La sesión la persiste
  el SDK; no hay manejo manual de tokens.
- **Inicio** con datos reales de Firestore: "Hola, {nombre}", nombre y
  **logo** del gimnasio, **color de acento** del gimnasio
  (`gyms.brandColor`), y la tarjeta "Entrenamiento de hoy" (rutina activa
  asignada + nº de ejercicios).
- **Rutina**: lista de rutinas asignadas (Actual / Historial) → **detalle
  de rutina** (ejercicios numerados con series×reps, peso) → **detalle de
  ejercicio** (grupo muscular, equipo, nivel, config del entrenador,
  instrucciones, errores comunes, **video de YouTube embebido** + "Abrir en
  YouTube"; otras URLs se abren afuera).
- **Modo Entrenamiento**: desde Inicio o el detalle de rutina. Ejercicio
  actual con series, peso y repeticiones (steppers), "COMPLETAR SERIE" →
  temporizador de descanso (basado en timestamps, sobrevive el segundo
  plano; ±15 s, omitir; beep + vibración al terminar), "EJERCICIO
  COMPLETADO" → siguiente, y pantalla de **resumen** (tiempo, ejercicios,
  series, volumen total). La sesión se guarda en
  `clients/{id}/workoutSessions` (las reglas solo permiten esta escritura al
  propio cliente). Pausa/finalizar disponibles. La pantalla no se apaga
  durante el entrenamiento.
- **Perfil**: avatar con **foto local** (se elige de la galería, se guarda
  solo en `files/` del celular — nunca en la nube), datos personales de
  **solo lectura** (los administra el gimnasio), tarjeta de membresía
  (plan, estado, días restantes, vencimiento) y **cerrar sesión**.
- Calendario y Progreso: estado "próximamente" honesto hasta que se
  construyan.
- Cache/offline de lectura: la persistencia de Firestore está activada, así
  que Inicio, Rutina y Perfil siguen mostrándose sin conexión; las sesiones
  de entrenamiento se encolan si se guardan sin red.

`userIndex/{uid}` se resuelve una sola vez por sesión (`ClientSession`) para
no gastar lecturas al cambiar de tab.

## Configuración antes de correrla

1. Necesitas un proyecto Firebase con **Authentication → Email/Password**
   habilitado y **Firestore** creado. Ver `../docs/FIREBASE.md` para el
   paso a paso completo (incluye desplegar las Security Rules y el
   bootstrap del primer gimnasio).
2. En **Firebase Console → Configuración del proyecto → Tus apps →
   Android**, registra el paquete `com.astrimgym.cliente`, descarga
   `google-services.json` y ponlo en `app/google-services.json`.
   (Ese archivo está en `.gitignore`; hay un `app/google-services.json.example`
   como referencia de la estructura.)
3. `local.properties` solo necesita `sdk.dir` (ya está, no se versiona).

Sin `google-services.json` válido el proyecto **no compila** (lo exige el
plugin de Google Services).

## Compilar y correr

Abre la carpeta en Android Studio (Gradle sync automático) y ejecuta en un
emulador o dispositivo. Por línea de comandos:

```bash
./gradlew.bat :app:assembleDebug   # Windows
```

El APK queda en `app/build/outputs/apk/debug/app-debug.apk`.

## Iniciar sesión de prueba

El acceso de cada cliente se crea desde el panel: **ficha del cliente →
"Crear acceso a la app"** (requiere haber iniciado sesión en la nube desde
Configuración → Nube). Eso da de alta la cuenta en Firebase Auth y escribe
`userIndex/{uid}` con el gimnasio y el cliente.

## Icono y logo de la app

El ícono adaptativo (`res/mipmap-*` + `mipmap-anydpi-v26/ic_launcher.xml`,
fondo `#0D0D0D`), el ícono de Play Store (`app/ic_launcher-playstore.png`) y
el logo de la pantalla de login (`res/drawable-nodpi/astrim_logo.png`) se
generan del mismo archivo (figura encapuchada verde/negro con mancuernas)
con:

```bash
python scripts/gen_icons.py "C:/ruta/al/logo.png"   # requiere Pillow
```

Es el ícono/branding de **la app** (launcher y login, antes de saber a qué
gimnasio pertenece el cliente). Una vez dentro, el logo de cada gimnasio
(`gyms.logoBase64`, configurable desde el panel) se muestra en Inicio — no
reemplaza este ícono.
