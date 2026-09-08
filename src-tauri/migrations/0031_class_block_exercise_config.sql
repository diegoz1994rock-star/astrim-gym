-- Configuración por tipo de ejercicio en Clases/Sesiones, igual que en
-- Rutinas (migración 0013): un ejercicio de fuerza usa
-- series/reps/peso/descanso; uno de cardio usa tiempo + intensidad del
-- equipamiento. Antes `class_block_exercises` solo tenía las columnas de
-- fuerza, así que "Remo moderado" en una clase pedía series/reps (mal).
--
-- Columnas opcionales, sin CHECK: se validan en la capa de aplicación
-- (mismo criterio que routine_exercises). `notes` ya existía.

ALTER TABLE class_block_exercises ADD COLUMN time_value REAL;
ALTER TABLE class_block_exercises ADD COLUMN time_unit TEXT;
ALTER TABLE class_block_exercises ADD COLUMN speed_kmh REAL;
ALTER TABLE class_block_exercises ADD COLUMN incline_percent REAL;
ALTER TABLE class_block_exercises ADD COLUMN resistance_level INTEGER;
ALTER TABLE class_block_exercises ADD COLUMN rpm INTEGER;
ALTER TABLE class_block_exercises ADD COLUMN intensity_label TEXT;
