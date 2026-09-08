-- Video del ejercicio POR GIMNASIO.
--
-- Antes el video vivía en `exercises.video_path`, pero los ejercicios del
-- catálogo son globales (gym_id NULL) y compartidos: si un dueño ponía su
-- video, TODOS los gimnasios veían esa misma URL. La idea es que cada dueño
-- grabe su propio video enseñando la máquina — 3 dueños = 3 videos.
--
-- Ahora el video es una fila aparte, atada a (gym_id, exercise_id). El
-- catálogo de ejercicios ya no guarda ninguna URL: un gimnasio nuevo
-- arranca sin videos y cada uno pone el suyo.

CREATE TABLE exercise_videos (
    id TEXT PRIMARY KEY,
    gym_id TEXT NOT NULL REFERENCES gyms(id),
    exercise_id TEXT NOT NULL,
    video_url TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (gym_id, exercise_id)
);

CREATE INDEX idx_exercise_videos_gym ON exercise_videos (gym_id);

-- Migrar los videos que hoy están en ejercicios PROPIOS de un gimnasio
-- (gym_id no nulo) a la tabla nueva, para no perderlos.
INSERT INTO exercise_videos (id, gym_id, exercise_id, video_url)
SELECT lower(hex(randomblob(16))), gym_id, id, trim(video_path)
FROM exercises
WHERE gym_id IS NOT NULL AND video_path IS NOT NULL AND trim(video_path) <> '';

-- El catálogo deja de guardar video (los propios ya se migraron arriba).
-- Solo se tocan las filas que hoy tienen una URL — un puñado — así que la
-- re-sincronización a Firestore es mínima.
UPDATE exercises SET video_path = NULL, updated_at = datetime('now')
WHERE video_path IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Sincronización -> Firestore: gyms/{gymId}/exerciseVideos/{exerciseId}.
-- entity_id = id de la fila (como el resto de las entidades); el
-- exercise_id, que es el id del documento en Firestore, viaja en el
-- payload — así la app de clientes lo lee directo con .doc(exerciseId).
-- ---------------------------------------------------------------------------

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
