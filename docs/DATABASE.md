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
- `0002_seed_demo.sql` — datos de demostración (ver abajo). **Los revierte `0027`.**
- `0032_meal_plans.sql` — Plan de Alimentación: mismo diseño que Rutina (`0001`/`0021`) para la parte de
  plantilla + asignación. `foods` es un catálogo (gym_id NULL = alimento global, sembrado con ~95
  alimentos comunes; NOT NULL = propio del gimnasio), con macros por 100 g/ml salvo que `default_unit`
  sea `unidad`/`porcion` (ahí son por unidad). `meal_plans` es la plantilla y `meal_plan_assignments` la
  vigencia por cliente, igual que `routine_assignments`. `meal_plan_items` (alimentos fijos armados por
  el entrenador) queda en el esquema sin uso desde `0033` — ver siguiente punto.
- `0033_meal_plan_targets.sql` — reemplaza el concepto de `meal_plan_items`: el entrenador ya no arma un
  menú fijo, sino que define un `meal_plans.goal` (objetivo: PERDIDA_PESO | MANTENIMIENTO |
  GANANCIA_MUSCULAR | RECOMPOSICION | OTRO) + metas diarias (las columnas `daily_*_target` que ya
  existían) + metas por categoría (`meal_plan_category_targets`, ej. "Proteína: 180 g/día") + una
  whitelist de alimentos permitidos (`meal_plan_allowed_foods`, `food_id` del catálogo). El cliente
  elige libremente entre los alimentos permitidos y registra lo que come — ese registro de consumo vive
  solo en Firestore (`clients/{clientId}/mealLogEntries`), igual que `workoutSessions`, y nunca vuelve a
  SQLite/el panel. `meal_plan_items` queda en la base sin uso (política de migraciones aditivas, igual
  que `routines.client_id` tras `0021`).

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

`0002_seed_demo.sql` sembraba un gimnasio de prueba (`gym_demo_001`) con su administrador
`admin@astrimgym.demo` / `admin123`, entrenador, planes, 3 clientes y sus pagos/membresías/asistencias.
Todo con `(DEMO)` en el nombre.

**Desde `0027_remove_demo_data.sql` ese contenido se elimina automáticamente.** La 0002 no se borra
(no se toca una migración aplicada): en un arranque nuevo se inserta y la 0027 lo revierte acto
seguido. Una instalación de producción queda **sin ningún usuario** hasta que se da de alta el
gimnasio real (ver `docs/ONBOARDING.md`).

Los 3 ejercicios `exercise_demo_00X` **no** se borran: la migración 0012 los reconvirtió en
ejercicios del catálogo global con nombres reales.
