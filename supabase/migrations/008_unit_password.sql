-- ============================================================
-- Adminia — Unit portal password
-- STORY-024b: Gestión de usuarios condóminos
-- ============================================================

ALTER TABLE units ADD COLUMN portal_password text NOT NULL DEFAULT '';
