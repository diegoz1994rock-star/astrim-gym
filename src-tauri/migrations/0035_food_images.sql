-- Foto de cada alimento del catálogo (panel: botón "Alimentos" junto al
-- plan de alimentación; app de clientes: imagen grande al elegir alimento).
-- Igual convención que gyms.logo_base64: imagen optimizada y embebida,
-- nunca Firebase Storage.
ALTER TABLE foods ADD COLUMN image_base64 TEXT;
