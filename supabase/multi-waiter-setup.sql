-- ============================================
-- SISTEMA MULTI-MESERO
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- para agregar el campo waiter_id a las tablas

-- 1. Agregar columna waiter_id a la tabla orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS waiter_id UUID REFERENCES auth.users(id);

-- 2. Agregar columna waiter_id a la tabla tables
ALTER TABLE tables 
ADD COLUMN IF NOT EXISTS waiter_id UUID REFERENCES auth.users(id);

-- 3. Agregar índice para mejorar rendimiento en búsquedas
CREATE INDEX IF NOT EXISTS idx_orders_waiter_id ON orders(waiter_id);
CREATE INDEX IF NOT EXISTS idx_tables_waiter_id ON tables(waiter_id);

-- 4. Actualizar órdenes existentes con el usuario que las creó
-- (si tienes un campo created_by o similar, úsalo)
-- UPDATE orders SET waiter_id = (SELECT id FROM auth.users LIMIT 1) WHERE waiter_id IS NULL;

-- ============================================
-- CONSULTAS DE EJEMPLO
-- ============================================

-- Ver todas las órdenes con su mesero asignado
-- SELECT o.*, p.full_name as waiter_name 
-- FROM orders o
-- LEFT JOIN profiles p ON o.waiter_id = p.id
-- ORDER BY o.created_at DESC;

-- Ver todas las mesas con su mesero asignado
-- SELECT t.*, p.full_name as waiter_name 
-- FROM tables t
-- LEFT JOIN profiles p ON t.waiter_id = p.id
-- ORDER BY t.name;

-- ============================================
-- FUNCIONES ÚTILES
-- ============================================

-- Función para obtener todos los meseros
-- CREATE OR REPLACE FUNCTION get_all_waiters()
-- RETURNS TABLE (
--   id UUID,
--   email TEXT,
--   full_name TEXT,
--   role TEXT
-- ) AS $$
-- BEGIN
--   RETURN QUERY
--   SELECT p.id, p.email, p.full_name, p.role
--   FROM profiles p
--   WHERE p.role = 'waiter'
--   ORDER BY p.full_name;
-- END;
-- $$ LANGUAGE plpgsql;
