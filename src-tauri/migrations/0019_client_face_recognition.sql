-- Reconocimiento facial local como alternativa al código de asistencia.
-- Solo se guarda el embedding (vector de floats, JSON), nunca la foto de
-- enrolamiento: la foto se descarta en cuanto se calcula el embedding.
ALTER TABLE clients ADD COLUMN face_embedding TEXT;
ALTER TABLE clients ADD COLUMN face_consent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE clients ADD COLUMN face_enrolled_at TEXT;
