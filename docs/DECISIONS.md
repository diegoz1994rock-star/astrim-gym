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

## 2026-08-29 — Estado de membresía calculado, no almacenado

**Decisión:** `memberships` no tiene una columna `status` de texto libre. El estado se calcula en
`src/lib/domain/membershipStatus.ts` a partir de `end_date`, salvo que `manual_status` indique
`SUSPENDED` o `CANCELLED`.

**Por qué:** evita que el estado quede desincronizado de la fecha real, tal como pide la especificación
del proyecto (punto 10).
