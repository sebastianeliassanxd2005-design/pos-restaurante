-- ==========================================
-- AUTENTICACIÓN Y USUARIOS - SUPABASE
-- ==========================================

-- Tabla de perfiles (si no existe)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'waiter', -- admin, waiter, kitchen
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para buscar perfiles por email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para perfiles
CREATE POLICY "Perfiles son visibles para usuarios autenticados" 
  ON profiles FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios pueden actualizar su propio perfil" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Admins pueden ver todos los perfiles" 
  ON profiles FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Función para crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'waiter')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil al registrar usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- USUARIO ADMIN POR DEFECTO
-- ==========================================

-- Nota: Para crear el usuario admin, usa el formulario de registro
-- con el rol "admin" o ejecuta esto en Supabase:

-- INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
-- VALUES (
--   'admin@restaurante.com',
--   crypt('123456', gen_salt('bf')),
--   NOW()
-- )
-- RETURNING id;

-- Luego crea el perfil:
-- INSERT INTO profiles (id, email, full_name, role)
-- VALUES ('<id-del-usuario>', 'admin@restaurante.com', 'Administrador', 'admin');

-- ==========================================
-- FUNCIONES DE UTILIDAD
-- ==========================================

-- Función para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si es admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin' FROM profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
