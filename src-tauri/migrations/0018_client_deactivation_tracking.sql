-- Registra CUÁNDO un cliente pasó a INACTIVE, para poder calcular "bajas por
-- mes" de verdad en el Dashboard. No se reconstruye el pasado (los
-- clientes ya inactivos antes de esta migración quedan con esta columna en
-- NULL): es preferible no mostrar ese dato histórico a inventarlo a partir
-- de updated_at, que cambia con cualquier edición no relacionada.
ALTER TABLE clients ADD COLUMN deactivated_at TEXT;
