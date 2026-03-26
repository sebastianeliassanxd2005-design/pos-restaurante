-- ============================================
-- Floor Plan Tables - Posiciones de Mesas
-- ============================================
-- Ejecuta esto en: https://supabase.com/dashboard/project/bhampokwjyjticzzejvs/sql

-- 1. Agregar columnas para posiciones al tabla tables
ALTER TABLE tables 
ADD COLUMN IF NOT EXISTS floor_x INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS floor_y INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS floor_shape TEXT DEFAULT 'round';

-- 2. Índice para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_tables_floor_position ON tables(floor_x, floor_y);

-- ============================================
-- Funciones para guardar posiciones
-- ============================================

-- Función para actualizar posición de mesa
CREATE OR REPLACE FUNCTION update_table_position(
  p_table_id UUID,
  p_x INTEGER,
  p_y INTEGER,
  p_shape TEXT DEFAULT 'round'
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE tables
  SET 
    floor_x = p_x,
    floor_y = p_y,
    floor_shape = p_shape,
    updated_at = NOW()
  WHERE id = p_table_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener todas las mesas con posiciones
CREATE OR REPLACE FUNCTION get_tables_with_positions()
RETURNS TABLE (
  id UUID,
  name TEXT,
  capacity INTEGER,
  status TEXT,
  section TEXT,
  waiter_id UUID,
  floor_x INTEGER,
  floor_y INTEGER,
  floor_shape TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.capacity,
    t.status,
    t.section,
    t.waiter_id,
    t.floor_x,
    t.floor_y,
    t.floor_shape,
    t.created_at,
    t.updated_at
  FROM tables t
  ORDER BY t.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Trigger para actualizar automáticamente
-- ============================================

-- Trigger function
CREATE OR REPLACE FUNCTION update_floor_position_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger en tabla tables
CREATE TRIGGER tables_floor_position_update
  BEFORE UPDATE ON tables
  FOR EACH ROW
  WHEN (OLD.floor_x IS DISTINCT FROM NEW.floor_x OR OLD.floor_y IS DISTINCT FROM NEW.floor_y)
  EXECUTE FUNCTION update_floor_position_trigger();

-- ============================================
-- Ejemplos de uso
-- ============================================

-- Actualizar posición de una mesa
-- SELECT update_table_position('UUID_DE_LA_MESA', 100, 200, 'round');

-- Obtener todas las mesas con posiciones
-- SELECT * FROM get_tables_with_positions();

-- ============================================
-- Notas importantes
-- ============================================
-- 
-- 1. Las columnas floor_x y floor_y guardan la posición X/Y de cada mesa
-- 2. floor_shape puede ser 'round' o 'square'
-- 3. El FloorPlan debe cargar estas posiciones al iniciar
-- 4. Cada vez que se mueve una mesa, se actualiza en la base de datos
-- 5. Las posiciones son relativas al canvas del FloorPlan
