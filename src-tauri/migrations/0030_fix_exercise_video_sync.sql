-- Repara la sincronización de los videos de ejercicio.
--
-- Bug: una versión anterior de la 0028 (editada después de aplicarse en
-- desarrollo) dejó los triggers con `entity_id = NEW.exercise_id`. El resto
-- de la capa de sync busca la fila por su PK (`WHERE id = $1` en
-- cloudSnapshotRepository). Resultado: el worker no encontraba la fila, la
-- daba por borrada y NUNCA subía el video a Firestore — el link no aparecía
-- en la app de clientes.
--
-- Este arreglo:
--   1. Recrea los 3 triggers con `entity_id = NEW.id` (idempotente: en una
--      instalación nueva ya estaban bien y quedan idénticos).
--   2. Reencola los videos existentes para que suban de verdad ahora.

DROP TRIGGER IF EXISTS trg_outbox_exercise_video_ai;
DROP TRIGGER IF EXISTS trg_outbox_exercise_video_au;
DROP TRIGGER IF EXISTS trg_outbox_exercise_video_bd;

CREATE TRIGGER trg_outbox_exercise_video_ai AFTER INSERT ON exercise_videos BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'exercise_video', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id, 'exerciseId', NEW.exercise_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;

CREATE TRIGGER trg_outbox_exercise_video_au AFTER UPDATE ON exercise_videos BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'exercise_video', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id, 'exerciseId', NEW.exercise_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;

CREATE TRIGGER trg_outbox_exercise_video_bd BEFORE DELETE ON exercise_videos BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'exercise_video', OLD.id, OLD.gym_id, 'DELETE',
            json_object('gymId', OLD.gym_id, 'exerciseId', OLD.exercise_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'DELETE', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;

-- Reencola los videos que ya existen, con el entity_id correcto (la PK).
-- INSERT OR IGNORE respeta el índice único de pendientes: si ya hubiera una
-- entrada PENDING para esta fila, no duplica.
INSERT OR IGNORE INTO outbox (id, entity, entity_id, gym_id, op, payload)
SELECT lower(hex(randomblob(16))), 'exercise_video', id, gym_id, 'UPSERT',
       json_object('gymId', gym_id, 'exerciseId', exercise_id)
FROM exercise_videos;
