-- Cola de salida (outbox) para la sincronización SQLite -> Firestore.
--
-- El panel sigue escribiendo SOLO en SQLite (fuente de verdad). Estos
-- triggers registran cada alta/cambio/baja de las entidades que la app de
-- clientes necesita ver, sin tocar ninguna de las escrituras existentes.
-- Un worker en el frontend (src/lib/sync/OutboxSyncWorker.ts) drena la
-- cola a Firestore cuando hay internet; si no, queda PENDING y se procesa
-- después.
--
-- Entidades que NO se sincronizan (quedan solo locales, según lo acordado):
-- users, payments, attendance, devices, device_pairing_codes, machines,
-- exercise_machines, attendance_sync_queue, y los campos biométricos de
-- clients (el mapper los excluye, ver src/lib/cloud/mappers/).
--
-- `payload` guarda las coordenadas para ubicar el documento en Firestore
-- (gymId y, para entidades anidadas, los ids de sus padres). Es
-- imprescindible para los DELETE, donde la fila ya no existe cuando el
-- worker la procesa. Para los UPSERT el worker vuelve a leer la fila actual
-- de SQLite (más fresca) y `payload` solo se usa de respaldo.

CREATE TABLE outbox (
    id TEXT PRIMARY KEY,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    gym_id TEXT,
    op TEXT NOT NULL CHECK (op IN ('UPSERT', 'DELETE')),
    payload TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SYNCED', 'FAILED')),
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    enqueued_at TEXT NOT NULL DEFAULT (datetime('now')),
    synced_at TEXT
);

-- Coalescing: mientras una fila siga PENDING, editarla varias veces deja
-- una sola entrada en la cola (un solo push). Las filas SYNCED/FAILED
-- quedan como historial y no estorban a este índice.
CREATE UNIQUE INDEX idx_outbox_pending_unique
    ON outbox (entity, entity_id) WHERE status = 'PENDING';
CREATE INDEX idx_outbox_status ON outbox (status, enqueued_at);

-- ---------------------------------------------------------------------------
-- Triggers. Patrón por tabla: AFTER INSERT / AFTER UPDATE -> 'UPSERT';
-- BEFORE DELETE -> 'DELETE'. El ON CONFLICT vuelve a dejar la entrada
-- PENDING "fresca" (attempts 0) si ya existía.
-- ---------------------------------------------------------------------------

