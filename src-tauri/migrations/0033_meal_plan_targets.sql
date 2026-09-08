-- Replantea el Plan de Alimentación (migración 0032): el entrenador ya NO
-- arma un menú fijo de platos. Ahora define un OBJETIVO + METAS diarias
-- (calorías/macros, ya en meal_plans) + METAS POR CATEGORÍA (ej. "Proteína
-- 180 g/día", "Fruta 2 porciones/día") + una lista de ALIMENTOS PERMITIDOS
-- para ese plan. El CLIENTE elige libremente entre los alimentos permitidos
-- y registra lo que come — ese registro vive SOLO en Firestore
-- (clients/{clientId}/mealLogEntries), igual que workoutSessions: dato de
-- cliente, nunca vuelve al panel/SQLite.
--
-- `meal_plan_items` (0032) queda en la base sin uso desde acá — no se borra
-- por la política de migraciones aditivas (igual que routines.client_id
-- tras 0021). La UI del panel ya no la usa.

ALTER TABLE meal_plans ADD COLUMN goal TEXT; -- PERDIDA_PESO | MANTENIMIENTO | GANANCIA_MUSCULAR | RECOMPOSICION | OTRO

CREATE TABLE meal_plan_category_targets (
    id TEXT PRIMARY KEY,
    meal_plan_id TEXT NOT NULL REFERENCES meal_plans(id),
    category TEXT NOT NULL, -- PROTEINA | CARBOHIDRATO | LEGUMBRE | VERDURA | FRUTA | LACTEO | GRASA | BEBIDA | OTRO
    target_quantity REAL NOT NULL,
    target_unit TEXT NOT NULL DEFAULT 'g', -- g | porciones
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_meal_plan_category_targets_unique ON meal_plan_category_targets(meal_plan_id, category);
CREATE INDEX idx_meal_plan_category_targets_plan ON meal_plan_category_targets(meal_plan_id);

CREATE TABLE meal_plan_allowed_foods (
    id TEXT PRIMARY KEY,
    meal_plan_id TEXT NOT NULL REFERENCES meal_plans(id),
    food_id TEXT NOT NULL REFERENCES foods(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_meal_plan_allowed_foods_unique ON meal_plan_allowed_foods(meal_plan_id, food_id);
CREATE INDEX idx_meal_plan_allowed_foods_plan ON meal_plan_allowed_foods(meal_plan_id);

-- ---------------------------------------------------------------------------
-- Outbox (mismo patrón que 0024/0032): AFTER INSERT/UPDATE -> UPSERT,
-- BEFORE DELETE -> DELETE. gym_id se resuelve vía meal_plans (padre).
-- ---------------------------------------------------------------------------

-- ===== meal_plan_category_targets =====
CREATE TRIGGER trg_outbox_meal_plan_category_targets_ai AFTER INSERT ON meal_plan_category_targets BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'meal_plan_category_targets', NEW.id,
            (SELECT gym_id FROM meal_plans WHERE id = NEW.meal_plan_id), 'UPSERT',
            json_object('gymId', (SELECT gym_id FROM meal_plans WHERE id = NEW.meal_plan_id), 'mealPlanId', NEW.meal_plan_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_meal_plan_category_targets_au AFTER UPDATE ON meal_plan_category_targets BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'meal_plan_category_targets', NEW.id,
            (SELECT gym_id FROM meal_plans WHERE id = NEW.meal_plan_id), 'UPSERT',
            json_object('gymId', (SELECT gym_id FROM meal_plans WHERE id = NEW.meal_plan_id), 'mealPlanId', NEW.meal_plan_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_meal_plan_category_targets_bd BEFORE DELETE ON meal_plan_category_targets BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'meal_plan_category_targets', OLD.id,
            (SELECT gym_id FROM meal_plans WHERE id = OLD.meal_plan_id), 'DELETE',
            json_object('gymId', (SELECT gym_id FROM meal_plans WHERE id = OLD.meal_plan_id), 'mealPlanId', OLD.meal_plan_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'DELETE', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;

-- ===== meal_plan_allowed_foods =====
CREATE TRIGGER trg_outbox_meal_plan_allowed_foods_ai AFTER INSERT ON meal_plan_allowed_foods BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'meal_plan_allowed_foods', NEW.id,
            (SELECT gym_id FROM meal_plans WHERE id = NEW.meal_plan_id), 'UPSERT',
            json_object('gymId', (SELECT gym_id FROM meal_plans WHERE id = NEW.meal_plan_id), 'mealPlanId', NEW.meal_plan_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
-- (sin AU: esta fila no se edita, solo se crea/borra al tildar/destildar un alimento)
CREATE TRIGGER trg_outbox_meal_plan_allowed_foods_bd BEFORE DELETE ON meal_plan_allowed_foods BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'meal_plan_allowed_foods', OLD.id,
            (SELECT gym_id FROM meal_plans WHERE id = OLD.meal_plan_id), 'DELETE',
            json_object('gymId', (SELECT gym_id FROM meal_plans WHERE id = OLD.meal_plan_id), 'mealPlanId', OLD.meal_plan_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'DELETE', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
