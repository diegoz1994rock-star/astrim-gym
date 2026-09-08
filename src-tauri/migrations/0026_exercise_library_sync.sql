-- Sincroniza los ejercicios GLOBALES (gym_id NULL) a la colección
-- compartida `exerciseLibrary/{id}` en Firestore.
--
-- La migración 0024 excluye a propósito los globales de los triggers de
-- `exercises` (van a otra colección, no a `gyms/{g}/exercises`). Pero editar
-- un ejercicio global desde el panel — por ejemplo agregarle el link de
-- video — quedaba solo local: el catálogo en la nube no se actualizaba
-- hasta volver a pulsar "Subir biblioteca de ejercicios" a mano.
--
-- Estos triggers cierran ese hueco: cualquier alta/cambio/baja de un
-- ejercicio global se encola con entity 'exercise_library' y el worker lo
-- escribe/borra en `exerciseLibrary/{id}`.

CREATE TRIGGER trg_outbox_exercise_library_ai AFTER INSERT ON exercises
WHEN NEW.gym_id IS NULL BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'exercise_library', NEW.id, NULL, 'UPSERT', json_object())
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;

CREATE TRIGGER trg_outbox_exercise_library_au AFTER UPDATE ON exercises
WHEN NEW.gym_id IS NULL BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'exercise_library', NEW.id, NULL, 'UPSERT', json_object())
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;

CREATE TRIGGER trg_outbox_exercise_library_bd BEFORE DELETE ON exercises
WHEN OLD.gym_id IS NULL BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'exercise_library', OLD.id, NULL, 'DELETE', json_object())
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'DELETE', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
