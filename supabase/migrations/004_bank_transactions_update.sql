-- ============================================================
-- Adminia — Bank Transactions Update for BCP format
-- STORY-011b: Refactor para extracto real BCP
-- ============================================================

-- Transaction type enum
CREATE TYPE transaction_type AS ENUM ('income', 'expense');

-- Add new columns to bank_transactions
ALTER TABLE bank_transactions
  ADD COLUMN transaction_type transaction_type NOT NULL DEFAULT 'income',
  ADD COLUMN unit_number text,
  ADD COLUMN concept text,
  ADD COLUMN match_confidence text;

-- Comment: match_confidence values: 'high' (unit+monto), 'medium_unit' (unit sin monto exacto), 'medium_amount' (monto sin unit), null (sin match)
