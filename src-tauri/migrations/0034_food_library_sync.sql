-- El cliente ya no elige solo entre "alimentos permitidos" curados por el
-- entrenador (meal_plan_allowed_foods, 0033, ahora sin uso en la UI del
-- panel) — elige libremente de TODO el catálogo. Eso significa que el
-- catálogo global (foods.gym_id IS NULL, sembrado en 0032) tiene que llegar
-- a Firestore, cosa que nunca pasó: los triggers de 0032 solo cubrían
-- alimentos propios de un gimnasio (gym_id NOT NULL). Mismo patrón que
-- exercises -> exerciseLibrary.

CREATE TRIGGER trg_outbox_food_library_ai AFTER INSERT ON foods
WHEN NEW.gym_id IS NULL BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'food_library', NEW.id, NULL, 'UPSERT', json_object())
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_food_library_au AFTER UPDATE ON foods
WHEN NEW.gym_id IS NULL BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'food_library', NEW.id, NULL, 'UPSERT', json_object())
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_food_library_bd BEFORE DELETE ON foods
WHEN OLD.gym_id IS NULL BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'food_library', OLD.id, NULL, 'DELETE', json_object())
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'DELETE', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
