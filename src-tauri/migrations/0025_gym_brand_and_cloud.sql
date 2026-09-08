-- Campos que la app de clientes necesita y que el esquema local todavía no
-- tenía. Aditivo: ninguna consulta existente cambia de comportamiento.
--
-- gyms.brand_color   -> color de acento de la app por gimnasio (ej. "#22C55E").
-- gyms.logo_base64   -> logo YA optimizado (<=64px, data sin el prefijo
--                       "data:image/...;base64,"). Lo llena Configuración a
--                       partir de logo_path. Nunca se sube a Firebase Storage.
-- clients.cloud_uid  -> uid de Firebase Auth del cliente, una vez que el
--                       administrador le crea el acceso a la app. NULL = sin
--                       acceso creado todavía.

ALTER TABLE gyms ADD COLUMN brand_color TEXT;
ALTER TABLE gyms ADD COLUMN logo_base64 TEXT;
ALTER TABLE clients ADD COLUMN cloud_uid TEXT;
