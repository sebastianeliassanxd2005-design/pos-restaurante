-- ============================================
-- POLÍTICAS RLS PARA ÓRDENES Y MESAS
-- ============================================
-- Ejecuta esto en: https://supabase.com/dashboard/project/bhampokwjyjticzzejvs/sql
-- 
-- Problema: Error 406 / Permisos insuficientes para crear órdenes
-- Solución: Crear políticas RLS para INSERT/UPDATE/SELECT en orders, order_items, tables

-- ============================================
-- 1. VERIFICAR POLÍTICAS EXISTENTES
-- ============================================

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'tables', 'profiles')
ORDER BY tablename, policyname;

-- ============================================
-- 2. CREAR/REEMPLAZAR POLÍTICAS PARA ÓRDENES
-- ============================================

-- Política para INSERT en orders (crear nuevas órdenes)
DROP POLICY IF EXISTS "Usuarios pueden crear orders" ON orders;
CREATE POLICY "Usuarios pueden crear orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política para SELECT en orders (ver órdenes)
DROP POLICY IF EXISTS "Usuarios pueden ver orders" ON orders;
CREATE POLICY "Usuarios pueden ver orders"
  ON orders FOR SELECT
  TO authenticated
  USING (true);

-- Política para UPDATE en orders (actualizar estado de órdenes)
DROP POLICY IF EXISTS "Usuarios pueden actualizar orders" ON orders;
CREATE POLICY "Usuarios pueden actualizar orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (true);

-- Política para DELETE en orders (cancelar órdenes)
DROP POLICY IF EXISTS "Usuarios pueden cancelar orders" ON orders;
CREATE POLICY "Usuarios pueden cancelar orders"
  ON orders FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- 3. POLÍTICAS PARA ORDER_ITEMS
-- ============================================

-- Política para INSERT en order_items (agregar items a órdenes)
DROP POLICY IF EXISTS "Usuarios pueden crear order_items" ON order_items;
CREATE POLICY "Usuarios pueden crear order_items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política para SELECT en order_items (ver items)
DROP POLICY IF EXISTS "Usuarios pueden ver order_items" ON order_items;
CREATE POLICY "Usuarios pueden ver order_items"
  ON order_items FOR SELECT
  TO authenticated
  USING (true);

-- Política para UPDATE en order_items (actualizar items)
DROP POLICY IF EXISTS "Usuarios pueden actualizar order_items" ON order_items;
CREATE POLICY "Usuarios pueden actualizar order_items"
  ON order_items FOR UPDATE
  TO authenticated
  USING (true);

-- Política para DELETE en order_items (eliminar items)
DROP POLICY IF EXISTS "Usuarios pueden eliminar order_items" ON order_items;
CREATE POLICY "Usuarios pueden eliminar order_items"
  ON order_items FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- 4. POLÍTICAS PARA TABLAS (MESAS)
-- ============================================

-- Política para SELECT en tables (ver mesas)
DROP POLICY IF EXISTS "Usuarios pueden ver tables" ON tables;
CREATE POLICY "Usuarios pueden ver tables"
  ON tables FOR SELECT
  TO authenticated
  USING (true);

-- Política para UPDATE en tables (actualizar estado de mesas)
DROP POLICY IF EXISTS "Usuarios pueden actualizar tables" ON tables;
CREATE POLICY "Usuarios pueden actualizar tables"
  ON tables FOR UPDATE
  TO authenticated
  USING (true);

-- ============================================
-- 5. POLÍTICAS PARA PROFILES
-- ============================================

-- Política para SELECT en profiles (ver perfiles de usuarios)
DROP POLICY IF EXISTS "Usuarios pueden ver profiles" ON profiles;
CREATE POLICY "Usuarios pueden ver profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Política para UPDATE en profiles (actualizar propio perfil)
DROP POLICY IF EXISTS "Usuarios pueden actualizar propio profile" ON profiles;
CREATE POLICY "Usuarios pueden actualizar propio profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- ============================================
-- 6. VERIFICAR QUE SE CREARON LAS POLÍTICAS
-- ============================================

SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'tables', 'profiles')
ORDER BY tablename, policyname;

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
-- Deberías ver al menos estas políticas:
--
-- orders:
--   - Usuarios pueden crear orders | INSERT
--   - Usuarios pueden ver orders | SELECT
--   - Usuarios pueden actualizar orders | UPDATE
--   - Usuarios pueden cancelar orders | DELETE
--
-- order_items:
--   - Usuarios pueden crear order_items | INSERT
--   - Usuarios pueden ver order_items | SELECT
--   - Usuarios pueden actualizar order_items | UPDATE
--   - Usuarios pueden eliminar order_items | DELETE
--
-- tables:
--   - Usuarios pueden ver tables | SELECT
--   - Usuarios pueden actualizar tables | UPDATE
--
-- profiles:
--   - Usuarios pueden ver profiles | SELECT
--   - Usuarios pueden actualizar propio profile | UPDATE
--
-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 1. Todas las políticas son para roles 'authenticated'
-- 2. Los usuarios deben estar logueados para usar el POS
-- 3. Las políticas permiten CRUD completo para usuarios autenticados
-- 4. Si quieres restringir más, puedes agregar condiciones adicionales
