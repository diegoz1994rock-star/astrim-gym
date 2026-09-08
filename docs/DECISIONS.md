# Decisiones arquitectónicas — ASTRIM GYM

## 2026-08-29 — Stack de escritorio: Tauri + React/TypeScript

**Contexto:** el desarrollo ocurre en macOS, pero el objetivo de distribución es Windows.
Esto descartó C#/WPF puro (Windows-only, no verificable en esta máquina durante el desarrollo).

**Alternativas evaluadas:** C#/WPF, C#/.NET MAUI, Python + PySide6 (Qt), Avalonia UI (C#), Electron + React.

**Decisión:** Tauri 2 + React + TypeScript + Tailwind CSS + shadcn/ui (componentes propios estilo shadcn).

**Por qué:**
- Corre y se puede verificar en macOS durante el desarrollo (`tauri dev`); compila nativo para Windows
  vía WebView2 en CI cuando llegue el momento de distribuir.
- Backend en Rust: más liviano que Electron, sin sacrificar el ecosistema React para la UI.
- Tailwind + componentes estilo shadcn permiten alcanzar un nivel visual "comercial" con mucho menos
  esfuerzo manual que QSS (Qt) o XAML (WPF/Avalonia).
- `tauri-plugin-sql` trae SQLite y migraciones versionadas listas para usar.

## 2026-08-29 — Capa de repositorio en TypeScript, no en Rust

**Decisión:** la lógica de acceso a datos (`src/lib/repositories`) y de negocio (`src/lib/services`)
vive en TypeScript, en el frontend. Rust solo expone el plugin SQL genérico.

**Por qué:** cuando llegue la Fase 3 (Firebase), se podrá introducir un repositorio alternativo (o híbrido)
sin tocar Rust ni la UI — el patrón Repositorio queda aislado en una sola capa de JavaScript/TypeScript,
que es además el lenguaje que compartirá con un futuro panel web de Superadmin.

## 2026-08-29 — IDs de texto (no autoincrementales)

**Decisión:** todas las tablas usan `id TEXT PRIMARY KEY` en vez de `INTEGER AUTOINCREMENT`.

**Por qué:** los IDs de Firestore son strings. Generar UUIDs desde ya evita tener que remapear
identificadores el día de la sincronización.

## 2026-09-05 — Nube: Firebase (Firestore + Auth), sin Storage, sin service account

**Contexto:** la APK de clientes corre fuera del gimnasio y necesita una fuente de datos
remota. Un scaffold previo usó Supabase + un servidor Fastify propio (`astrim-backend/`),
que obliga a hostear y pagar. El roadmap siempre previó Firebase (Fase 3).

**Decisión:** Firestore + Firebase Auth (email/contraseña). Se descartó `astrim-backend/`.

**Por qué / cómo:**
- La APK habla **directo** con Firestore (con Security Rules), sin servidor intermedio → de
  verdad gratis (plan Spark, sin tarjeta).
- **Sin Firebase Storage:** desde 2024 exige plan Blaze. El logo del gimnasio se guarda
  optimizado (≤128px) en base64 dentro del doc de `gyms`; los videos de ejercicios son URLs
  externas. Nada de media pesada en la nube.
- **Sin service account / private keys** en el escritorio ni en el APK. El panel escribe
  autenticado como el usuario "dueño del gimnasio" (Firebase Auth normal); las reglas lo
  autorizan por `userIndex/{uid}.role == 'ADMIN'`. El alta de clientes usa la REST de
  Identity Toolkit con la apiKey pública (no toca la sesión del panel).
- **Sync SQLite → Firestore por outbox + triggers** (migración 0024): ninguna escritura
  existente del panel cambió. Ver `docs/CLOUD_SYNC.md`.

## 2026-08-29 — Estado de membresía calculado, no almacenado

**Decisión:** `memberships` no tiene una columna `status` de texto libre. El estado se calcula en
`src/lib/domain/membershipStatus.ts` a partir de `end_date`, salvo que `manual_status` indique
`SUSPENDED` o `CANCELLED`.

**Por qué:** evita que el estado quede desincronizado de la fecha real, tal como pide la especificación
del proyecto (punto 10).

## 2026-09-05 — Rediseño visual de la app de clientes (sistema de diseño propio)

**Decisión:** la APK de clientes (`astrim-cliente-app/`) pasa de la UI base de Material3 a un
sistema de diseño propio "premium fitness" sobre la misma arquitectura (mismos ViewModels,
repositorios y navegación — nada de lógica cambió).

**Qué se agregó:**
- **Tipografía empaquetada** (sin dependencias): Space Grotesk (títulos/números) + Inter
  (cuerpo/etiquetas) como fuentes variables en `res/font/`. Se eliminó cualquier tipografía
  manuscrita.
- **Tokens y componentes** en `ui/theme/` y `ui/components/`: paleta charcoal + acento del
  gimnasio, `AstrimButton` (glow sutil vía shadow con color, escala al presionar, háptico),
  `AstrimCard`, `AstrimStepper`, `ProgressRing`, `AstrimTextField`, estados de carga/error/vacío
  unificados, barra inferior propia con píldora animada.
- **Animación de ejercicios** (`ui/exercise/ExerciseAnimation.kt`): arquitectura Lottie-first.
  Se agregó `com.airbnb.android:lottie-compose` (única dependencia nueva; ~1 MB). Reproduce
  `assets/exercise_anim/<slug>.json` por ejercicio cuando exista; mientras tanto, un fallback
  animado dibujado en Compose (anillos + núcleo que responden al estado READY/ACTIVE/REST/DONE).
  El enganche sirve igual para Rive más adelante.

**Por qué:** el objetivo es que se sienta como una app fitness publicada, no un prototipo. Un
solo sistema de diseño aplicado a todas las pantallas (Login, Inicio, Rutinas, Detalle, Modo
Entrenamiento, Descanso, Resumen, Perfil, placeholders) mantiene la coherencia y deja el
terreno listo para animaciones profesionales sin volver a tocar la UI.

## 2026-09-05 — App de clientes: Agenda y Progreso con datos reales

**Decisión:** las tabs Agenda y Progreso dejan de ser placeholders "próximamente"
y se construyen sobre datos que ya existen en Firestore — sin datos de ejemplo.

- **Progreso** (`ui/progress/`, `ProgressRepository`): lee
  `clients/{id}/workoutSessions` (las escribe esta misma app al terminar el Modo
  Entrenamiento) y, si el gimnasio las cargó, `clients/{id}/measurements` para el
  peso corporal. Muestra: entrenos de la semana, racha de semanas, total, volumen
  de 30 días, gráfico de barras de entrenos por semana (Canvas, sin librería),
  historial de sesiones y evolución de peso. Estado vacío honesto si nunca entrenó.
- **Agenda** (`ui/agenda/`, `AgendaRepository`): calendario mensual que marca los
  días entrenados (de `workoutSessions`) y las clases inscritas
  (`clients/{id}/classEnrollments`, con `className`/`classDate`/`classStartTime`
  denormalizados — no hace falta leer cada `classes/{id}`). Al tocar un día se ve
  el detalle; abajo, "Próximas clases".
- Lectura cache-first, una sola carga por sesión (igual que Inicio/Rutinas/Perfil),
  para respetar el presupuesto del plan Spark.

**Fix incluido:** el aviso háptico al terminar el descanso (`WorkoutModeScreen`)
llamaba a `Vibrator.vibrate()` sin el permiso `VIBRATE` en el manifiesto →
`SecurityException` que tiraba la app al vencer un descanso. Se agregó el permiso
(normal, sin diálogo) y se envolvió la llamada en `runCatching`.
