-- El módulo de Pagos necesita registrar el concepto/motivo del pago
-- ("Concepto / motivo" en la pantalla de Pagos) y una marca de última
-- modificación para la edición limitada (solo concepto y método, nunca
-- monto/fecha/cliente/membresía, para no falsificar el historial financiero).
--
-- updated_at se agrega sin NOT NULL/DEFAULT porque SQLite no permite un
-- default no constante (datetime('now')) en ALTER TABLE ADD COLUMN. Queda
-- NULL para los pagos existentes (nunca editados) y la app siempre escribe
-- datetime('now') explícitamente en cada UPDATE.
ALTER TABLE payments ADD COLUMN concept TEXT;
ALTER TABLE payments ADD COLUMN updated_at TEXT;
