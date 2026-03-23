-- ==========================================
-- CORRECCIÓN DE FECHAS - RESERVAS
-- Ejecutar en Supabase SQL Editor
-- ==========================================

-- 1. Ver fechas actuales en reservas
SELECT 
  id, 
  customer_name, 
  reservation_date, 
  reservation_time,
  status
FROM reservations
ORDER BY reservation_date DESC;

-- 2. Actualizar fechas que están un día atrás
-- Esto suma 1 día a todas las reservas para compensar la zona horaria
UPDATE reservations
SET reservation_date = (reservation_date::DATE + INTERVAL '1 day')::DATE
WHERE reservation_date < CURRENT_DATE;

-- 3. Verificar que las fechas se corrigieron
SELECT 
  id, 
  customer_name, 
  reservation_date, 
  reservation_time,
  status
FROM reservations
ORDER BY reservation_date DESC;

-- ==========================================
-- PREVENIR FUTUROS PROBLEMAS DE ZONA HORARIA
-- ==========================================

-- Opción A: Cambiar el tipo de columna a DATE (sin zona horaria)
-- Esto evita que PostgreSQL haga conversiones de zona horaria
ALTER TABLE reservations 
ALTER COLUMN reservation_date TYPE DATE 
USING reservation_date::DATE;

-- Opción B: Agregar trigger para ajustar fecha automáticamente
CREATE OR REPLACE FUNCTION adjust_reservation_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Ajustar fecha sumando 1 día para compensar UTC
  NEW.reservation_date = (NEW.reservation_date::DATE + INTERVAL '1 day')::DATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger que se ejecuta antes de insertar/actualizar
DROP TRIGGER IF EXISTS adjust_date_trigger ON reservations;
CREATE TRIGGER adjust_date_trigger
  BEFORE INSERT OR UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION adjust_reservation_date();

-- ==========================================
-- CONSULTAS ÚTILES
-- ==========================================

-- Ver reservas de hoy
SELECT * FROM reservations 
WHERE reservation_date = CURRENT_DATE
ORDER BY reservation_time;

-- Ver reservas futuras
SELECT * FROM reservations 
WHERE reservation_date >= CURRENT_DATE
ORDER BY reservation_date, reservation_time;

-- ==========================================
-- LISTO - Las fechas deberían estar correctas ahora
-- ==========================================
