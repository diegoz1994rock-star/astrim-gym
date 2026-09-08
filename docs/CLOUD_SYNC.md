# Sincronización SQLite → Firestore (outbox)

## Idea

El panel sigue escribiendo **solo en SQLite** (fuente de verdad). Cada alta/cambio/baja de
las entidades que la app de clientes necesita ver se registra en una tabla `outbox` mediante
**triggers** (migración `0024_cloud_sync_outbox.sql`). Un worker en el frontend
(`src/lib/sync/OutboxSyncWorker.ts`) drena esa cola a Firestore cuando hay internet; si no,
queda `PENDING` y se reintenta.

Ningún servicio del panel llama a Firestore directamente — el único puente de salida es el
worker. Así, agregar la nube **no cambió ni un `INSERT`/`UPDATE` existente**.

## Flujo

```
servicio del panel → repo → INSERT/UPDATE/DELETE en SQLite
                                   │  (trigger)
                                   ▼
                              outbox (PENDING)
                                   │  OutboxSyncWorker.syncNow()  (cada 60s / evento `online` / botón)
                                   ▼
             fila actual de SQLite ──map──▶ setDoc(...)   /   deleteDoc(...)
                                   │
                                   ▼
                              outbox (SYNCED)
```

- **Coalescing:** índice único parcial `(entity, entity_id) WHERE status='PENDING'` — editar
  una fila 10 veces antes de sincronizar deja **un** push.
- **Backoff:** al fallar, `attempts++` y `enqueued_at` se empuja al futuro (1, 4, 9, … min).
  Tras 6 intentos pasa a `FAILED` (botón "Reintentar fallidos").
- **DELETE:** la fila ya no existe cuando se procesa, por eso el trigger guarda en `payload`
  las coordenadas (`gymId`, y para entidades anidadas `routineId`/`classId`/`clientId`).
- **Backfill:** los datos ya sembrados no dispararon triggers → botón **"Sincronización
  inicial completa"** (`outboxRepository.backfillAll`) los encola una vez. Idempotente.

## Autorización

El panel escribe en Firestore autenticado como el **dueño del gimnasio** (Firebase Auth
email/contraseña, `Configuración → Nube`). Las reglas (`firestore.rules`) solo dejan a un
`userIndex.role == 'ADMIN'` escribir en `gyms/{suGym}/**` y `clients/*` de su gimnasio.
**No hay service account.**

## Qué se sincroniza

| SQLite | Firestore | Notas |
|---|---|---|
| `gyms` | `gyms/{id}` | + `brand_color`, `logo_base64` (logo optimizado ≤128px) |
| `trainers` | `gyms/{g}/trainers/{id}` | solo nombre + especialidad + estado |
| `membership_plans` | `gyms/{g}/membershipPlans/{id}` | |
| `exercises` (gym_id ≠ null) | `gyms/{g}/exercises/{id}` | los globales → `exerciseLibrary/{id}` (seed aparte) |
| `class_types` (gym_id ≠ null) | `gyms/{g}/classTypes/{id}` | |
| `routines` | `gyms/{g}/routines/{id}` | + `exerciseCount` |
| `routine_exercises` | `gyms/{g}/routineExercises/{id}` | plano, con `routineId` |
| `routine_assignments` | `clients/{c}/routineAssignments/{id}` | denormaliza `routineName`, `exerciseCount` |
| `foods` (gym_id ≠ null) | `gyms/{g}/foods/{id}` | catálogo global (gym_id NULL) no se sincroniza |
| `meal_plans` | `gyms/{g}/mealPlans/{id}` | + `goal`, metas diarias, `itemCount` (obsoleto, ver `meal_plan_items` abajo) |
| `meal_plan_category_targets` | `gyms/{g}/mealPlanCategoryTargets/{id}` | metas por categoría, con `mealPlanId` |
| `meal_plan_allowed_foods` | `gyms/{g}/mealPlanAllowedFoods/{id}` | whitelist de alimentos del plan, denormaliza nombre/categoría/macros de `foods` |
| `meal_plan_items` | `gyms/{g}/mealPlanItems/{id}` | concepto retirado (`0033`): ya no se escribe, la entidad sigue en el outbox por compatibilidad |
| `meal_plan_assignments` | `clients/{c}/mealPlanAssignments/{id}` | denormaliza `mealPlanName`, `mealPlanStatus`, `itemCount` (obsoleto) |
| `classes` | `gyms/{g}/classes/{id}` | + `enrolledCount` |
| `class_blocks` / `class_block_exercises` | `gyms/{g}/classBlocks|classBlockExercises/{id}` | planos |
| `class_enrollments` | `clients/{c}/classEnrollments/{id}` | |
| `clients` | `clients/{id}` | **sin** foto, biometría, medidas, observaciones, dirección, código |
| `memberships` | `clients/{c}/memberships/{id}` | |
| `measurements` | `clients/{c}/measurements/{id}` | |

**No se sincroniza (solo local):** `users`, `payments`, `attendance`, `devices`,
`device_pairing_codes`, `machines`, `exercise_machines`, `attendance_sync_queue`, y los
campos privados listados arriba.

## Presupuesto de plan gratis

- App: lectura cache-first, sin listeners en tiempo real. ~15–30 lecturas por apertura.
- Panel: `writeBatch`, sin polling. El worker corre cada 60 s pero solo escribe si hay
  pendientes.
- Límites Firestore Spark: 50K lecturas / 20K escrituras / 20K borrados / 1 GiB por día.
