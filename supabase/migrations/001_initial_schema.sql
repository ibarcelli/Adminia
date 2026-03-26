-- ============================================================
-- Adminia — Initial Schema
-- STORY-002: Esquema de base de datos
-- ============================================================

-- ========================
-- ENUMS
-- ========================

CREATE TYPE bank_account_type AS ENUM ('own', 'adminia');
CREATE TYPE period_status AS ENUM ('draft', 'published', 'closed');
CREATE TYPE expense_category AS ENUM ('fixed', 'variable', 'water');
CREATE TYPE statement_status AS ENUM ('pending', 'paid', 'partial', 'overdue');
CREATE TYPE match_status AS ENUM ('unmatched', 'suggested', 'confirmed', 'rejected');
CREATE TYPE user_role AS ENUM ('admin', 'condo');

-- ========================
-- TABLES
-- ========================

-- Organizations
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Buildings
CREATE TABLE buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL,
  total_units int NOT NULL DEFAULT 0,
  bank_account_type bank_account_type NOT NULL DEFAULT 'adminia',
  bank_account_name text NOT NULL DEFAULT '',
  payment_deadline_day int NOT NULL DEFAULT 15 CHECK (payment_deadline_day >= 1 AND payment_deadline_day <= 28),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Units (departamentos)
CREATE TABLE units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  unit_number text NOT NULL,
  area_sqm decimal NOT NULL,
  owner_name text NOT NULL DEFAULT '',
  owner_email text NOT NULL DEFAULT '',
  owner_phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Profiles (linked to Supabase Auth)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role user_role NOT NULL DEFAULT 'condo',
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES units(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Periods
CREATE TABLE periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  year int NOT NULL,
  month int NOT NULL CHECK (month >= 1 AND month <= 12),
  water_reading_previous decimal NOT NULL DEFAULT 0,
  water_reading_current decimal NOT NULL DEFAULT 0,
  water_total_cost decimal NOT NULL DEFAULT 0,
  status period_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (building_id, year, month)
);

-- Expenses (gastos del mes)
CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  concept text NOT NULL,
  amount decimal NOT NULL DEFAULT 0,
  category expense_category NOT NULL DEFAULT 'fixed',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Statements (estados de cuenta por departamento)
CREATE TABLE statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  water_charge decimal NOT NULL DEFAULT 0,
  expenses_charge decimal NOT NULL DEFAULT 0,
  previous_balance decimal NOT NULL DEFAULT 0,
  total_due decimal NOT NULL DEFAULT 0,
  status statement_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_id, unit_id)
);

-- Bank Imports (extractos importados)
CREATE TABLE bank_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);

-- Bank Transactions (movimientos parseados)
CREATE TABLE bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_import_id uuid NOT NULL REFERENCES bank_imports(id) ON DELETE CASCADE,
  date date NOT NULL,
  amount decimal NOT NULL,
  reference text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  matched_unit_id uuid REFERENCES units(id) ON DELETE SET NULL,
  match_status match_status NOT NULL DEFAULT 'unmatched',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Payments
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id uuid NOT NULL REFERENCES statements(id) ON DELETE CASCADE,
  bank_transaction_id uuid NOT NULL REFERENCES bank_transactions(id) ON DELETE CASCADE,
  amount decimal NOT NULL,
  payment_date date NOT NULL,
  confirmed_by uuid NOT NULL REFERENCES profiles(id),
  confirmed_at timestamptz NOT NULL DEFAULT now()
);

-- Receipts
CREATE TABLE receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL UNIQUE REFERENCES payments(id) ON DELETE CASCADE,
  receipt_number text NOT NULL UNIQUE,
  generated_at timestamptz NOT NULL DEFAULT now()
);

-- ========================
-- INDEXES
-- ========================

CREATE INDEX idx_units_building_id ON units(building_id);
CREATE INDEX idx_periods_building_id ON periods(building_id);
CREATE INDEX idx_expenses_period_id ON expenses(period_id);
CREATE INDEX idx_statements_period_id ON statements(period_id);
CREATE INDEX idx_statements_unit_id ON statements(unit_id);
CREATE INDEX idx_bank_transactions_bank_import_id ON bank_transactions(bank_import_id);
CREATE INDEX idx_bank_transactions_match_status ON bank_transactions(match_status);
CREATE INDEX idx_payments_statement_id ON payments(statement_id);

