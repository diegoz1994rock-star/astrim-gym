-- Los catálogos GLOBALES (exercises/foods con gym_id IS NULL) los siembra
-- cada instalación por su cuenta (0008/0032) con ids aleatorios distintos.
-- Los triggers que subían esos catálogos a las colecciones compartidas
-- `exerciseLibrary` / `foodLibrary` hacían que CADA panel subiera su propia
-- copia -> el catálogo aparecía duplicado (x2, x3...) en Firestore y en la
-- app de clientes.
--
-- Se quitan esos triggers: el catálogo global va a Firestore UNA sola vez
-- (botón "Subir biblioteca de ejercicios" / seedExerciseLibrary, que escribe
-- directo sin pasar por el outbox). La data por-gimnasio (gym_id NOT NULL)
-- sigue sincronizando igual por sus propios triggers (`exercises`, `foods`).

DROP TRIGGER IF EXISTS trg_outbox_exercise_library_ai;
DROP TRIGGER IF EXISTS trg_outbox_exercise_library_au;
DROP TRIGGER IF EXISTS trg_outbox_exercise_library_bd;

DROP TRIGGER IF EXISTS trg_outbox_food_library_ai;
DROP TRIGGER IF EXISTS trg_outbox_food_library_au;
DROP TRIGGER IF EXISTS trg_outbox_food_library_bd;

-- Saca de la cola cualquier UPSERT/DELETE de estas entidades que haya quedado
-- pendiente de un backfill viejo, para que no siga generando duplicados.
DELETE FROM outbox WHERE entity IN ('exercise_library', 'food_library') AND status = 'PENDING';
