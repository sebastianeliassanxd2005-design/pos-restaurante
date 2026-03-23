-- ==========================================
-- CORRECCIÓN DEFINITIVA - FECHAS EN SUPABASE
-- Ejecutar en Supabase SQL Editor
-- ==========================================

-- 1. Verificar tipos de datos actuales
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'reservations'
  AND column_name IN ('reservation_date', 'reservation_time');

-- 2. Eliminar triggers antiguos que puedan causar problemas
DROP TRIGGER IF EXISTS adjust_date_trigger ON reservations CASCADE;
DROP TRIGGER IF EXISTS adjust_date_trigger_insert ON reservations CASCADE;
DROP TRIGGER IF EXISTS adjust_reservation_date_on_insert ON reservations CASCADE;
DROP FUNCTION IF EXISTS adjust_reservation_date() CASCADE;
DROP FUNCTION IF EXISTS adjust_reservation_date_insert() CASCADE;
DROP FUNCTION IF EXISTS adjust_reservation_date_on_insert() CASCADE;

-- 3. Asegurar que reservation_date sea DATE (sin zona horaria)
ALTER TABLE reservations 
ALTER COLUMN reservation_date TYPE DATE 
USING reservation_date::DATE;

-- 4. Asegurar que reservation_time sea TIME (sin zona horaria)
ALTER TABLE reservations 
ALTER COLUMN reservation_time TYPE TIME 
USING reservation_time::TIME;

-- 5. Verificar que los tipos cambiaron correctamente
SELECT 
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name = 'reservations'
  AND column_name IN ('reservation_date', 'reservation_time');

-- 6. Corregir fechas existentes (si están un día atrás)
-- Solo ejecutar si las fechas están incorrectas
/*
UPDATE reservations
SET reservation_date = reservation_date + INTERVAL '1 day'
WHERE reservation_date < CURRENT_DATE;
*/

-- 7. Verificar datos finales
SELECT 
  id, 
  customer_name, 
  reservation_date,
  reservation_time,
  status,
  created_at
FROM reservations
ORDER BY reservation_date DESC, reservation_time
LIMIT 10;

-- 8. Crear índice para mejorar rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_reservations_date_status 
ON reservations(reservation_date, status);

-- ==========================================
-- IMPORTANTE
-- ==========================================
-- 
-- Después de ejecutar este script:
-- 1. Las fechas se guardarán SIN zona horaria
-- 2. Las fechas se mostrarán EXACTAMENTE como se guardan
-- 3. No habrá conversiones automáticas a UTC
--
-- El frontend debe enviar fechas en formato: "2026-03-22"
-- ==========================================
-- LISTO
-- ==========================================
