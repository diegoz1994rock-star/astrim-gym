-- Antes una rutina solo podía asignarse a un cliente a la vez
-- (routines.client_id). El gimnasio necesita armar la rutina una sola vez
-- (con todos sus ejercicios) y luego asignarla a tantos clientes como
-- quiera, cada uno con su propia vigencia — igual que class_enrollments ya
-- permite varios clientes por clase. routines.client_id/start_date/end_date
-- quedan sin uso desde ahora; no se borran de la tabla para no arriesgar
-- una migración destructiva sobre datos ya guardados, pero toda asignación
-- nueva vive en routine_assignments.
CREATE TABLE routine_assignments (
    id TEXT PRIMARY KEY,
    gym_id TEXT NOT NULL REFERENCES gyms(id),
    routine_id TEXT NOT NULL REFERENCES routines(id),
    client_id TEXT NOT NULL REFERENCES clients(id),
    start_date TEXT,
    end_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_routine_assignments_unique ON routine_assignments(routine_id, client_id);
CREATE INDEX idx_routine_assignments_routine ON routine_assignments(routine_id);
CREATE INDEX idx_routine_assignments_client ON routine_assignments(client_id);

-- Migra asignaciones ya hechas con el flujo anterior (una rutina, un
-- cliente) para no perder trabajo ya guardado.
INSERT INTO routine_assignments (id, gym_id, routine_id, client_id, start_date, end_date, created_at, updated_at)
SELECT lower(hex(randomblob(16))), gym_id, id, client_id, start_date, end_date, created_at, updated_at
FROM routines
WHERE client_id IS NOT NULL;
