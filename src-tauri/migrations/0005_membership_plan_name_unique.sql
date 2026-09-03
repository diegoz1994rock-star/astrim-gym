-- El nombre de un plan de membresía no puede repetirse dentro del mismo gimnasio
-- (insensible a mayúsculas/minúsculas). Mismo patrón que la unicidad de documento
-- en clientes (0003) y entrenadores (0004): cada gimnasio administra sus propios
-- planes de forma independiente.
CREATE UNIQUE INDEX idx_membership_plans_gym_name_unique
    ON membership_plans (gym_id, name COLLATE NOCASE);
