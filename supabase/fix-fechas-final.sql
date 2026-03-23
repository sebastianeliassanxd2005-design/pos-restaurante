-- ==========================================
-- SOLUCIÓN DEFINITIVA - FECHAS EN RESERVAS
-- Ejecutar en Supabase SQL Editor
-- ==========================================

-- 1. Eliminar TODOS los triggers existentes
DROP TRIGGER IF EXISTS adjust_date_trigger ON reservations CASCADE;
DROP TRIGGER IF EXISTS adjust_date_trigger_insert ON reservations CASCADE;
DROP TRIGGER IF EXISTS adjust_reservation_date_on_insert ON reservations CASCADE;

-- 2. Eliminar TODAS las funciones existentes
DROP FUNCTION IF EXISTS adjust_reservation_date() CASCADE;
DROP FUNCTION IF EXISTS adjust_reservation_date_insert() CASCADE;
DROP FUNCTION IF EXISTS adjust_reservation_date_on_insert() CASCADE;

-- 3. Verificar tipo de dato actual
SELECT 
  column_name, 
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'reservations'
  AND column_name IN ('reservation_date', 'reservation_time');

-- 4. Asegurar que reservation_date sea DATE (sin zona horaria)
ALTER TABLE reservations 
ALTER COLUMN reservation_date TYPE DATE 
USING reservation_date::DATE;

-- 5. Asegurar que reservation_time sea TIME (sin zona horaria)
ALTER TABLE reservations 
ALTER COLUMN reservation_time TYPE TIME 
USING reservation_time::TIME;

-- 6. Verificar que los tipos cambiaron correctamente
SELECT 
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name = 'reservations'
  AND column_name IN ('reservation_date', 'reservation_time');

-- 7. Corregir fechas existentes (si están un día atrás)
-- Solo ejecutar si es necesario
UPDATE reservations
SET reservation_date = reservation_date + INTERVAL '1 day'
WHERE reservation_date < CURRENT_DATE;

-- 8. Verificar datos finales
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

-- ==========================================
-- IMPORTANTE PARA EL FRONTEND
-- ==========================================
-- 
-- El frontend debe enviar la fecha EXACTA que el usuario selecciona
-- NO agregar ni quitar días
-- NO hacer conversiones de zona horaria
--
-- Ejemplo correcto:
-- reservation_date: "2026-03-22"  ✅
--
-- Ejemplo incorrecto:
-- fechaLocal.setDate(fechaLocal.getDate() + 1)  ❌
--
-- ==========================================
-- LISTO
-- ==========================================
