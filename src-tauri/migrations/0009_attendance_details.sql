-- Asistencia necesita poder relacionarse con la membresía vigente al
-- momento del check-in (referencia congelada, igual que payments.membership_id)
-- y observaciones opcionales. check_in/check_out/status ya existían desde 0001.
ALTER TABLE attendance ADD COLUMN membership_id TEXT REFERENCES memberships(id);
ALTER TABLE attendance ADD COLUMN notes TEXT;

-- Acelera la comprobación de "¿este cliente ya tiene una entrada abierta hoy?"
-- que se ejecuta en cada registro de asistencia.
CREATE INDEX idx_attendance_gym_client_date ON attendance (gym_id, client_id, date);