-- ========================
-- ROW LEVEL SECURITY
-- ========================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- ========================
-- HELPER FUNCTION
-- ========================

-- Get current user's role from profiles
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get current user's unit_id from profiles
CREATE OR REPLACE FUNCTION auth.user_unit_id()
RETURNS uuid AS $$
  SELECT unit_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ========================
-- ADMIN POLICIES (full CRUD)
-- ========================

-- Organizations
CREATE POLICY "admin_all_organizations" ON organizations
  FOR ALL USING (auth.user_role() = 'admin');

-- Buildings
CREATE POLICY "admin_all_buildings" ON buildings
  FOR ALL USING (auth.user_role() = 'admin');

-- Units
CREATE POLICY "admin_all_units" ON units
  FOR ALL USING (auth.user_role() = 'admin');

-- Profiles
CREATE POLICY "admin_all_profiles" ON profiles
  FOR ALL USING (auth.user_role() = 'admin');

-- Users can read their own profile
CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Periods
CREATE POLICY "admin_all_periods" ON periods
  FOR ALL USING (auth.user_role() = 'admin');

-- Expenses
CREATE POLICY "admin_all_expenses" ON expenses
  FOR ALL USING (auth.user_role() = 'admin');

-- Statements
CREATE POLICY "admin_all_statements" ON statements
  FOR ALL USING (auth.user_role() = 'admin');

-- Bank Imports
CREATE POLICY "admin_all_bank_imports" ON bank_imports
  FOR ALL USING (auth.user_role() = 'admin');

-- Bank Transactions
CREATE POLICY "admin_all_bank_transactions" ON bank_transactions
  FOR ALL USING (auth.user_role() = 'admin');

-- Payments
CREATE POLICY "admin_all_payments" ON payments
  FOR ALL USING (auth.user_role() = 'admin');

-- Receipts
CREATE POLICY "admin_all_receipts" ON receipts
  FOR ALL USING (auth.user_role() = 'admin');

-- ========================
-- CONDO POLICIES (limited read)
-- ========================

-- Condóminos: read buildings (their own building via unit)
CREATE POLICY "condo_read_buildings" ON buildings
  FOR SELECT USING (
    auth.user_role() = 'condo'
    AND id IN (
      SELECT building_id FROM units WHERE id = auth.user_unit_id()
    )
  );

-- Condóminos: read their own unit
CREATE POLICY "condo_read_own_unit" ON units
  FOR SELECT USING (
    auth.user_role() = 'condo'
    AND id = auth.user_unit_id()
  );

-- Condóminos: read published periods (for their building)
CREATE POLICY "condo_read_published_periods" ON periods
  FOR SELECT USING (
    auth.user_role() = 'condo'
    AND status = 'published'
    AND building_id IN (
      SELECT building_id FROM units WHERE id = auth.user_unit_id()
    )
  );

-- Condóminos: read expenses of published periods
CREATE POLICY "condo_read_published_expenses" ON expenses
  FOR SELECT USING (
    auth.user_role() = 'condo'
    AND period_id IN (
      SELECT id FROM periods
      WHERE status = 'published'
      AND building_id IN (
        SELECT building_id FROM units WHERE id = auth.user_unit_id()
      )
    )
  );

-- Condóminos: read their own statements
CREATE POLICY "condo_read_own_statements" ON statements
  FOR SELECT USING (
    auth.user_role() = 'condo'
    AND unit_id = auth.user_unit_id()
  );

-- Condóminos: read their own payments
CREATE POLICY "condo_read_own_payments" ON payments
  FOR SELECT USING (
    auth.user_role() = 'condo'
    AND statement_id IN (
      SELECT id FROM statements WHERE unit_id = auth.user_unit_id()
    )
  );

-- Condóminos: read their own receipts
CREATE POLICY "condo_read_own_receipts" ON receipts
  FOR SELECT USING (
    auth.user_role() = 'condo'
    AND payment_id IN (
      SELECT id FROM payments
      WHERE statement_id IN (
        SELECT id FROM statements WHERE unit_id = auth.user_unit_id()
      )
    )
  );

-- Condóminos: NO ACCESS to bank_imports and bank_transactions (no policy = no access with RLS enabled)
