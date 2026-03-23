-- ==========================================
-- FUNCIÓN PARA CREAR USUARIOS DESDE EL SISTEMA
-- Versión Corregida #2
-- Ejecutar en Supabase SQL Editor
-- ==========================================

-- 1. Habilitar extensión para crear UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Eliminar función anterior si existe
DROP FUNCTION IF EXISTS public.create_user_with_profile(TEXT, TEXT, TEXT, TEXT);

-- 3. Crear función segura para crear usuarios
CREATE OR REPLACE FUNCTION public.create_user_with_profile(
  email_input TEXT,
  password_input TEXT,
  full_name_input TEXT,
  role_input TEXT DEFAULT 'waiter'
)
RETURNS JSON AS $$
DECLARE
  new_user_id UUID;
  result JSON;
BEGIN
  -- Generar nuevo UUID
  new_user_id := uuid_generate_v4();
  
  -- Insertar usuario en auth.users
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    aud
  )
  VALUES (
    new_user_id,
    email_input,
    crypt(password_input, gen_salt('bf')),
    NOW(),
    json_build_object('full_name', full_name_input, 'role', role_input),
    NOW(),
    NOW(),
    'authenticated'
  );
  
  -- Insertar perfil del usuario
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    created_at
  )
  VALUES (
    new_user_id,
    email_input,
    full_name_input,
    role_input,
    NOW()
  );
  
  -- Retornar resultado exitoso
  result := json_build_object(
    'success', true,
    'user_id', new_user_id,
    'email', email_input
  );
  
  RETURN result;
  
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'El email ya está registrado'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Otorgar permisos para que usuarios autenticados puedan usar la función
GRANT EXECUTE ON FUNCTION public.create_user_with_profile TO authenticated;

-- 5. Crear política para permitir inserción en profiles desde la función
DROP POLICY IF EXISTS "Admins pueden crear perfiles" ON profiles;
CREATE POLICY "Admins pueden crear perfiles"
  ON profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==========================================
-- PROBAR LA FUNCIÓN (OPCIONAL)
-- ==========================================

-- Ejecutar esto para probar (cambia el email):
-- SELECT public.create_user_with_profile(
--   'test3@restaurante.com',
--   '123456',
--   'Usuario Test 3',
--   'waiter'
-- );

-- ==========================================
-- LISTO - Ahora puedes crear usuarios desde el sistema
-- ==========================================
