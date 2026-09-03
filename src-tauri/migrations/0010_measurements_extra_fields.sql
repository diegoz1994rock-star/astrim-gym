-- Progreso reutiliza measurements (ya existía desde 0001 con weight, height,
-- waist, chest, arm, leg, hip, body_fat, notes). Faltan dos medidas
-- explícitamente pedidas que no tenían columna propia: pantorrilla y masa
-- muscular. La columna existente "leg" se usa como "muslo" en la
-- aplicación (misma convención que muscle_group en exercises: nombre de
-- columna en inglés, etiqueta en español).
--
-- El IMC NUNCA se guarda aquí: se calcula en la aplicación a partir de
-- weight/height en cada lectura, tal como pide la especificación.
--
-- Sin datos DEMO en esta migración (mismo criterio que 0003-0009: solo
-- cambios de esquema, ningún INSERT de datos de ejemplo).
ALTER TABLE measurements ADD COLUMN calf REAL;
ALTER TABLE measurements ADD COLUMN muscle_mass REAL;

CREATE INDEX idx_measurements_gym_client ON measurements (gym_id, client_id);
