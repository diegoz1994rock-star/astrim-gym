# Arquitectura — ASTRIM GYM (Fase 1: escritorio Windows/local)

## Stack

- **Tauri 2** (backend en Rust, ventana nativa vía WebView del sistema).
- **React 19 + TypeScript** para la interfaz.
- **Tailwind CSS v4** para estilos, con variables de tema (`src/styles/globals.css`) para modo claro/oscuro.
- **SQLite** local vía `tauri-plugin-sql`, con migraciones versionadas.
- **React Router (HashRouter)** para la navegación interna del panel.

Ver `docs/DECISIONS.md` para el porqué de cada elección.

## Capas (de arriba hacia abajo)

```
UI (React, src/features, src/app)
   ↓
Servicios (src/lib/services) — reglas de negocio, validaciones, orquestación
   ↓
Repositorios (src/lib/repositories) — únicas piezas que conocen SQL
   ↓
Cliente de base de datos (src/lib/db/client.ts) — conexión SQLite vía tauri-plugin-sql
```

Regla fija: **los componentes de React nunca ejecutan SQL directamente**. Siempre pasan por un servicio.
Esto es lo que permitirá, en una fase futura, sustituir o complementar el repositorio SQLite por uno que
también sincronice con Firebase, sin tocar la UI ni los servicios.

## Capa de nube (Fase 3, `src/lib/cloud` + `src/lib/sync`)

SQLite sigue siendo la fuente de verdad. Los triggers de la migración `0024` encolan en
`outbox` cada cambio de las entidades que la app de clientes necesita; `OutboxSyncWorker`
las empuja a Firestore (auth como "dueño del gimnasio", sin service account). La app de
clientes lee Firestore directamente con Security Rules. Ver `docs/CLOUD_SYNC.md` y
`docs/FIREBASE.md`.

## Estructura de carpetas

```
src/
  app/            Shell de la aplicación: layout, sidebar, topbar, rutas
  features/       Una carpeta por módulo de negocio (auth, dashboard, y las que siguen)
  components/ui/  Componentes de UI genéricos y reutilizables (Button, Input, Card)
  components/     Componentes compuestos reutilizables entre features (StatCard, etc.)
  lib/
    db/           Conexión a la base de datos
    repositories/ Acceso a datos, una función por consulta
    services/     Lógica de negocio, reglas de permisos, cálculo de estados
    domain/       Reglas de negocio puras sin dependencias externas (ej. estado de membresía)
    auth/         Contexto de autenticación de React
  types/          Tipos compartidos (registros de BD, tipos de dominio)
src-tauri/
  src/            Código Rust: registro de plugins y migraciones
  migrations/     Migraciones SQL versionadas (nunca se edita una ya aplicada)
```

## Multi-gimnasio (multi-tenant) desde el día uno

Aunque en esta fase solo existe `gym_demo_001`, toda tabla de negocio tiene una columna `gym_id`.
La capa de servicios siempre recibe y filtra por `gym_id` explícitamente — no se asume un único gimnasio
en ninguna consulta. Esto evita una reescritura cuando se agregue más de un gimnasio.

## Roles

`users.role` admite `SUPERADMIN | ADMIN | TRAINER | CLIENT`. En esta fase solo se usa el flujo de `ADMIN`.
La verificación de permisos vive en `src/lib/services`, nunca únicamente en la UI (ver `docs/SECURITY.md`).
