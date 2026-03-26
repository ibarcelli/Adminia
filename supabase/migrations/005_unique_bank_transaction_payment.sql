-- ============================================================
-- Adminia — Unique constraint on payments.bank_transaction_id
-- Fix: prevent duplicate payments for same bank transaction
-- ============================================================

ALTER TABLE payments ADD CONSTRAINT unique_bank_transaction_payment UNIQUE (bank_transaction_id);
