-- Elimina por completo el gimnasio DEMO (`gym_demo_001`) y todo lo que
-- cuelga de él.
--
-- La migración 0002 lo sembraba para desarrollo; la 0002 no se borra ni se
-- edita (rompería el control de versiones de sqlx), pero esta migración la
-- revierte acto seguido. Ninguna instalación de producción queda con el
-- gimnasio demo, su administrador (`admin@astrimgym.demo`), ni sus
-- clientes / pagos / asistencias / rutinas / clases de prueba.
--
-- Es idempotente y segura en instalaciones nuevas (los DELETE no encuentran
-- filas). NO toca datos globales: ejercicios de catálogo (`gym_id NULL`),
-- tipos de clase globales, etc. — todos los WHERE son `= 'gym_demo_001'`,
-- que nunca casa con NULL.
--
-- Los 3 ejercicios `exercise_demo_00X` tampoco se tocan: la migración 0012
-- ya los reconvirtió en ejercicios del catálogo global con nombres reales.

-- Tablas hijas sin gym_id: se resuelven por su padre.
DELETE FROM class_block_exercises WHERE block_id IN (
  SELECT cb.id FROM class_blocks cb
  JOIN classes c ON c.id = cb.class_id
  WHERE c.gym_id = 'gym_demo_001'
);
DELETE FROM class_blocks WHERE class_id IN (SELECT id FROM classes WHERE gym_id = 'gym_demo_001');
DELETE FROM class_enrollments WHERE class_id IN (SELECT id FROM classes WHERE gym_id = 'gym_demo_001');
DELETE FROM routine_exercises WHERE routine_id IN (SELECT id FROM routines WHERE gym_id = 'gym_demo_001');

-- Tablas con gym_id (de hijas a padres).
DELETE FROM attendance_sync_queue WHERE gym_id = 'gym_demo_001';
DELETE FROM attendance            WHERE gym_id = 'gym_demo_001';
DELETE FROM payments              WHERE gym_id = 'gym_demo_001';
DELETE FROM memberships           WHERE gym_id = 'gym_demo_001';
DELETE FROM measurements          WHERE gym_id = 'gym_demo_001';
DELETE FROM routine_assignments   WHERE gym_id = 'gym_demo_001';
DELETE FROM classes               WHERE gym_id = 'gym_demo_001';
DELETE FROM routines              WHERE gym_id = 'gym_demo_001';
DELETE FROM exercise_machines     WHERE gym_id = 'gym_demo_001';
DELETE FROM machines              WHERE gym_id = 'gym_demo_001';
DELETE FROM device_pairing_codes  WHERE gym_id = 'gym_demo_001';
DELETE FROM devices               WHERE gym_id = 'gym_demo_001';
DELETE FROM clients               WHERE gym_id = 'gym_demo_001';
DELETE FROM membership_plans      WHERE gym_id = 'gym_demo_001';
DELETE FROM trainers              WHERE gym_id = 'gym_demo_001';
DELETE FROM users                 WHERE gym_id = 'gym_demo_001';
DELETE FROM gyms                  WHERE id = 'gym_demo_001';

-- Los triggers de sync (migración 0024) encolan un DELETE en `outbox` por
-- cada fila borrada; como el gimnasio demo nunca se subió a la nube, esas
-- entradas se descartan.
DELETE FROM outbox WHERE gym_id = 'gym_demo_001';
