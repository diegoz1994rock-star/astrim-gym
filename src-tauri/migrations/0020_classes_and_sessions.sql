-- Módulo Clases y Sesiones: clases grupales programadas, con bloques de
-- entrenamiento y ejercicios propios de cada sesión (nunca modifican el
-- catálogo de exercises) y una lista de clientes inscritos. Primera
-- relación muchos-a-muchos del proyecto (class_enrollments).

-- Catálogo de tipos de clase, igual de extensible que exercises: filas
-- globales (gym_id NULL) más las que cada gimnasio decida agregar
-- después. No es un CHECK fijo porque debe poder ampliarse sin migrar.
CREATE TABLE class_types (
    id TEXT PRIMARY KEY,
    gym_id TEXT REFERENCES gyms(id),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE'
);

INSERT INTO class_types (id, gym_id, name) VALUES
    ('class_type_gimnasio', NULL, 'Gimnasio'),
    ('class_type_crossfit', NULL, 'CrossFit'),
    ('class_type_funcional', NULL, 'Entrenamiento funcional'),
    ('class_type_hiit', NULL, 'HIIT'),
    ('class_type_spinning', NULL, 'Spinning'),
    ('class_type_personalizado', NULL, 'Personalizado'),
    ('class_type_otra', NULL, 'Otra');

CREATE TABLE classes (
    id TEXT PRIMARY KEY,
    gym_id TEXT NOT NULL REFERENCES gyms(id),
    class_type_id TEXT NOT NULL REFERENCES class_types(id),
    trainer_id TEXT REFERENCES trainers(id),
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PROGRAMADA'
        CHECK (status IN ('PROGRAMADA','ABIERTA','COMPLETA','EN_CURSO','FINALIZADA','CANCELADA')),
    description TEXT,
    notes TEXT,
    -- Agrupa las sesiones generadas por "Repetir clase". NULL si la clase
    -- es única. Cada ocurrencia es una fila independiente (con su propia
    -- copia de bloques/ejercicios) para que editar una no afecte a las
    -- demás.
    recurrence_group_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_classes_gym_date ON classes(gym_id, date);
CREATE INDEX idx_classes_recurrence_group ON classes(recurrence_group_id);

CREATE TABLE class_blocks (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES classes(id),
    name TEXT NOT NULL,
    block_type TEXT NOT NULL DEFAULT 'PERSONALIZADO'
        CHECK (block_type IN ('CALENTAMIENTO','MOVILIDAD','FUERZA','TECNICA','WOD','CARDIO','ENFRIAMIENTO','PERSONALIZADO')),
    sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_class_blocks_class ON class_blocks(class_id);

-- Mismo principio que routine_exercises: columnas propias de la sesión,
-- referencia al ejercicio del catálogo solo por id. Modificar (o incluso
-- desactivar, exercises usa soft-delete) el ejercicio original nunca
-- cambia esta configuración histórica.
CREATE TABLE class_block_exercises (
    id TEXT PRIMARY KEY,
    block_id TEXT NOT NULL REFERENCES class_blocks(id),
    exercise_id TEXT NOT NULL REFERENCES exercises(id),
    sets INTEGER,
    reps INTEGER,
    weight REAL,
    rest_seconds INTEGER,
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_class_block_exercises_block ON class_block_exercises(block_id);

-- Primera tabla muchos-a-muchos del proyecto. WAITLISTED ya existe en el
-- CHECK (sin lógica todavía) para no tener que migrar el esquema otra vez
-- cuando se implemente la lista de espera.
CREATE TABLE class_enrollments (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES classes(id),
    client_id TEXT NOT NULL REFERENCES clients(id),
    status TEXT NOT NULL DEFAULT 'ENROLLED' CHECK (status IN ('ENROLLED','WAITLISTED','CANCELLED')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_class_enrollments_unique ON class_enrollments(class_id, client_id) WHERE status != 'CANCELLED';
CREATE INDEX idx_class_enrollments_class ON class_enrollments(class_id);
CREATE INDEX idx_class_enrollments_client ON class_enrollments(client_id);
