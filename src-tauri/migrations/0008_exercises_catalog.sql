-- Catálogo de ejercicios: estado (activar/desactivar sin eliminar, igual
-- que clientes/entrenadores/planes) y tipo de ejercicio. 'status' se valida
-- en la aplicación (sin CHECK aquí, igual que routines.status en 0007).
ALTER TABLE exercises ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE exercises ADD COLUMN exercise_type TEXT;

-- Nombre único por gimnasio, insensible a mayúsculas (mismo patrón que
-- membership_plans en 0005). Solo aplica a ejercicios propios de un
-- gimnasio (gym_id NOT NULL): los ejercicios globales de la biblioteca
-- (gym_id NULL, ej. los (DEMO)) quedan fuera de esta restricción.
CREATE UNIQUE INDEX idx_exercises_gym_name_unique
    ON exercises (gym_id, name COLLATE NOCASE)
    WHERE gym_id IS NOT NULL;

CREATE INDEX idx_exercises_gym_status ON exercises (gym_id, status);
