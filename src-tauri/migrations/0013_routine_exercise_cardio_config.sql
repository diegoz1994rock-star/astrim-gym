-- Configuración dinámica de ejercicios de rutina según su tipo: los
-- ejercicios de fuerza siguen usando sets/reps/weight/rest_seconds sin
-- cambios; los de cardio (y a futuro movilidad) usan tiempo + intensidad.
-- Todas las columnas son opcionales y sin CHECK: se validan en la capa de
-- aplicación (mismo criterio que exercises.status en 0008), evitando el
-- problema de defaults no constantes visto en la migración 0006.
ALTER TABLE routine_exercises ADD COLUMN notes TEXT;
ALTER TABLE routine_exercises ADD COLUMN time_value REAL;
ALTER TABLE routine_exercises ADD COLUMN time_unit TEXT;
ALTER TABLE routine_exercises ADD COLUMN speed_kmh REAL;
ALTER TABLE routine_exercises ADD COLUMN incline_percent REAL;
ALTER TABLE routine_exercises ADD COLUMN resistance_level INTEGER;
ALTER TABLE routine_exercises ADD COLUMN rpm INTEGER;
ALTER TABLE routine_exercises ADD COLUMN intensity_label TEXT;
