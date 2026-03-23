-- ==========================================
-- CORRECCIÓN: FECHAS Y HORAS AL EDITAR RESERVAS
-- Ejecutar en Supabase SQL Editor
-- ==========================================

-- 1. Eliminar trigger anterior (que sumaba 1 día siempre, incluso al editar)
DROP TRIGGER IF EXISTS adjust_date_trigger ON reservations;
DROP FUNCTION IF EXISTS adjust_reservation_date();
DROP TRIGGER IF EXISTS adjust_date_trigger_insert ON reservations;
DROP FUNCTION IF EXISTS adjust_reservation_date_insert();

-- 2. Crear nuevo trigger que SOLO ajusta al CREAR (INSERT), NO al EDITAR (UPDATE)
CREATE OR REPLACE FUNCTION adjust_reservation_date_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo ajustar fecha al INSERTAR (crear nueva reserva)
  -- Esto compensa la zona horaria UTC
  IF TG_OP = 'INSERT' THEN
    NEW.reservation_date = (NEW.reservation_date::DATE + INTERVAL '1 day')::DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER adjust_reservation_date_on_insert
  BEFORE INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION adjust_reservation_date_on_insert();

-- 3. Verificar que el trigger se creó correctamente
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'reservations';

-- 4. Probar que las fechas no cambian al actualizar
-- (Esto es solo para verificar, no es necesario ejecutarlo)
/*
-- Actualizar una reserva de prueba
UPDATE reservations 
SET notes = 'Prueba de actualización - ' || NOW()::TEXT
WHERE id = (SELECT id FROM reservations LIMIT 1);

-- Verificar que la fecha no cambió
SELECT id, customer_name, reservation_date, reservation_time, notes
FROM reservations
ORDER BY created_at DESC
LIMIT 5;
*/

-- ==========================================
-- RESULTADO ESPERADO
-- ==========================================
-- ✅ Al CREAR reserva: La fecha se ajusta automáticamente (+1 día para UTC)
-- ✅ Al EDITAR reserva: La fecha se mantiene igual (no se ajusta)
-- ✅ La hora se mantiene correcta al editar

-- ==========================================
-- LISTO - Ahora puedes editar reservas sin que cambie la fecha/hora
-- ==========================================
