-- ==========================================
-- ACTUALIZAR ESTADO DE MESAS CON RESERVAS
-- Ejecutar en Supabase SQL Editor
-- ==========================================

-- 1. Ver mesas con reservas activas (confirmed/seated)
SELECT 
  t.id,
  t.name as mesa_nombre,
  t.status as estado_actual,
  r.customer_name,
  r.reservation_date,
  r.reservation_time,
  r.status as reserva_status
FROM tables t
INNER JOIN reservations r ON t.id = r.table_id
WHERE r.status IN ('confirmed', 'seated')
  AND r.reservation_date >= CURRENT_DATE
ORDER BY r.reservation_date, r.reservation_time;

-- 2. Actualizar mesas con reservas a estado "reserved"
UPDATE tables
SET status = 'reserved'
WHERE id IN (
  SELECT DISTINCT table_id
  FROM reservations
  WHERE status IN ('confirmed', 'seated')
    AND reservation_date >= CURRENT_DATE
);

-- 3. Verificar que se actualizó correctamente
SELECT 
  t.id,
  t.name as mesa_nombre,
  t.status as estado_nuevo,
  r.customer_name,
  r.reservation_date,
  r.reservation_time
FROM tables t
INNER JOIN reservations r ON t.id = r.table_id
WHERE r.status IN ('confirmed', 'seated')
  AND r.reservation_date >= CURRENT_DATE
ORDER BY t.name;

-- ==========================================
-- LISTO - Las mesas ahora deberían estar como "reserved"
-- ==========================================
