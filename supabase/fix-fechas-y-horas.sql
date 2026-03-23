-- ==========================================
-- CORRECCIÓN DEFINITIVA - FECHAS Y HORAS
-- Ejecutar en Supabase SQL Editor
-- ==========================================

-- 1. Eliminar triggers primero (antes que las funciones)
DROP TRIGGER IF EXISTS adjust_date_trigger ON reservations CASCADE;
DROP TRIGGER IF EXISTS adjust_date_trigger_insert ON reservations CASCADE;
DROP TRIGGER IF EXISTS adjust_reservation_date_on_insert ON reservations CASCADE;

-- 2. Ahora eliminar las funciones
DROP FUNCTION IF EXISTS adjust_reservation_date() CASCADE;
DROP FUNCTION IF EXISTS adjust_reservation_date_insert() CASCADE;
DROP FUNCTION IF EXISTS adjust_reservation_date_on_insert() CASCADE;

-- 3. Cambiar columna reservation_date a DATE (sin zona horaria)
ALTER TABLE reservations 
ALTER COLUMN reservation_date TYPE DATE 
USING reservation_date::DATE;

-- 4. Cambiar columna reservation_time a TIME (sin zona horaria)
ALTER TABLE reservations 
ALTER COLUMN reservation_time TYPE TIME 
USING reservation_time::TIME;

-- 5. Verificar tipos de datos
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'reservations'
  AND column_name IN ('reservation_date', 'reservation_time');

-- 6. Corregir fechas existentes (si están un día atrás)
UPDATE reservations
SET reservation_date = reservation_date + INTERVAL '1 day'
WHERE reservation_date < '2026-03-22'::DATE;

-- 7. Verificar datos corregidos
SELECT 
  id, 
  customer_name, 
  reservation_date,
  reservation_time,
  status
FROM reservations
ORDER BY reservation_date DESC, reservation_time;

-- ==========================================
-- LISTO - Fechas y horas sin zona horaria
-- ==========================================
