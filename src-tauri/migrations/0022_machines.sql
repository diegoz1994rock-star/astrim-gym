-- Módulo de Máquinas: cada máquina tiene un número visible (el que ve el
-- cliente en el piso, ej. "Máquina 1") y opcionalmente un grupo muscular.
-- Por ahora solo interesa el estado en vivo (libre / ocupada por quién),
-- sin historial de uso — se puede agregar una tabla de sesiones más
-- adelante si se necesita, sin tocar esta.
CREATE TABLE machines (
    id TEXT PRIMARY KEY,
    gym_id TEXT NOT NULL REFERENCES gyms(id),
    number INTEGER NOT NULL,
    name TEXT NOT NULL,
    muscle_group TEXT,
    current_client_id TEXT REFERENCES clients(id),
    occupied_since TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_machines_gym_number ON machines(gym_id, number);
CREATE INDEX idx_machines_gym ON machines(gym_id);
CREATE INDEX idx_machines_current_client ON machines(current_client_id);
