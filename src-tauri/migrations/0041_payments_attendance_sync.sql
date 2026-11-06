-- Pagos y asistencias también viajan a la nube (clients/{clientId}/payments
-- y clients/{clientId}/attendance). Antes solo vivían en la SQLite local:
-- si el gimnasio perdía o cambiaba la PC, ese historial se perdía.
-- Las filas que ya existían las sube el backfill de historial del worker
-- (OutboxSyncWorker.ensureHistoryBackfilled), una vez por instalación.

-- ===== payments =====
CREATE TRIGGER trg_outbox_payments_ai AFTER INSERT ON payments BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'payments', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id, 'clientId', NEW.client_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_payments_au AFTER UPDATE ON payments BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'payments', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id, 'clientId', NEW.client_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_payments_bd BEFORE DELETE ON payments BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'payments', OLD.id, OLD.gym_id, 'DELETE',
            json_object('gymId', OLD.gym_id, 'clientId', OLD.client_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'DELETE', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;

-- ===== attendance =====
CREATE TRIGGER trg_outbox_attendance_ai AFTER INSERT ON attendance BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'attendance', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id, 'clientId', NEW.client_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_attendance_au AFTER UPDATE ON attendance BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'attendance', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id, 'clientId', NEW.client_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_attendance_bd BEFORE DELETE ON attendance BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'attendance', OLD.id, OLD.gym_id, 'DELETE',
            json_object('gymId', OLD.gym_id, 'clientId', OLD.client_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'DELETE', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
