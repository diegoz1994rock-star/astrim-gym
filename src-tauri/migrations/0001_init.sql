-- Esquema inicial de ASTRIM GYM.
-- Diseñado multi-tenant desde el inicio: casi toda tabla lleva gym_id,
-- aunque en esta fase solo exista un gimnasio local.

CREATE TABLE gyms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    license_status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (license_status IN ('ACTIVE', 'GRACE_PERIOD', 'SUSPENDED', 'CANCELLED')),
    license_plan TEXT,
    license_start_date TEXT,
    license_expiration_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    gym_id TEXT REFERENCES gyms(id), -- NULL únicamente para SUPERADMIN
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('SUPERADMIN', 'ADMIN', 'TRAINER', 'CLIENT')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    last_login_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE trainers (
    id TEXT PRIMARY KEY,
    gym_id TEXT NOT NULL REFERENCES gyms(id),
    user_id TEXT REFERENCES users(id),
    name TEXT NOT NULL,
    document TEXT,
    phone TEXT,
    email TEXT,
    specialty TEXT,
    photo_path TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE membership_plans (
    id TEXT PRIMARY KEY,
    gym_id TEXT NOT NULL REFERENCES gyms(id),
    name TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    price REAL NOT NULL,
    description TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE clients (
    id TEXT PRIMARY KEY,
    gym_id TEXT NOT NULL REFERENCES gyms(id),
    user_id TEXT REFERENCES users(id),
    name TEXT NOT NULL,
    document TEXT,
    birth_date TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    weight REAL,
    height REAL,
    gender TEXT,
    goal TEXT,
    trainer_id TEXT REFERENCES trainers(id),
    join_date TEXT,
    photo_path TEXT,
    observations TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE memberships (
    id TEXT PRIMARY KEY,
    gym_id TEXT NOT NULL REFERENCES gyms(id),
    client_id TEXT NOT NULL REFERENCES clients(id),
    plan_id TEXT NOT NULL REFERENCES membership_plans(id),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    price REAL NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PAID', 'PENDING')),
    method TEXT,
    manual_status TEXT CHECK (manual_status IN ('SUSPENDED', 'CANCELLED')),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE payments (
    id TEXT PRIMARY KEY,
    gym_id TEXT NOT NULL REFERENCES gyms(id),
    client_id TEXT NOT NULL REFERENCES clients(id),
    membership_id TEXT REFERENCES memberships(id),
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('CASH', 'TRANSFER', 'OTHER')),
    status TEXT NOT NULL DEFAULT 'PAID' CHECK (status IN ('PAID', 'PENDING')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE exercises (
    id TEXT PRIMARY KEY,
    gym_id TEXT REFERENCES gyms(id), -- NULL = ejercicio global de la biblioteca
    name TEXT NOT NULL,
    description TEXT,
    muscle_group TEXT,
    secondary_muscles TEXT,
    level TEXT CHECK (level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
    equipment TEXT,
    instructions TEXT,
    common_mistakes TEXT,
    image_path TEXT,
    video_path TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE routines (
    id TEXT PRIMARY KEY,
    gym_id TEXT NOT NULL REFERENCES gyms(id),
    client_id TEXT REFERENCES clients(id),
    trainer_id TEXT REFERENCES trainers(id),
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE routine_exercises (
    id TEXT PRIMARY KEY,
    routine_id TEXT NOT NULL REFERENCES routines(id),
    exercise_id TEXT NOT NULL REFERENCES exercises(id),
    sets INTEGER,
    reps INTEGER,
    weight REAL,
    rest_seconds INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE measurements (
    id TEXT PRIMARY KEY,
    gym_id TEXT NOT NULL REFERENCES gyms(id),
    client_id TEXT NOT NULL REFERENCES clients(id),
    date TEXT NOT NULL,
    weight REAL,
    height REAL,
    waist REAL,
    chest REAL,
    arm REAL,
    leg REAL,
    hip REAL,
    body_fat REAL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE attendance (
    id TEXT PRIMARY KEY,
    gym_id TEXT NOT NULL REFERENCES gyms(id),
    client_id TEXT NOT NULL REFERENCES clients(id),
    date TEXT NOT NULL,
    check_in TEXT,
    check_out TEXT,
    status TEXT NOT NULL DEFAULT 'PRESENT' CHECK (status IN ('PRESENT', 'ABSENT')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_gym ON users(gym_id);
CREATE INDEX idx_trainers_gym ON trainers(gym_id);
CREATE INDEX idx_clients_gym ON clients(gym_id);
CREATE INDEX idx_clients_trainer ON clients(trainer_id);
CREATE INDEX idx_memberships_gym ON memberships(gym_id);
CREATE INDEX idx_memberships_client ON memberships(client_id);
CREATE INDEX idx_memberships_end_date ON memberships(end_date);
CREATE INDEX idx_payments_gym ON payments(gym_id);
CREATE INDEX idx_payments_date ON payments(date);
CREATE INDEX idx_exercises_gym ON exercises(gym_id);
CREATE INDEX idx_routines_gym ON routines(gym_id);
CREATE INDEX idx_routines_client ON routines(client_id);
CREATE INDEX idx_routine_exercises_routine ON routine_exercises(routine_id);
CREATE INDEX idx_measurements_client ON measurements(client_id);
CREATE INDEX idx_attendance_gym_date ON attendance(gym_id, date);
CREATE INDEX idx_attendance_client ON attendance(client_id);