-- ===== gyms (nunca se borran desde el panel) =====
CREATE TRIGGER trg_outbox_gyms_ai AFTER INSERT ON gyms BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'gyms', NEW.id, NEW.id, 'UPSERT',
            json_object('gymId', NEW.id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_gyms_au AFTER UPDATE ON gyms BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'gyms', NEW.id, NEW.id, 'UPSERT',
            json_object('gymId', NEW.id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;

-- ===== trainers =====
CREATE TRIGGER trg_outbox_trainers_ai AFTER INSERT ON trainers BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'trainers', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_trainers_au AFTER UPDATE ON trainers BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'trainers', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_trainers_bd BEFORE DELETE ON trainers BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'trainers', OLD.id, OLD.gym_id, 'DELETE',
            json_object('gymId', OLD.gym_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'DELETE', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;

-- ===== membership_plans =====
CREATE TRIGGER trg_outbox_membership_plans_ai AFTER INSERT ON membership_plans BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'membership_plans', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_membership_plans_au AFTER UPDATE ON membership_plans BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'membership_plans', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_membership_plans_bd BEFORE DELETE ON membership_plans BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'membership_plans', OLD.id, OLD.gym_id, 'DELETE',
            json_object('gymId', OLD.gym_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'DELETE', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;

-- ===== clients =====
CREATE TRIGGER trg_outbox_clients_ai AFTER INSERT ON clients BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'clients', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id, 'clientId', NEW.id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_clients_au AFTER UPDATE ON clients BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'clients', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id, 'clientId', NEW.id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_clients_bd BEFORE DELETE ON clients BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'clients', OLD.id, OLD.gym_id, 'DELETE',
            json_object('gymId', OLD.gym_id, 'clientId', OLD.id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'DELETE', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;

-- ===== memberships =====
CREATE TRIGGER trg_outbox_memberships_ai AFTER INSERT ON memberships BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'memberships', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id, 'clientId', NEW.client_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_memberships_au AFTER UPDATE ON memberships BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'memberships', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id, 'clientId', NEW.client_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_memberships_bd BEFORE DELETE ON memberships BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'memberships', OLD.id, OLD.gym_id, 'DELETE',
            json_object('gymId', OLD.gym_id, 'clientId', OLD.client_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'DELETE', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;

-- ===== exercises (solo los propios del gimnasio; los globales van a exerciseLibrary) =====
CREATE TRIGGER trg_outbox_exercises_ai AFTER INSERT ON exercises
WHEN NEW.gym_id IS NOT NULL BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'exercises', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_exercises_au AFTER UPDATE ON exercises
WHEN NEW.gym_id IS NOT NULL BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'exercises', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_exercises_bd BEFORE DELETE ON exercises
WHEN OLD.gym_id IS NOT NULL BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'exercises', OLD.id, OLD.gym_id, 'DELETE',
            json_object('gymId', OLD.gym_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'DELETE', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;

-- ===== class_types (solo los propios del gimnasio) =====
CREATE TRIGGER trg_outbox_class_types_ai AFTER INSERT ON class_types
WHEN NEW.gym_id IS NOT NULL BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'class_types', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_class_types_au AFTER UPDATE ON class_types
WHEN NEW.gym_id IS NOT NULL BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'class_types', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_class_types_bd BEFORE DELETE ON class_types
WHEN OLD.gym_id IS NOT NULL BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'class_types', OLD.id, OLD.gym_id, 'DELETE',
            json_object('gymId', OLD.gym_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'DELETE', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;

-- ===== routines =====
CREATE TRIGGER trg_outbox_routines_ai AFTER INSERT ON routines BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'routines', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_routines_au AFTER UPDATE ON routines BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'routines', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_routines_bd BEFORE DELETE ON routines BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'routines', OLD.id, OLD.gym_id, 'DELETE',
            json_object('gymId', OLD.gym_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'DELETE', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;

-- ===== routine_exercises (gym_id vía routines; en Firestore: colección plana con routineId) =====
CREATE TRIGGER trg_outbox_routine_exercises_ai AFTER INSERT ON routine_exercises BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'routine_exercises', NEW.id,
            (SELECT gym_id FROM routines WHERE id = NEW.routine_id), 'UPSERT',
            json_object('gymId', (SELECT gym_id FROM routines WHERE id = NEW.routine_id), 'routineId', NEW.routine_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_routine_exercises_au AFTER UPDATE ON routine_exercises BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'routine_exercises', NEW.id,
            (SELECT gym_id FROM routines WHERE id = NEW.routine_id), 'UPSERT',
            json_object('gymId', (SELECT gym_id FROM routines WHERE id = NEW.routine_id), 'routineId', NEW.routine_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_routine_exercises_bd BEFORE DELETE ON routine_exercises BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'routine_exercises', OLD.id,
            (SELECT gym_id FROM routines WHERE id = OLD.routine_id), 'DELETE',
            json_object('gymId', (SELECT gym_id FROM routines WHERE id = OLD.routine_id), 'routineId', OLD.routine_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'DELETE', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;

-- ===== routine_assignments (cliente-propietario) =====
CREATE TRIGGER trg_outbox_routine_assignments_ai AFTER INSERT ON routine_assignments BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'routine_assignments', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id, 'clientId', NEW.client_id, 'routineId', NEW.routine_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_routine_assignments_au AFTER UPDATE ON routine_assignments BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'routine_assignments', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id, 'clientId', NEW.client_id, 'routineId', NEW.routine_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_routine_assignments_bd BEFORE DELETE ON routine_assignments BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'routine_assignments', OLD.id, OLD.gym_id, 'DELETE',
            json_object('gymId', OLD.gym_id, 'clientId', OLD.client_id, 'routineId', OLD.routine_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'DELETE', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;

-- ===== classes =====
CREATE TRIGGER trg_outbox_classes_ai AFTER INSERT ON classes BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'classes', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_classes_au AFTER UPDATE ON classes BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'classes', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_classes_bd BEFORE DELETE ON classes BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'classes', OLD.id, OLD.gym_id, 'DELETE',
            json_object('gymId', OLD.gym_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'DELETE', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;

-- ===== class_blocks (Firestore: colección plana con classId) =====
CREATE TRIGGER trg_outbox_class_blocks_ai AFTER INSERT ON class_blocks BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'class_blocks', NEW.id,
            (SELECT gym_id FROM classes WHERE id = NEW.class_id), 'UPSERT',
            json_object('gymId', (SELECT gym_id FROM classes WHERE id = NEW.class_id), 'classId', NEW.class_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_class_blocks_au AFTER UPDATE ON class_blocks BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'class_blocks', NEW.id,
            (SELECT gym_id FROM classes WHERE id = NEW.class_id), 'UPSERT',
            json_object('gymId', (SELECT gym_id FROM classes WHERE id = NEW.class_id), 'classId', NEW.class_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_class_blocks_bd BEFORE DELETE ON class_blocks BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'class_blocks', OLD.id,
            (SELECT gym_id FROM classes WHERE id = OLD.class_id), 'DELETE',
            json_object('gymId', (SELECT gym_id FROM classes WHERE id = OLD.class_id), 'classId', OLD.class_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'DELETE', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;

-- ===== class_block_exercises (Firestore: colección plana con classId + blockId) =====
CREATE TRIGGER trg_outbox_class_block_exercises_ai AFTER INSERT ON class_block_exercises BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'class_block_exercises', NEW.id,
            (SELECT c.gym_id FROM class_blocks b JOIN classes c ON c.id = b.class_id WHERE b.id = NEW.block_id), 'UPSERT',
            json_object('gymId', (SELECT c.gym_id FROM class_blocks b JOIN classes c ON c.id = b.class_id WHERE b.id = NEW.block_id),
                        'classId', (SELECT class_id FROM class_blocks WHERE id = NEW.block_id),
                        'blockId', NEW.block_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_class_block_exercises_au AFTER UPDATE ON class_block_exercises BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'class_block_exercises', NEW.id,
            (SELECT c.gym_id FROM class_blocks b JOIN classes c ON c.id = b.class_id WHERE b.id = NEW.block_id), 'UPSERT',
            json_object('gymId', (SELECT c.gym_id FROM class_blocks b JOIN classes c ON c.id = b.class_id WHERE b.id = NEW.block_id),
                        'classId', (SELECT class_id FROM class_blocks WHERE id = NEW.block_id),
                        'blockId', NEW.block_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_class_block_exercises_bd BEFORE DELETE ON class_block_exercises BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'class_block_exercises', OLD.id,
            (SELECT c.gym_id FROM class_blocks b JOIN classes c ON c.id = b.class_id WHERE b.id = OLD.block_id), 'DELETE',
            json_object('gymId', (SELECT c.gym_id FROM class_blocks b JOIN classes c ON c.id = b.class_id WHERE b.id = OLD.block_id),
                        'classId', (SELECT class_id FROM class_blocks WHERE id = OLD.block_id),
                        'blockId', OLD.block_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'DELETE', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;

-- ===== class_enrollments (cliente-propietario) =====
CREATE TRIGGER trg_outbox_class_enrollments_ai AFTER INSERT ON class_enrollments BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'class_enrollments', NEW.id,
            (SELECT gym_id FROM classes WHERE id = NEW.class_id), 'UPSERT',
            json_object('gymId', (SELECT gym_id FROM classes WHERE id = NEW.class_id), 'clientId', NEW.client_id, 'classId', NEW.class_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_class_enrollments_au AFTER UPDATE ON class_enrollments BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'class_enrollments', NEW.id,
            (SELECT gym_id FROM classes WHERE id = NEW.class_id), 'UPSERT',
            json_object('gymId', (SELECT gym_id FROM classes WHERE id = NEW.class_id), 'clientId', NEW.client_id, 'classId', NEW.class_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_class_enrollments_bd BEFORE DELETE ON class_enrollments BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'class_enrollments', OLD.id,
            (SELECT gym_id FROM classes WHERE id = OLD.class_id), 'DELETE',
            json_object('gymId', (SELECT gym_id FROM classes WHERE id = OLD.class_id), 'clientId', OLD.client_id, 'classId', OLD.class_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'DELETE', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;

-- ===== measurements (cliente-propietario) =====
CREATE TRIGGER trg_outbox_measurements_ai AFTER INSERT ON measurements BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'measurements', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id, 'clientId', NEW.client_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_measurements_au AFTER UPDATE ON measurements BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'measurements', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id, 'clientId', NEW.client_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_measurements_bd BEFORE DELETE ON measurements BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'measurements', OLD.id, OLD.gym_id, 'DELETE',
            json_object('gymId', OLD.gym_id, 'clientId', OLD.client_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'DELETE', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
