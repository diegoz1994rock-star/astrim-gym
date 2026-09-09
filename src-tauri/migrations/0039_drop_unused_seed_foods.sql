-- Quita del catálogo global 5 alimentos sembrados en 0032 que el gimnasio no
-- usa (azúcar, sal/cebolla como condimento, miel, etc.). El usuario los borró
-- a mano en su panel, pero cada instalación nueva vuelve a correr el seed de
-- 0032 y reaparecían. Esta migración los borra en todas las instalaciones
-- (existentes y nuevas). El trigger BEFORE DELETE de foods encola el DELETE
-- hacia Firestore (foodLibrary), así también desaparecen para la app.
--
-- No se edita 0032 directamente: cambiar una migración ya aplicada rompe el
-- checksum (ver scripts/fix-migration-28-checksum.mjs).

DELETE FROM meal_plan_allowed_foods
WHERE food_id IN (
  SELECT id FROM foods WHERE gym_id IS NULL AND name IN (
    'Azúcar', 'Cebolla', 'Miel', 'Proteína en polvo (whey, 1 scoop 30 g)', 'Salsa de tomate'
  )
);

DELETE FROM meal_plan_items
WHERE food_id IN (
  SELECT id FROM foods WHERE gym_id IS NULL AND name IN (
    'Azúcar', 'Cebolla', 'Miel', 'Proteína en polvo (whey, 1 scoop 30 g)', 'Salsa de tomate'
  )
);

DELETE FROM foods
WHERE gym_id IS NULL AND name IN (
  'Azúcar', 'Cebolla', 'Miel', 'Proteína en polvo (whey, 1 scoop 30 g)', 'Salsa de tomate'
);
