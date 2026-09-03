-- Datos DEMO para desarrollo local.
-- Todos los registros están marcados explícitamente como "(DEMO)" en su nombre
-- y deben eliminarse antes de usar la aplicación con un gimnasio real.
-- Ver docs/DATABASE.md, sección "Datos de demostración".

INSERT INTO gyms (id, name, slug, license_status, license_plan, license_start_date, license_expiration_date)
VALUES ('gym_demo_001', 'Gimnasio Demo (DEMO)', 'demo', 'ACTIVE', 'STANDARD', date('now'), date('now', '+1 year'));

-- Contraseña demo: admin123 (hash bcrypt, solo para entorno de desarrollo)
INSERT INTO users (id, gym_id, name, email, password_hash, role, status)
VALUES ('user_demo_admin', 'gym_demo_001', 'Administrador (DEMO)', 'admin@astrimgym.demo',
        '$2b$10$/x0NAS9BFkac6g4DFKDpAucbphHldhtztIQNBqnL1ER7PqXUzCE86', 'ADMIN', 'ACTIVE');

INSERT INTO trainers (id, gym_id, name, document, phone, email, specialty, status)
VALUES ('trainer_demo_001', 'gym_demo_001', 'Carlos Ruiz (DEMO)', '1010101010', '3000000001',
        'carlos.ruiz@astrimgym.demo', 'Fuerza e hipertrofia', 'ACTIVE');

INSERT INTO membership_plans (id, gym_id, name, duration_days, price, description, active)
VALUES
    ('plan_demo_mensual', 'gym_demo_001', 'Mensual (DEMO)', 30, 80000, 'Plan mensual estándar', 1),
    ('plan_demo_trimestral', 'gym_demo_001', 'Trimestral (DEMO)', 90, 210000, 'Plan trimestral con descuento', 1);

INSERT INTO clients (id, gym_id, name, document, birth_date, phone, email, weight, height, gender, goal, trainer_id, join_date, status)
VALUES
    ('client_demo_001', 'gym_demo_001', 'Juan Pérez (DEMO)', '1122334455', '1995-04-12', '3001112233',
     'juan.perez@astrimgym.demo', 97, 1.78, 'M', 'MUSCLE_GAIN', 'trainer_demo_001', date('now', '-40 days'), 'ACTIVE'),
    ('client_demo_002', 'gym_demo_001', 'María Gómez (DEMO)', '2233445566', '1998-09-03', '3002223344',
     'maria.gomez@astrimgym.demo', 63, 1.65, 'F', 'FAT_LOSS', 'trainer_demo_001', date('now', '-15 days'), 'ACTIVE'),
    ('client_demo_003', 'gym_demo_001', 'Andrés López (DEMO)', '3344556677', '1990-01-20', '3003334455',
     'andres.lopez@astrimgym.demo', 80, 1.75, 'M', 'MAINTENANCE', 'trainer_demo_001', date('now', '-120 days'), 'ACTIVE');

INSERT INTO memberships (id, gym_id, client_id, plan_id, start_date, end_date, price, payment_status, method)
VALUES
    ('membership_demo_001', 'gym_demo_001', 'client_demo_001', 'plan_demo_trimestral',
     date('now', '-70 days'), date('now', '+20 days'), 210000, 'PAID', 'TRANSFER'),
    ('membership_demo_002', 'gym_demo_001', 'client_demo_002', 'plan_demo_mensual',
     date('now', '-27 days'), date('now', '+3 days'), 80000, 'PAID', 'CASH'),
    ('membership_demo_003', 'gym_demo_001', 'client_demo_003', 'plan_demo_mensual',
     date('now', '-40 days'), date('now', '-10 days'), 80000, 'PAID', 'CASH');

INSERT INTO payments (id, gym_id, client_id, membership_id, amount, date, method, status)
VALUES
    ('payment_demo_001', 'gym_demo_001', 'client_demo_001', 'membership_demo_001', 210000, date('now', '-70 days'), 'TRANSFER', 'PAID'),
    ('payment_demo_002', 'gym_demo_001', 'client_demo_002', 'membership_demo_002', 80000, date('now', '-27 days'), 'CASH', 'PAID'),
    ('payment_demo_003', 'gym_demo_001', 'client_demo_003', 'membership_demo_003', 80000, date('now', '-40 days'), 'CASH', 'PAID');

INSERT INTO attendance (id, gym_id, client_id, date, check_in, status)
VALUES
    ('attendance_demo_001', 'gym_demo_001', 'client_demo_001', date('now'), time('now'), 'PRESENT'),
    ('attendance_demo_002', 'gym_demo_001', 'client_demo_002', date('now'), time('now'), 'PRESENT'),
    ('attendance_demo_003', 'gym_demo_001', 'client_demo_001', date('now', '-1 day'), '08:00:00', 'PRESENT');

INSERT INTO exercises (id, gym_id, name, description, muscle_group, level, equipment)
VALUES
    ('exercise_demo_001', NULL, 'Press banca (DEMO)', 'Ejercicio compuesto para pecho', 'CHEST', 'INTERMEDIATE', 'Barra y banco'),
    ('exercise_demo_002', NULL, 'Sentadilla (DEMO)', 'Ejercicio compuesto para pierna', 'LEGS', 'INTERMEDIATE', 'Barra y rack'),
    ('exercise_demo_003', NULL, 'Peso muerto (DEMO)', 'Ejercicio compuesto para cadena posterior', 'BACK', 'ADVANCED', 'Barra');
