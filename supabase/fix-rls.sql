-- ==========================================
-- SOLUCIÓN RLS - PERFILES DE USUARIOS
-- Ejecutar en Supabase SQL Editor
-- ==========================================

-- 1. Verificar si existe el perfil del admin
SELECT id, email, role FROM profiles WHERE email = 'admin@restaurante.com';

-- 2. Si no existe, crearlo manualmente
DO $$
DECLARE
  admin_id UUID;
BEGIN
  -- Obtener el ID del usuario admin
  SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@restaurante.com';
  
  -- Si existe el usuario pero no el perfil, crearlo
  IF admin_id IS NOT NULL THEN
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (admin_id, 'admin@restaurante.com', 'Administrador', 'admin')
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role;
  END IF;
END $$;

-- 3. Eliminar TODAS las políticas existentes de profiles
DROP POLICY IF EXISTS "acceso_perfiles" ON profiles;
DROP POLICY IF EXISTS "Cualquier usuario autenticado puede ver cualquier perfil" ON profiles;
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON profiles;
DROP POLICY IF EXISTS "Admins pueden ver todos los perfiles" ON profiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON profiles;
DROP POLICY IF EXISTS "Admins pueden gestionar todos los perfiles" ON profiles;
DROP POLICY IF EXISTS "Perfiles son visibles para usuarios autenticados" ON profiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON profiles;
DROP POLICY IF EXISTS "Admins pueden ver todos los perfiles" ON profiles;
DROP POLICY IF EXISTS "Perfiles lectura" ON profiles;
DROP POLICY IF EXISTS "Perfiles inserción" ON profiles;

-- 4. Crear política SIMPLE que permite a todos los autenticados ver perfiles
CREATE POLICY "acceso_perfiles"
  ON profiles FOR SELECT
  USING (true);

-- 5. Verificar que la política se creó
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- 6. Verificar el perfil del admin
SELECT id, email, role, full_name FROM profiles WHERE email = 'admin@restaurante.com';

-- ==========================================
-- LISTO - Ahora cierra sesión y vuelve a iniciar
-- ==========================================
