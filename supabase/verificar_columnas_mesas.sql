-- ============================================
-- VERIFICAR COLUMNAS FLOOR PLAN EN TABLAS
-- ============================================
-- Ejecuta esto en: https://supabase.com/dashboard/project/bhampokwjyjticzzejvs/sql

-- 1. Verificar si las columnas existen
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tables'
  AND column_name IN ('floor_x', 'floor_y', 'floor_shape')
ORDER BY column_name;

-- 2. Si NO existen las columnas, ejecutar esto:
ALTER TABLE tables
ADD COLUMN IF NOT EXISTS floor_x INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS floor_y INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS floor_shape TEXT DEFAULT 'round';

-- 3. Crear índice para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_tables_floor_position ON tables(floor_x, floor_y);

-- 4. Verificar datos actuales
SELECT id, name, floor_x, floor_y, floor_shape
FROM tables
ORDER BY name;

-- ============================================
-- Notas:
-- ============================================
-- Si las columnas NO existen, el paso 2 las creará automáticamente
-- floor_x y floor_y guardan la posición en el canvas
-- floor_shape puede ser 'round' o 'square'
