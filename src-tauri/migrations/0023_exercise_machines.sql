-- Vincula un ejercicio con la(s) máquina(s) que lo realizan (ej. "Curl
-- femoral sentado" -> Máquinas 1, 2 y 3). La relación es propia de cada
-- gimnasio (gym_id) aunque el ejercicio sea global (exercises.gym_id NULL):
-- el mismo ejercicio global puede corresponder a máquinas distintas en cada
-- gimnasio. Permite saber en vivo a qué máquina libre mandar a un cliente
-- cuando varias máquinas hacen el mismo ejercicio.
CREATE TABLE exercise_machines (
    id TEXT PRIMARY KEY,
    gym_id TEXT NOT NULL REFERENCES gyms(id),
    exercise_id TEXT NOT NULL REFERENCES exercises(id),
    machine_id TEXT NOT NULL REFERENCES machines(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_exercise_machines_unique ON exercise_machines(gym_id, exercise_id, machine_id);
CREATE INDEX idx_exercise_machines_exercise ON exercise_machines(gym_id, exercise_id);
CREATE INDEX idx_exercise_machines_machine ON exercise_machines(machine_id);
