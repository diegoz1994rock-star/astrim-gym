-- Plan de Alimentación: catálogo de alimentos + planes armados por el
-- entrenador y asignados a clientes. Misma forma que
-- routines/routine_exercises/routine_assignments (0001, 0021): una plantilla
-- (meal_plans) con items (meal_plan_items) que se asigna a N clientes
-- (meal_plan_assignments), cada uno con su propia vigencia.
--
-- `foods` es un catálogo (igual que exercises): gym_id NULL = alimento
-- global de la librería común, gym_id NOT NULL = alimento propio del
-- gimnasio. Los macros son por 100 g/ml salvo que default_unit = 'unidad'
-- (ej. huevo), donde son por unidad. category/meal_type/default_unit no
-- llevan CHECK (se validan en src/lib/domain/, igual que routines.status).

CREATE TABLE foods (
    id TEXT PRIMARY KEY,
    gym_id TEXT REFERENCES gyms(id), -- NULL = catálogo global
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- PROTEINA | CARBOHIDRATO | LEGUMBRE | VERDURA | FRUTA | LACTEO | GRASA | BEBIDA | OTRO
    default_unit TEXT NOT NULL DEFAULT 'g', -- g | ml | unidad | porcion | cucharada | taza
    calories_kcal REAL,
    protein_g REAL,
    carbs_g REAL,
    fat_g REAL,
    fiber_g REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_foods_gym ON foods(gym_id);
CREATE INDEX idx_foods_category ON foods(category);

CREATE TABLE meal_plans (
    id TEXT PRIMARY KEY,
    gym_id TEXT NOT NULL REFERENCES gyms(id),
    trainer_id TEXT REFERENCES trainers(id),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    notes TEXT,
    daily_calories_target REAL,
    daily_protein_target REAL,
    daily_carbs_target REAL,
    daily_fat_target REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_meal_plans_gym ON meal_plans(gym_id);

CREATE TABLE meal_plan_items (
    id TEXT PRIMARY KEY,
    meal_plan_id TEXT NOT NULL REFERENCES meal_plans(id),
    food_id TEXT REFERENCES foods(id), -- NULL si es un alimento libre (custom_food_name)
    custom_food_name TEXT,
    meal_type TEXT NOT NULL DEFAULT 'DESAYUNO', -- DESAYUNO | MEDIA_MANANA | ALMUERZO | MERIENDA | CENA | POST_ENTRENO | OTRO
    quantity REAL NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'g',
    calories_kcal REAL,
    protein_g REAL,
    carbs_g REAL,
    fat_g REAL,
    notes TEXT,
    photo_base64 TEXT, -- foto del plato/porción (misma convención que gyms.logo_base64: pequeña, optimizada, embebida)
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_meal_plan_items_plan ON meal_plan_items(meal_plan_id);

CREATE TABLE meal_plan_assignments (
    id TEXT PRIMARY KEY,
    gym_id TEXT NOT NULL REFERENCES gyms(id),
    meal_plan_id TEXT NOT NULL REFERENCES meal_plans(id),
    client_id TEXT NOT NULL REFERENCES clients(id),
    start_date TEXT,
    end_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_meal_plan_assignments_unique ON meal_plan_assignments(meal_plan_id, client_id);
CREATE INDEX idx_meal_plan_assignments_plan ON meal_plan_assignments(meal_plan_id);
CREATE INDEX idx_meal_plan_assignments_client ON meal_plan_assignments(client_id);

-- ---------------------------------------------------------------------------
-- Outbox: mismo patrón que 0024_cloud_sync_outbox.sql (AFTER INSERT/UPDATE ->
-- UPSERT, BEFORE DELETE -> DELETE, coalescing vía ON CONFLICT).
-- ---------------------------------------------------------------------------

-- ===== foods (solo los propios del gimnasio; los globales no se sincronizan, igual que exercises) =====
CREATE TRIGGER trg_outbox_foods_ai AFTER INSERT ON foods
WHEN NEW.gym_id IS NOT NULL BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'foods', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_foods_au AFTER UPDATE ON foods
WHEN NEW.gym_id IS NOT NULL BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'foods', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_foods_bd BEFORE DELETE ON foods
WHEN OLD.gym_id IS NOT NULL BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'foods', OLD.id, OLD.gym_id, 'DELETE',
            json_object('gymId', OLD.gym_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'DELETE', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;

-- ===== meal_plans =====
CREATE TRIGGER trg_outbox_meal_plans_ai AFTER INSERT ON meal_plans BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'meal_plans', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_meal_plans_au AFTER UPDATE ON meal_plans BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'meal_plans', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_meal_plans_bd BEFORE DELETE ON meal_plans BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'meal_plans', OLD.id, OLD.gym_id, 'DELETE',
            json_object('gymId', OLD.gym_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'DELETE', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;

-- ===== meal_plan_items (gym_id vía meal_plans; en Firestore: colección plana con mealPlanId) =====
CREATE TRIGGER trg_outbox_meal_plan_items_ai AFTER INSERT ON meal_plan_items BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'meal_plan_items', NEW.id,
            (SELECT gym_id FROM meal_plans WHERE id = NEW.meal_plan_id), 'UPSERT',
            json_object('gymId', (SELECT gym_id FROM meal_plans WHERE id = NEW.meal_plan_id), 'mealPlanId', NEW.meal_plan_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_meal_plan_items_au AFTER UPDATE ON meal_plan_items BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'meal_plan_items', NEW.id,
            (SELECT gym_id FROM meal_plans WHERE id = NEW.meal_plan_id), 'UPSERT',
            json_object('gymId', (SELECT gym_id FROM meal_plans WHERE id = NEW.meal_plan_id), 'mealPlanId', NEW.meal_plan_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_meal_plan_items_bd BEFORE DELETE ON meal_plan_items BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'meal_plan_items', OLD.id,
            (SELECT gym_id FROM meal_plans WHERE id = OLD.meal_plan_id), 'DELETE',
            json_object('gymId', (SELECT gym_id FROM meal_plans WHERE id = OLD.meal_plan_id), 'mealPlanId', OLD.meal_plan_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'DELETE', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;

-- ===== meal_plan_assignments (cliente-propietario) =====
CREATE TRIGGER trg_outbox_meal_plan_assignments_ai AFTER INSERT ON meal_plan_assignments BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'meal_plan_assignments', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id, 'clientId', NEW.client_id, 'mealPlanId', NEW.meal_plan_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_meal_plan_assignments_au AFTER UPDATE ON meal_plan_assignments BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'meal_plan_assignments', NEW.id, NEW.gym_id, 'UPSERT',
            json_object('gymId', NEW.gym_id, 'clientId', NEW.client_id, 'mealPlanId', NEW.meal_plan_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'UPSERT', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;
CREATE TRIGGER trg_outbox_meal_plan_assignments_bd BEFORE DELETE ON meal_plan_assignments BEGIN
    INSERT INTO outbox (id, entity, entity_id, gym_id, op, payload)
    VALUES (lower(hex(randomblob(16))), 'meal_plan_assignments', OLD.id, OLD.gym_id, 'DELETE',
            json_object('gymId', OLD.gym_id, 'clientId', OLD.client_id, 'mealPlanId', OLD.meal_plan_id))
    ON CONFLICT (entity, entity_id) WHERE status = 'PENDING'
    DO UPDATE SET op = 'DELETE', payload = excluded.payload, enqueued_at = datetime('now'), attempts = 0, last_error = NULL;
END;

-- ---------------------------------------------------------------------------
-- Catálogo global de alimentos comunes (gym_id NULL). Macros por 100 g/ml,
-- salvo default_unit = 'unidad' (macros por unidad). Valores de referencia
-- nutricional estándar (USDA/tablas de composición de alimentos).
-- ---------------------------------------------------------------------------

-- PROTEINA
INSERT INTO foods (id, gym_id, name, category, default_unit, calories_kcal, protein_g, carbs_g, fat_g, fiber_g) VALUES
(lower(hex(randomblob(16))), NULL, 'Pechuga de pollo (sin piel)', 'PROTEINA', 'g', 165, 31, 0, 3.6, 0),
(lower(hex(randomblob(16))), NULL, 'Muslo de pollo (sin piel)', 'PROTEINA', 'g', 172, 24, 0, 8.2, 0),
(lower(hex(randomblob(16))), NULL, 'Carne de res magra (lomo)', 'PROTEINA', 'g', 187, 26, 0, 8.7, 0),
(lower(hex(randomblob(16))), NULL, 'Carne de res molida (magra)', 'PROTEINA', 'g', 176, 20, 0, 10, 0),
(lower(hex(randomblob(16))), NULL, 'Carne de cerdo (lomo)', 'PROTEINA', 'g', 143, 26, 0, 3.5, 0),
(lower(hex(randomblob(16))), NULL, 'Chuleta de cerdo', 'PROTEINA', 'g', 231, 25, 0, 14, 0),
(lower(hex(randomblob(16))), NULL, 'Tocineta / tocino', 'PROTEINA', 'g', 541, 37, 1.4, 42, 0),
(lower(hex(randomblob(16))), NULL, 'Pescado tilapia', 'PROTEINA', 'g', 96, 20.1, 0, 1.7, 0),
(lower(hex(randomblob(16))), NULL, 'Pescado salmón', 'PROTEINA', 'g', 208, 20, 0, 13, 0),
(lower(hex(randomblob(16))), NULL, 'Atún fresco', 'PROTEINA', 'g', 132, 28, 0, 1.3, 0),
(lower(hex(randomblob(16))), NULL, 'Atún enlatado en agua', 'PROTEINA', 'g', 116, 26, 0, 0.8, 0),
(lower(hex(randomblob(16))), NULL, 'Camarones', 'PROTEINA', 'g', 99, 24, 0.2, 0.3, 0),
(lower(hex(randomblob(16))), NULL, 'Pechuga de pavo', 'PROTEINA', 'g', 135, 30, 0, 1, 0),
(lower(hex(randomblob(16))), NULL, 'Huevo entero', 'PROTEINA', 'unidad', 78, 6.3, 0.6, 5.3, 0),
(lower(hex(randomblob(16))), NULL, 'Clara de huevo', 'PROTEINA', 'unidad', 17, 3.6, 0.2, 0.1, 0),
(lower(hex(randomblob(16))), NULL, 'Jamón de cerdo', 'PROTEINA', 'g', 145, 21, 1.5, 5.5, 0),
(lower(hex(randomblob(16))), NULL, 'Queso fresco / queso costeño', 'PROTEINA', 'g', 264, 18, 3, 20, 0),
(lower(hex(randomblob(16))), NULL, 'Queso mozzarella', 'PROTEINA', 'g', 280, 28, 3.1, 17, 0),
(lower(hex(randomblob(16))), NULL, 'Queso campesino', 'PROTEINA', 'g', 300, 20, 2, 24, 0),
(lower(hex(randomblob(16))), NULL, 'Tofu', 'PROTEINA', 'g', 76, 8, 1.9, 4.8, 0.3),
(lower(hex(randomblob(16))), NULL, 'Proteína en polvo (whey, 1 scoop 30 g)', 'PROTEINA', 'porcion', 120, 24, 3, 1.5, 0);

-- CARBOHIDRATO
INSERT INTO foods (id, gym_id, name, category, default_unit, calories_kcal, protein_g, carbs_g, fat_g, fiber_g) VALUES
(lower(hex(randomblob(16))), NULL, 'Arroz blanco cocido', 'CARBOHIDRATO', 'g', 130, 2.7, 28, 0.3, 0.4),
(lower(hex(randomblob(16))), NULL, 'Arroz integral cocido', 'CARBOHIDRATO', 'g', 123, 2.6, 26, 1, 1.8),
(lower(hex(randomblob(16))), NULL, 'Papa cocida', 'CARBOHIDRATO', 'g', 87, 1.9, 20, 0.1, 1.8),
(lower(hex(randomblob(16))), NULL, 'Papa criolla', 'CARBOHIDRATO', 'g', 90, 2.1, 20.5, 0.1, 1.5),
(lower(hex(randomblob(16))), NULL, 'Yuca cocida', 'CARBOHIDRATO', 'g', 160, 1.4, 38, 0.3, 1.8),
(lower(hex(randomblob(16))), NULL, 'Plátano verde (cocido)', 'CARBOHIDRATO', 'g', 122, 1.3, 32, 0.3, 2.3),
(lower(hex(randomblob(16))), NULL, 'Plátano maduro', 'CARBOHIDRATO', 'g', 122, 1.3, 32, 0.3, 2.3),
(lower(hex(randomblob(16))), NULL, 'Pasta cocida', 'CARBOHIDRATO', 'g', 131, 5, 25, 1.1, 1.8),
(lower(hex(randomblob(16))), NULL, 'Pan blanco', 'CARBOHIDRATO', 'g', 265, 9, 49, 3.2, 2.7),
(lower(hex(randomblob(16))), NULL, 'Pan integral', 'CARBOHIDRATO', 'g', 247, 13, 41, 4.2, 7),
(lower(hex(randomblob(16))), NULL, 'Avena en hojuelas (cruda)', 'CARBOHIDRATO', 'g', 389, 17, 66, 7, 10.6),
(lower(hex(randomblob(16))), NULL, 'Quinoa cocida', 'CARBOHIDRATO', 'g', 120, 4.4, 21, 1.9, 2.8),
(lower(hex(randomblob(16))), NULL, 'Camote / batata cocida', 'CARBOHIDRATO', 'g', 90, 2, 21, 0.1, 3.3),
(lower(hex(randomblob(16))), NULL, 'Maíz (mazorca)', 'CARBOHIDRATO', 'g', 96, 3.4, 21, 1.5, 2.4),
(lower(hex(randomblob(16))), NULL, 'Arepa de maíz', 'CARBOHIDRATO', 'g', 217, 5.4, 44, 2.1, 3.5),
(lower(hex(randomblob(16))), NULL, 'Galletas de soda', 'CARBOHIDRATO', 'g', 421, 9, 74, 10, 3);

-- LEGUMBRE
INSERT INTO foods (id, gym_id, name, category, default_unit, calories_kcal, protein_g, carbs_g, fat_g, fiber_g) VALUES
(lower(hex(randomblob(16))), NULL, 'Frijoles rojos cocidos', 'LEGUMBRE', 'g', 127, 8.7, 22.8, 0.5, 6.4),
(lower(hex(randomblob(16))), NULL, 'Frijoles negros cocidos', 'LEGUMBRE', 'g', 132, 8.9, 23.7, 0.5, 8.7),
(lower(hex(randomblob(16))), NULL, 'Lentejas cocidas', 'LEGUMBRE', 'g', 116, 9, 20, 0.4, 7.9),
(lower(hex(randomblob(16))), NULL, 'Garbanzos cocidos', 'LEGUMBRE', 'g', 164, 8.9, 27, 2.6, 7.6),
(lower(hex(randomblob(16))), NULL, 'Arvejas / guisantes cocidos', 'LEGUMBRE', 'g', 84, 5.4, 14.5, 0.4, 5.5),
(lower(hex(randomblob(16))), NULL, 'Habichuelas / ejotes cocidos', 'LEGUMBRE', 'g', 35, 1.8, 7.9, 0.2, 3.4),
(lower(hex(randomblob(16))), NULL, 'Habas cocidas', 'LEGUMBRE', 'g', 88, 7.6, 17.6, 0.4, 5.4);

-- VERDURA
INSERT INTO foods (id, gym_id, name, category, default_unit, calories_kcal, protein_g, carbs_g, fat_g, fiber_g) VALUES
(lower(hex(randomblob(16))), NULL, 'Brócoli', 'VERDURA', 'g', 34, 2.8, 7, 0.4, 2.6),
(lower(hex(randomblob(16))), NULL, 'Espinaca', 'VERDURA', 'g', 23, 2.9, 3.6, 0.4, 2.2),
(lower(hex(randomblob(16))), NULL, 'Lechuga', 'VERDURA', 'g', 15, 1.4, 2.9, 0.2, 1.3),
(lower(hex(randomblob(16))), NULL, 'Tomate', 'VERDURA', 'g', 18, 0.9, 3.9, 0.2, 1.2),
(lower(hex(randomblob(16))), NULL, 'Zanahoria', 'VERDURA', 'g', 41, 0.9, 10, 0.2, 2.8),
(lower(hex(randomblob(16))), NULL, 'Pepino', 'VERDURA', 'g', 15, 0.7, 3.6, 0.1, 0.5),
(lower(hex(randomblob(16))), NULL, 'Cebolla', 'VERDURA', 'g', 40, 1.1, 9.3, 0.1, 1.7),
(lower(hex(randomblob(16))), NULL, 'Pimentón / pimiento', 'VERDURA', 'g', 31, 1, 6, 0.3, 2.1),
(lower(hex(randomblob(16))), NULL, 'Calabacín / zucchini', 'VERDURA', 'g', 17, 1.2, 3.1, 0.3, 1),
(lower(hex(randomblob(16))), NULL, 'Repollo', 'VERDURA', 'g', 25, 1.3, 5.8, 0.1, 2.5),
(lower(hex(randomblob(16))), NULL, 'Coliflor', 'VERDURA', 'g', 25, 1.9, 5, 0.3, 2),
(lower(hex(randomblob(16))), NULL, 'Ahuyama / calabaza', 'VERDURA', 'g', 26, 1, 6.5, 0.1, 0.5),
(lower(hex(randomblob(16))), NULL, 'Apio', 'VERDURA', 'g', 16, 0.7, 3, 0.2, 1.6),
(lower(hex(randomblob(16))), NULL, 'Champiñones', 'VERDURA', 'g', 22, 3.1, 3.3, 0.3, 1);

-- FRUTA
INSERT INTO foods (id, gym_id, name, category, default_unit, calories_kcal, protein_g, carbs_g, fat_g, fiber_g) VALUES
(lower(hex(randomblob(16))), NULL, 'Banano', 'FRUTA', 'g', 89, 1.1, 23, 0.3, 2.6),
(lower(hex(randomblob(16))), NULL, 'Manzana', 'FRUTA', 'g', 52, 0.3, 14, 0.2, 2.4),
(lower(hex(randomblob(16))), NULL, 'Naranja', 'FRUTA', 'g', 47, 0.9, 12, 0.1, 2.4),
(lower(hex(randomblob(16))), NULL, 'Fresa', 'FRUTA', 'g', 32, 0.7, 7.7, 0.3, 2),
(lower(hex(randomblob(16))), NULL, 'Piña', 'FRUTA', 'g', 50, 0.5, 13, 0.1, 1.4),
(lower(hex(randomblob(16))), NULL, 'Papaya', 'FRUTA', 'g', 43, 0.5, 11, 0.3, 1.7),
(lower(hex(randomblob(16))), NULL, 'Mango', 'FRUTA', 'g', 60, 0.8, 15, 0.4, 1.6),
(lower(hex(randomblob(16))), NULL, 'Sandía', 'FRUTA', 'g', 30, 0.6, 7.6, 0.2, 0.4),
(lower(hex(randomblob(16))), NULL, 'Uvas', 'FRUTA', 'g', 69, 0.7, 18, 0.2, 0.9),
(lower(hex(randomblob(16))), NULL, 'Melón', 'FRUTA', 'g', 34, 0.8, 8.2, 0.2, 0.9),
(lower(hex(randomblob(16))), NULL, 'Mora', 'FRUTA', 'g', 43, 1.4, 9.6, 0.5, 5.3),
(lower(hex(randomblob(16))), NULL, 'Guayaba', 'FRUTA', 'g', 68, 2.6, 14, 1, 5.4),
(lower(hex(randomblob(16))), NULL, 'Aguacate', 'FRUTA', 'g', 160, 2, 8.5, 14.7, 6.7),
(lower(hex(randomblob(16))), NULL, 'Limón', 'FRUTA', 'unidad', 20, 0.4, 6, 0.1, 1.5);

-- LACTEO
INSERT INTO foods (id, gym_id, name, category, default_unit, calories_kcal, protein_g, carbs_g, fat_g, fiber_g) VALUES
(lower(hex(randomblob(16))), NULL, 'Leche entera', 'LACTEO', 'ml', 61, 3.2, 4.8, 3.3, 0),
(lower(hex(randomblob(16))), NULL, 'Leche deslactosada / descremada', 'LACTEO', 'ml', 34, 3.4, 5, 0.1, 0),
(lower(hex(randomblob(16))), NULL, 'Yogur griego natural', 'LACTEO', 'g', 59, 10, 3.6, 0.4, 0),
(lower(hex(randomblob(16))), NULL, 'Yogur natural', 'LACTEO', 'g', 61, 3.5, 4.7, 3.3, 0),
(lower(hex(randomblob(16))), NULL, 'Kumis', 'LACTEO', 'ml', 62, 3, 4.5, 3.3, 0),
(lower(hex(randomblob(16))), NULL, 'Queso cottage', 'LACTEO', 'g', 98, 11, 3.4, 4.3, 0),
(lower(hex(randomblob(16))), NULL, 'Kéfir', 'LACTEO', 'ml', 41, 3.4, 4.5, 1, 0);

-- GRASA
INSERT INTO foods (id, gym_id, name, category, default_unit, calories_kcal, protein_g, carbs_g, fat_g, fiber_g) VALUES
(lower(hex(randomblob(16))), NULL, 'Aceite de oliva', 'GRASA', 'ml', 884, 0, 0, 100, 0),
(lower(hex(randomblob(16))), NULL, 'Aceite vegetal', 'GRASA', 'ml', 884, 0, 0, 100, 0),
(lower(hex(randomblob(16))), NULL, 'Mantequilla', 'GRASA', 'g', 717, 0.9, 0.1, 81, 0),
(lower(hex(randomblob(16))), NULL, 'Almendras', 'GRASA', 'g', 579, 21, 22, 50, 12.5),
(lower(hex(randomblob(16))), NULL, 'Maní / cacahuate', 'GRASA', 'g', 567, 26, 16, 49, 8.5),
(lower(hex(randomblob(16))), NULL, 'Nueces', 'GRASA', 'g', 654, 15, 14, 65, 6.7),
(lower(hex(randomblob(16))), NULL, 'Mantequilla de maní', 'GRASA', 'g', 588, 25, 20, 50, 6),
(lower(hex(randomblob(16))), NULL, 'Semillas de chía', 'GRASA', 'g', 486, 17, 42, 31, 34),
(lower(hex(randomblob(16))), NULL, 'Coco rallado', 'GRASA', 'g', 354, 3.3, 15, 33, 9);

-- BEBIDA
INSERT INTO foods (id, gym_id, name, category, default_unit, calories_kcal, protein_g, carbs_g, fat_g, fiber_g) VALUES
(lower(hex(randomblob(16))), NULL, 'Agua', 'BEBIDA', 'ml', 0, 0, 0, 0, 0),
(lower(hex(randomblob(16))), NULL, 'Jugo de naranja natural', 'BEBIDA', 'ml', 45, 0.7, 10.4, 0.2, 0.2),
(lower(hex(randomblob(16))), NULL, 'Café negro sin azúcar', 'BEBIDA', 'ml', 1, 0.1, 0, 0, 0),
(lower(hex(randomblob(16))), NULL, 'Bebida hidratante deportiva', 'BEBIDA', 'ml', 24, 0, 6, 0, 0);

-- OTRO
INSERT INTO foods (id, gym_id, name, category, default_unit, calories_kcal, protein_g, carbs_g, fat_g, fiber_g) VALUES
(lower(hex(randomblob(16))), NULL, 'Miel', 'OTRO', 'g', 304, 0.3, 82, 0, 0.2),
(lower(hex(randomblob(16))), NULL, 'Azúcar', 'OTRO', 'g', 387, 0, 100, 0, 0),
(lower(hex(randomblob(16))), NULL, 'Salsa de tomate', 'OTRO', 'g', 82, 1.7, 19, 0.2, 1.4);
