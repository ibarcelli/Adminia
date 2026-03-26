-- ============================================================
-- Adminia — Water Metering Types
-- STORY-007b: Dos modalidades de prorrateo de agua
-- ============================================================

-- ========================
-- ENUM
-- ========================

CREATE TYPE water_metering_type AS ENUM ('individual', 'general');

-- ========================
-- ALTER BUILDINGS
-- ========================

ALTER TABLE buildings
  ADD COLUMN water_metering_type water_metering_type NOT NULL DEFAULT 'general';

-- ========================
-- TABLE: unit_water_readings
-- ========================

CREATE TABLE unit_water_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  reading_previous decimal NOT NULL DEFAULT 0,
  reading_current decimal NOT NULL DEFAULT 0,
  consumption decimal NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_id, unit_id)
);

-- ========================
-- INDEXES
-- ========================

CREATE INDEX idx_unit_water_readings_period_id ON unit_water_readings(period_id);
CREATE INDEX idx_unit_water_readings_unit_id ON unit_water_readings(unit_id);

-- ========================
-- RLS
-- ========================

ALTER TABLE unit_water_readings ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "admin_all_unit_water_readings" ON unit_water_readings
  FOR ALL USING (public.user_role() = 'admin');

-- Condo: read own unit only
CREATE POLICY "condo_read_own_unit_water_readings" ON unit_water_readings
  FOR SELECT USING (
    public.user_role() = 'condo'
    AND unit_id = public.user_unit_id()
  );

-- ========================
-- UPDATE SEED DATA
-- ========================

-- Los Olivos: general (already default)
-- Torre Miraflores: individual
UPDATE buildings
  SET water_metering_type = 'individual'
  WHERE id = '10000000-0000-0000-0000-000000000002';

-- San Borja: general (already default)
