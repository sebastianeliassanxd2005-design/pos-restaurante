-- ==========================================
-- RESET COMPLETO DEL SISTEMA POS
-- Ejecutar en Supabase SQL Editor
-- ==========================================

-- ⚠️ ADVERTENCIA: Esto eliminará TODOS los datos del sistema
-- Solo ejecutar si estás seguro de querer borrar todo

-- 1. Eliminar todos los items de pedidos
DELETE FROM order_items;

-- 2. Eliminar todos los pedidos
DELETE FROM orders;

-- 3. Eliminar todos los items de pre-orden de reservas
DELETE FROM reservation_items;

-- 4. Eliminar todas las reservas
DELETE FROM reservations;

-- 5. Resetear estado de todas las mesas a "available"
UPDATE tables SET status = 'available';

-- 6. Eliminar productos (opcional - comenta esto si quieres mantener los productos)
-- DELETE FROM products;

-- 7. Eliminar categorías (opcional - comenta esto si quieres mantener las categorías)
-- DELETE FROM categories;

-- 8. Resetear secuencias de auto-incremento
ALTER SEQUENCE orders_order_number_seq RESTART WITH 1;

-- 9. Verificar reset
SELECT 
  'Mesas' as tabla, 
  COUNT(*) as total, 
  SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as disponibles
FROM tables
UNION ALL
SELECT 
  'Reservas', 
  COUNT(*), 
  SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END)
FROM reservations
UNION ALL
SELECT 
  'Pedidos', 
  COUNT(*), 
  SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END)
FROM orders
UNION ALL
SELECT 
  'Productos', 
  COUNT(*), 
  0
FROM products;

-- ==========================================
-- LISTO - Sistema reseteado
-- ==========================================
