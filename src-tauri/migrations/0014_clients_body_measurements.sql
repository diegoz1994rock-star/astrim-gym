-- Medidas corporales ACTUALES del cliente (independientes del historial de
-- Progreso en la tabla measurements). Mismo patrón ya usado por
-- clients.weight/clients.height desde 0001: un snapshot editable en el
-- perfil del cliente, separado del histórico cronológico de mediciones.
-- Mismos nombres de columna que measurements (waist, chest, arm, leg,
-- calf, hip, body_fat, muscle_mass) para reutilizar exactamente las mismas
-- reglas de validación y evitar una estructura paralela.
-- Todas nullable y sin CHECK ni default (se valida en la aplicación, mismo
-- criterio que 0008/0010): los clientes existentes quedan en NULL, nunca
-- en 0, que sería un valor incorrecto para una medida corporal.
ALTER TABLE clients ADD COLUMN waist REAL;
ALTER TABLE clients ADD COLUMN chest REAL;
ALTER TABLE clients ADD COLUMN arm REAL;
ALTER TABLE clients ADD COLUMN leg REAL;
ALTER TABLE clients ADD COLUMN calf REAL;
ALTER TABLE clients ADD COLUMN hip REAL;
ALTER TABLE clients ADD COLUMN body_fat REAL;
ALTER TABLE clients ADD COLUMN muscle_mass REAL;
