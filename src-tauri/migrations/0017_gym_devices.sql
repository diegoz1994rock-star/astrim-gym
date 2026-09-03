-- Dispositivos autorizados del gimnasio (tablets de recepción, lectores
-- biométricos, torniquetes, etc.). Un dispositivo nunca inicia sesión como
-- administrador: se vincula mediante un código temporal de un solo uso y
-- recibe un token propio (api_token), distinto de cualquier contraseña.
CREATE TABLE devices (
    id TEXT PRIMARY KEY,
    gym_id TEXT NOT NULL REFERENCES gyms(id),
    name TEXT NOT NULL,
    device_type TEXT NOT NULL CHECK (device_type IN ('RECEPTION_TABLET', 'ADMIN_COMPUTER', 'BIOMETRIC_READER', 'ACCESS_GATE', 'OTHER')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'DISABLED', 'REVOKED')),
    platform TEXT,
    app_version TEXT,
    api_token TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen_at TEXT,
    last_sync_at TEXT
);
CREATE INDEX idx_devices_gym ON devices(gym_id);

-- Código de vinculación: temporal (expires_at), de un solo uso (status pasa
-- a USED al consumirse) y nunca sirve para autenticación administrativa.
-- El índice único parcial impide dos códigos PENDING iguales en el mismo
-- gimnasio a la vez.
CREATE TABLE device_pairing_codes (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL REFERENCES devices(id),
    gym_id TEXT NOT NULL REFERENCES gyms(id),
    code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'USED', 'EXPIRED', 'CANCELLED')),
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    used_at TEXT
);
CREATE UNIQUE INDEX idx_device_pairing_codes_active
    ON device_pairing_codes (gym_id, code)
    WHERE status = 'PENDING';
CREATE INDEX idx_device_pairing_codes_device ON device_pairing_codes(device_id);
