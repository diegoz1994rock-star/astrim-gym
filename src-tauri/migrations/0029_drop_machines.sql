-- Se elimina el módulo de Máquinas del panel: resultaba confuso y nunca se
-- sincronizó a la nube (era 100% local). Se quitan las tablas y todo lo que
-- colgaba de ellas.
--
-- `exercise_machines` primero (referencia a `machines`). SQLite borra solos
-- los índices y triggers asociados al hacer DROP TABLE.

DROP TABLE IF EXISTS exercise_machines;
DROP TABLE IF EXISTS machines;

-- Por si quedó alguna entrada de outbox de estas entidades (no debería
-- haberla: nunca tuvieron triggers de sincronización).
DELETE FROM outbox WHERE entity IN ('machine', 'exercise_machine');
