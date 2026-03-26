-- ============================================================
-- Adminia — Auto-create condo profile on first magic link login
-- STORY-015: Autenticación condómino
-- ============================================================
-- When a user is created in auth.users via magic link,
-- if their email matches a unit's owner_email,
-- automatically create a profile with role='condo' and the matching unit_id.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Check if email matches any unit's owner_email
  INSERT INTO profiles (id, email, role, unit_id)
  SELECT
    NEW.id,
    NEW.email,
    'condo'::user_role,
    u.id
  FROM units u
  WHERE u.owner_email = NEW.email
    AND u.is_active = true
  LIMIT 1
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
