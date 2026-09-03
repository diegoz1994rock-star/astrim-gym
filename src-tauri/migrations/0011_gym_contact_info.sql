-- Configuración necesita datos de contacto del gimnasio que "gyms" todavía
-- no tenía (hasta ahora solo guardaba identidad/licencia: name, slug,
-- license_*). Se reutiliza la tabla existente, no se crea una tabla nueva
-- de configuración: esta ES la fuente de verdad del gimnasio.
--
-- logo_path sigue el mismo patrón ya existente en Clientes/Entrenadores
-- (photoService/pickPersonPhoto): una referencia a un archivo local
-- elegido por el usuario, no una copia gestionada por la aplicación.
ALTER TABLE gyms ADD COLUMN phone TEXT;
ALTER TABLE gyms ADD COLUMN email TEXT;
ALTER TABLE gyms ADD COLUMN address TEXT;
ALTER TABLE gyms ADD COLUMN city TEXT;
ALTER TABLE gyms ADD COLUMN logo_path TEXT;
