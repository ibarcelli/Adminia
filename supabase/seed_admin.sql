-- ============================================================
-- Adminia — Seed Admin User
-- STORY-003: Autenticación admin
-- ============================================================
--
-- INSTRUCCIONES PARA IVES:
--
-- PASO 1: Crear el usuario en Supabase Dashboard
--   1. Ir a Authentication → Users → Add user
--   2. Email: ibarcelli@hotmail.com (o el email que prefieras)
--   3. Password: el que elijas
--   4. Copiar el UUID del usuario creado
--
-- PASO 2: Reemplazar el UUID abajo y ejecutar este SQL
--   1. Ir a SQL Editor → New query
--   2. Pegar este SQL
--   3. Reemplazar '0ec561f9-6e3e-4e19-9070-7795b2722142' con el UUID real
--   4. Click en Run
-- ============================================================

-- Crear la organización Adminia (si no existe)
INSERT INTO organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Adminia')
ON CONFLICT (id) DO NOTHING;

-- Crear el perfil admin
-- ⚠️ REEMPLAZAR el UUID con el del usuario creado en el Paso 1
INSERT INTO profiles (id, email, role, organization_id)
VALUES (
  '0ec561f9-6e3e-4e19-9070-7795b2722142',  -- ← UUID del usuario creado en Authentication
  'ibarcelli@hotmail.com',                   -- ← mismo email usado en Authentication
  'admin',
  '00000000-0000-0000-0000-000000000001'
);
