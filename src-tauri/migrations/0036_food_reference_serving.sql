-- Porción de referencia en términos cotidianos (ej. "1 banano mediano" ≈
-- 120 g, "1 vaso" ≈ 240 ml) para alimentos cuyo default_unit es g/ml: la
-- cantidad en gramos/mililitros por sí sola no le dice nada al cliente
-- sobre cuánto es en la vida real. Nullable: solo se completa donde aplica
-- (fruta, bebida, lácteo por ahora); el resto sigue mostrándose por 100 g/ml.
ALTER TABLE foods ADD COLUMN reference_qty REAL;
ALTER TABLE foods ADD COLUMN reference_label TEXT;

-- FRUTA
UPDATE foods SET reference_qty = 120, reference_label = '1 banano mediano' WHERE name = 'Banano' AND gym_id IS NULL;
UPDATE foods SET reference_qty = 180, reference_label = '1 manzana mediana' WHERE name = 'Manzana' AND gym_id IS NULL;
UPDATE foods SET reference_qty = 180, reference_label = '1 naranja mediana' WHERE name = 'Naranja' AND gym_id IS NULL;
UPDATE foods SET reference_qty = 150, reference_label = '1 taza de fresas' WHERE name = 'Fresa' AND gym_id IS NULL;
UPDATE foods SET reference_qty = 165, reference_label = '1 taza en trozos' WHERE name = 'Piña' AND gym_id IS NULL;
UPDATE foods SET reference_qty = 145, reference_label = '1 taza en trozos' WHERE name = 'Papaya' AND gym_id IS NULL;
UPDATE foods SET reference_qty = 200, reference_label = '1 mango mediano' WHERE name = 'Mango' AND gym_id IS NULL;
UPDATE foods SET reference_qty = 152, reference_label = '1 taza en trozos' WHERE name = 'Sandía' AND gym_id IS NULL;
UPDATE foods SET reference_qty = 150, reference_label = '1 taza' WHERE name = 'Uvas' AND gym_id IS NULL;
UPDATE foods SET reference_qty = 160, reference_label = '1 taza en trozos' WHERE name = 'Melón' AND gym_id IS NULL;
UPDATE foods SET reference_qty = 145, reference_label = '1 taza' WHERE name = 'Mora' AND gym_id IS NULL;
UPDATE foods SET reference_qty = 90, reference_label = '1 guayaba mediana' WHERE name = 'Guayaba' AND gym_id IS NULL;
UPDATE foods SET reference_qty = 100, reference_label = '1/2 aguacate mediano' WHERE name = 'Aguacate' AND gym_id IS NULL;

-- BEBIDA
UPDATE foods SET reference_qty = 240, reference_label = '1 vaso' WHERE name = 'Agua' AND gym_id IS NULL;
UPDATE foods SET reference_qty = 240, reference_label = '1 vaso' WHERE name = 'Jugo de naranja natural' AND gym_id IS NULL;
UPDATE foods SET reference_qty = 200, reference_label = '1 taza' WHERE name = 'Café negro sin azúcar' AND gym_id IS NULL;
UPDATE foods SET reference_qty = 500, reference_label = '1 botella pequeña' WHERE name = 'Bebida hidratante deportiva' AND gym_id IS NULL;

-- LACTEO
UPDATE foods SET reference_qty = 240, reference_label = '1 vaso' WHERE name = 'Leche entera' AND gym_id IS NULL;
UPDATE foods SET reference_qty = 240, reference_label = '1 vaso' WHERE name = 'Leche deslactosada / descremada' AND gym_id IS NULL;
UPDATE foods SET reference_qty = 150, reference_label = '1 pote' WHERE name = 'Yogur griego natural' AND gym_id IS NULL;
UPDATE foods SET reference_qty = 150, reference_label = '1 pote' WHERE name = 'Yogur natural' AND gym_id IS NULL;
UPDATE foods SET reference_qty = 200, reference_label = '1 vaso' WHERE name = 'Kumis' AND gym_id IS NULL;
UPDATE foods SET reference_qty = 225, reference_label = '1 taza' WHERE name = 'Queso cottage' AND gym_id IS NULL;
UPDATE foods SET reference_qty = 240, reference_label = '1 vaso' WHERE name = 'Kéfir' AND gym_id IS NULL;
