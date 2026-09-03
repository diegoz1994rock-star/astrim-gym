-- El documento de un cliente no puede repetirse dentro del mismo gimnasio.
-- Índice parcial: permite múltiples clientes sin documento (NULL) sin violar la restricción.
CREATE UNIQUE INDEX idx_clients_gym_document_unique
    ON clients (gym_id, document)
    WHERE document IS NOT NULL;
