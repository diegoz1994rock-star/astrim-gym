# Base de datos — ASTRIM GYM

Motor: **SQLite**, gestionado por `tauri-plugin-sql`. El archivo vive en el directorio de datos de la
aplicación del sistema operativo (en macOS durante desarrollo:
`~/Library/Application Support/com.astrimgym.desktop/astrim_gym.db`; en Windows será
`%APPDATA%/com.astrimgym.desktop/`).

## Migraciones

Las migraciones están en `src-tauri/migrations/*.sql` y se registran en `src-tauri/src/lib.rs`.
`tauri-plugin-sql` lleva su propio control de versiones (tabla `_sqlx_migrations`) y las aplica
automáticamente al arrancar. **Nunca se edita una migración ya aplicada**: los cambios de esquema
futuros se agregan como un nuevo archivo `000N_descripcion.sql`.

- `0001_init.sql` — esquema completo inicial (gyms, users, trainers, clients, membership_plans,
  memberships, payments, exercises, routines, routine_exercises, measurements, attendance).
- `0002_seed_demo.sql` — datos de demostración (ver abajo).

## Diseño multi-tenant

Casi toda tabla tiene `gym_id`. Excepciones intencionales:

- `users.gym_id` es `NULL` solo para `SUPERADMIN` (no pertenece a un gimnasio).
- `exercises.gym_id` es `NULL` para ejercicios de la **biblioteca global**; un valor no nulo indica
  un ejercicio personalizado de ese gimnasio.

## Estado de membresía

El estado (`ACTIVE`, `EXPIRING_SOON`, `EXPIRED`, `SUSPENDED`, `CANCELLED`) **no se guarda como texto
fijo**. Se calcula en `src/lib/domain/membershipStatus.ts` a partir de `end_date` y, si existe,
`manual_status` (que solo el administrador puede fijar a `SUSPENDED` o `CANCELLED`). El umbral de
"por vencer" es de 7 días (`EXPIRING_SOON_THRESHOLD_DAYS`).

## Datos de demostración

Todo registro sembrado por `0002_seed_demo.sql` incluye literalmente `(DEMO)` en su nombre para que
sea imposible confundirlo con un dato real. Antes de usar la aplicación con un gimnasio real, estos
registros deben eliminarse. En una fase posterior se añadirá un comando explícito
"Restablecer datos de demostración" en Configuración, en vez de dejarlo como una migración automática.

Credenciales de acceso demo: `admin@astrimgym.demo` / `admin123`.
