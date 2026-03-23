-- ==========================================
-- SOLUCIÓN DEFINITIVA - FECHAS EN RESERVAS
-- Ejecutar en Supabase SQL Editor
-- ==========================================

-- 1. Eliminar TODOS los triggers y funciones anteriores
DROP TRIGGER IF EXISTS adjust_date_trigger ON reservations;
DROP TRIGGER IF EXISTS adjust_date_trigger_insert ON reservations;
DROP FUNCTION IF EXISTS adjust_reservation_date();
DROP FUNCTION IF EXISTS adjust_reservation_date_insert();
DROP FUNCTION IF EXISTS adjust_reservation_date_on_insert();

-- 2. Verificar cómo está guardada la fecha actualmente
SELECT 
  id, 
  customer_name, 
  reservation_date,
  pg_typeof(reservation_date) as tipo_dato
FROM reservations
ORDER BY created_at DESC
LIMIT 5;

-- 3. Si la columna es TIMESTAMPTZ, cambiarla a DATE (sin zona horaria)
ALTER TABLE reservations 
ALTER COLUMN reservation_date TYPE DATE 
USING reservation_date::DATE;

-- 4. Verificar que el tipo de dato cambió a DATE
\d reservations

-- 5. NO USAR TRIGGER - El frontend debe enviar la fecha correctamente
-- El problema es que Supabase convierte automáticamente a UTC
-- La solución es usar DATE en lugar de TIMESTAMPTZ

-- ==========================================
-- CORRECCIÓN DE DATOS EXISTENTES
-- ==========================================

-- Si las fechas están un día atrás, corregirlas
UPDATE reservations
SET reservation_date = reservation_date + INTERVAL '1 day'
WHERE reservation_date < '2026-03-22'::DATE;

-- ==========================================
-- VERIFICACIÓN FINAL
-- ==========================================

-- Ver todas las reservas con sus fechas
SELECT 
  id, 
  customer_name, 
  reservation_date,
  reservation_time,
  status,
  created_at
FROM reservations
ORDER BY reservation_date DESC, reservation_time;

-- ==========================================
-- INSTRUCCIONES PARA EL FRONTEND
-- ==========================================
-- 
-- En el código React (Tables.jsx y Reservas.jsx):
-- 
-- Al CREAR reserva, NO agregar 1 día manualmente
-- El frontend debe enviar la fecha TAL CUAL la selecciona el usuario:
--
-- reservation_date: newReservationData.reservation_date
--
-- NO hacer esto:
-- fechaLocal.setDate(fechaLocal.getDate() + 1)  ❌
--
-- La base de datos ahora es de tipo DATE (sin zona horaria)
-- así que guardará exactamente lo que envíes
--
-- ==========================================
-- LISTO
-- ==========================================
