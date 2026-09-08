# Roadmap — ASTRIM GYM

- **Fase 1 — Aplicación Windows administrativa local** ⏳ *(en curso)*
  - [x] Login + Dashboard con datos reales locales.
  - [ ] Clientes → Entrenadores → Membresías → Pagos → Ejercicios → Rutinas → Progreso → Asistencia.
- **Fase 2** — Aplicación Android para clientes.
- **Fase 3** — Firebase y autenticación remota. ⏳ *(en curso)*
  - [x] Firestore + Firebase Auth (email/contraseña), sin Storage, sin service account.
  - [x] Relación `userIndex/{uid}` → gymId / clientId / role; reglas de seguridad multi-tenant.
  - [x] Panel: sincronización SQLite → Firestore por outbox + triggers (ver `docs/CLOUD_SYNC.md`).
  - [x] APK: login Firebase + pantalla Inicio con datos reales + marca por gimnasio.
  - [x] APK: tab Rutina + detalle de rutina + detalle de ejercicio (video YouTube embebido).
  - [x] Panel: Plan de Alimentación (catálogo de alimentos, plantillas con macros, asignación a
        clientes) — mismo diseño que Rutina, ver `docs/DATABASE.md`/`docs/CLOUD_SYNC.md`.
  - [x] APK: Perfil (foto local, datos solo lectura, membresía, cerrar sesión).
  - [x] APK: Modo Entrenamiento (series con peso/reps, temporizador de descanso, resumen;
        guarda la sesión en `clients/{id}/workoutSessions`).
  - [ ] APK: Calendario/Clases, Progreso/Récords/Objetivos, notificaciones, offline robusto.
- **Fase 4** — Sincronización online/offline.
- **Fase 5** — Sistema multi-gimnasio completo (varios `gymId` en producción).
- **Fase 6** — Licenciamiento y bloqueo automático.
- **Fase 7** — Pagos online.
- **Fase 8** — Videos e imágenes remotos (con compresión, miniaturas y CDN).
- **Fase 9** — Alimentación (con distinción clara entre contenido del profesional, fuente externa
  autorizada e información general de la plataforma).
- **Fase 10** — Notificaciones.
- **Fase 11** — QR y asistencia avanzada.
- **Fase 12** — Superadmin.
- **Fase 13** — Publicación comercial.

No se avanza de fase sin ejecutar, verificar y obtener aprobación explícita sobre la fase anterior.
