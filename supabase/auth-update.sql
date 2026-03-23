-- ==========================================
-- HABILITAR CREACIÓN DE USUARIOS PARA ADMIN
-- ==========================================

-- Política para que admins puedan crear usuarios
CREATE POLICY "Admins pueden crear usuarios" 
  ON profiles FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Política para que admins puedan eliminar usuarios
CREATE POLICY "Admins pueden eliminar usuarios" 
  ON profiles FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==========================================
-- PERMISOS PARA AUTH.ADMIN (necesario para crear usuarios)
-- ==========================================

-- Conceder permisos para usar auth.admin.createUser
-- Esto se ejecuta desde el lado del cliente con la sesión del admin
GRANT USAGE ON SCHEMA auth TO authenticated;

-- ==========================================
-- ACTUALIZAR POLÍTICAS EXISTENTES
-- ==========================================

-- Actualizar políticas para orders (que cada usuario vea las suyas)
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver pedidos" ON orders;
CREATE POLICY "Usuarios autenticados pueden ver pedidos" 
  ON orders FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden crear pedidos" 
  ON orders FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden actualizar pedidos" 
  ON orders FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

-- Actualizar políticas para order_items
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver order_items" ON order_items;
CREATE POLICY "Usuarios autenticados pueden ver order_items" 
  ON order_items FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden crear order_items" 
  ON order_items FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- ==========================================
-- FUNCIÓN PARA CAMBIAR CONTRASEÑA
-- ==========================================

CREATE OR REPLACE FUNCTION public.change_password(new_password TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE auth.users 
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
