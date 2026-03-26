-- ============================================================
-- Adminia — Fixed fee support
-- STORY-009b: Cuota fija mensual por departamento
-- ============================================================

ALTER TABLE buildings ADD COLUMN default_fixed_fee decimal NOT NULL DEFAULT 0;
ALTER TABLE periods ADD COLUMN fixed_fee decimal NOT NULL DEFAULT 0;
