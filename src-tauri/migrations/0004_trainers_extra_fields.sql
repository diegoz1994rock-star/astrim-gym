-- Campos adicionales del perfil de entrenador y unicidad de documento por gimnasio.
ALTER TABLE trainers ADD COLUMN birth_date TEXT;
ALTER TABLE trainers ADD COLUMN address TEXT;
ALTER TABLE trainers ADD COLUMN description TEXT;
ALTER TABLE trainers ADD COLUMN join_date TEXT;
ALTER TABLE trainers ADD COLUMN observations TEXT;

-- Mismo patrón que idx_clients_gym_document_unique (0003): único por gimnasio,
-- permite múltiples entrenadores sin documento (NULL).
CREATE UNIQUE INDEX idx_trainers_gym_document_unique
    ON trainers (gym_id, document)
    WHERE document IS NOT NULL;
