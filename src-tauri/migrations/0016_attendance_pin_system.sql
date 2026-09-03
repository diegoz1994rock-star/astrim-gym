-- Sistema de asistencia por código PIN de 6 dígitos.
--
-- attendance_code es un identificador operativo distinto de client_id:
-- se usa solo para registrar entrada/salida en recepción, nunca como
-- contraseña ni como clave de acceso al panel. Único por gimnasio (nunca
-- entre gimnasios), y nulo hasta que se genera explícitamente.
ALTER TABLE clients ADD COLUMN attendance_code TEXT;
CREATE UNIQUE INDEX idx_clients_gym_attendance_code
    ON clients (gym_id, attendance_code)
    WHERE attendance_code IS NOT NULL;

-- entry_method/exit_method registran cómo se autorizó cada evento (PIN hoy;
-- QR/APP/BIOMETRIC quedan como valores futuros ya soportados por el esquema
-- sin necesitar otra migración). device_id identifica la estación de
-- recepción que originó el registro. El status/CHECK existente de
-- attendance no se toca: "abierta"/"completada" ya se puede derivar de
-- check_out IS NULL, tal como hace hoy findOpenAttendanceForClientToday.
ALTER TABLE attendance ADD COLUMN entry_method TEXT;
ALTER TABLE attendance ADD COLUMN exit_method TEXT;
ALTER TABLE attendance ADD COLUMN device_id TEXT;

-- Ventana anti-doble-toque configurable por gimnasio (segundos). Evita que
-- volver a marcar el mismo PIN pocos segundos después de la entrada se
-- registre por accidente como salida. 30 es el valor por defecto, no un
-- valor fijo en código: se puede ajustar por gimnasio sin nueva migración.
ALTER TABLE gyms ADD COLUMN attendance_duplicate_window_seconds INTEGER NOT NULL DEFAULT 30;

-- Cola de sincronización: hoy el único proveedor real es LocalSyncProvider
-- (la propia base local ya es la fuente de verdad, por lo que cada evento
-- se marca SYNCED de inmediato). La tabla existe para que un futuro
-- proveedor remoto (Firebase, red local) tenga de dónde leer los eventos
-- PENDING sin rediseñar el esquema.
CREATE TABLE attendance_sync_queue (
    id TEXT PRIMARY KEY,
    gym_id TEXT NOT NULL REFERENCES gyms(id),
    attendance_id TEXT NOT NULL REFERENCES attendance(id),
    client_id TEXT NOT NULL REFERENCES clients(id),
    device_id TEXT,
    event_type TEXT NOT NULL CHECK (event_type IN ('ENTRY', 'EXIT')),
    sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    synced_at TEXT
);
CREATE INDEX idx_attendance_sync_queue_status ON attendance_sync_queue (gym_id, sync_status);
