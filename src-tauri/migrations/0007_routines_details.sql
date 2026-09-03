-- Rutinas necesita objetivo/descripción, fechas de vigencia, estado y
-- observaciones. routine_exercises ya cubre lo mínimo indispensable
-- (ejercicio, orden, series, repeticiones, peso, descanso) y no se modifica.
--
-- Los valores por defecto usados aquí ('ACTIVE') son constantes, a
-- diferencia de la migración 0006 donde datetime('now') no era válido
-- como default en ALTER TABLE ADD COLUMN.
ALTER TABLE routines ADD COLUMN description TEXT;
ALTER TABLE routines ADD COLUMN start_date TEXT;
ALTER TABLE routines ADD COLUMN end_date TEXT;
ALTER TABLE routines ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE routines ADD COLUMN notes TEXT;
