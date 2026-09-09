-- La consola de operador (operator-console/) necesita ver cuántos clientes
-- tiene cada gimnasio, SIN darle acceso de lectura a los datos de los
-- clientes (nombre, documento, teléfono, medidas corporales...). Solución:
-- se denormaliza el conteo en el doc `gyms/{id}` de Firestore, que el
-- operador ya puede leer.
--
-- Estos triggers re-encolan un UPSERT de la entidad 'gyms' cada vez que
-- cambia la tabla `clients`. El conteo real lo calcula el snapshot al
-- sincronizar (cloudSnapshotRepository.ts -> client_count /
-- active_client_count) y lo agrega el mapper de 'gyms' (mappers.ts).
-- Mismo patrón que trg_outbox_gyms_au (0024): payload solo lleva gymId.

CREATE TRIGGER trg_outbox_gym_clientcount_ai AFTER INSERT ON clients BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'gyms', NEW.gym_id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;

CREATE TRIGGER trg_outbox_gym_clientcount_au AFTER UPDATE ON clients BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'gyms', NEW.gym_id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;

CREATE TRIGGER trg_outbox_gym_clientcount_bd BEFORE DELETE ON clients BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'gyms', OLD.gym_id, OLD.gym_id, 'UPSERT',
            json_object('gymId', OLD.gym_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;

-- Backfill: sube el conteo una primera vez sin esperar a que cambie un
-- cliente. El `WHERE 1=1` antes del ON CONFLICT es obligatorio en la forma
-- INSERT ... SELECT ... ON CONFLICT (ver outboxRepository.backfillAll).
INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
SELECT lower(hex(randomblob(16))), 'gyms', id, id, 'UPSERT', json_object('gymId', id)
FROM gyms
WHERE 1=1
ON CONFLICT (entity, entity_id) WHERE status = 'PENDING' DO NOTHING;
