-- ============================================
-- VERIFICAR ESTRUCTURA DE TABLAS Y POLÍTICAS
-- ============================================
-- Ejecuta esto en: https://supabase.com/dashboard/project/bhampokwjyjticzzejvs/sql

-- ============================================
-- 1. VERIFICAR COLUMNAS EN TABLA ORDERS
-- ============================================

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- Deberías ver estas columnas:
-- id, table_id, waiter_id, status, total, payment_method, 
-- subtotal, tax, paid_at, created_at, updated_at

-- ============================================
-- 2. VERIFICAR COLUMNAS EN TABLA TABLES
-- ============================================

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tables'
ORDER BY ordinal_position;

-- Deberías ver estas columnas:
-- id, name, capacity, status, section, waiter_id,
-- floor_x, floor_y, floor_shape, created_at, updated_at

-- ============================================
-- 3. VERIFICAR POLÍTICAS RLS EXISTENTES
-- ============================================

SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'tables')
ORDER BY tablename, policyname;

-- ============================================
-- 4. SI FALTA LA COLUMNA paid_at EN ORDERS, AGREGARLA
-- ============================================

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- 5. POLÍTICAS RLS NECESARIAS (EJECUTAR SI NO EXISTEN)
-- ============================================

-- Política para UPDATE en orders (actualizar estado a paid/cancelled)
DROP POLICY IF EXISTS "Usuarios pueden actualizar orders" ON orders;
CREATE POLICY "Usuarios pueden actualizar orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (true);

-- Política para UPDATE en tables (actualizar estado de mesas)
DROP POLICY IF EXISTS "Usuarios pueden actualizar tables" ON tables;
CREATE POLICY "Usuarios pueden actualizar tables"
  ON tables FOR UPDATE
  TO authenticated
  USING (true);

-- ============================================
-- 6. VERIFICACIÓN FINAL
-- ============================================

-- Verificar que paid_at existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND column_name = 'paid_at';

-- Verificar que las políticas existen
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('orders', 'tables')
  AND cmd = 'UPDATE';

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
-- 1. La tabla orders debe tener la columna paid_at (TIMESTAMP)
-- 2. Debe existir la política "Usuarios pueden actualizar orders" (UPDATE)
-- 3. Debe existir la política "Usuarios pueden actualizar tables" (UPDATE)
--
-- Si algo falta, ejecuta las secciones 4 y 5 de este script.
-- ============================================
