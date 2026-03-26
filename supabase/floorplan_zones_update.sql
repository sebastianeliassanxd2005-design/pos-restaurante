-- ============================================
-- Floor Plan Zones - ACTUALIZACIÓN CON COLORES
-- ============================================
-- Ejecuta esto en: https://supabase.com/dashboard/project/bhampokwjyjticzzejvs/sql

-- 1. Agregar columnas de color si no existen
ALTER TABLE floorplan_zones 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#fef2f2',
ADD COLUMN IF NOT EXISTS border_color TEXT DEFAULT '#ef4444';

-- 2. Actualizar zonas existentes con colores por defecto (opcional)
UPDATE floorplan_zones 
SET 
  color = COALESCE(color, '#fef2f2'),
  border_color = COALESCE(border_color, '#ef4444')
WHERE color IS NULL OR border_color IS NULL;

-- 3. Verificar que las columnas existen
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'floorplan_zones'
ORDER BY ordinal_position;

-- ============================================
-- Notas:
-- ============================================
-- color: color de fondo de la zona (ej: '#fef2f2')
-- border_color: color del borde de la zona (ej: '#ef4444')
-- Ambos campos son TEXT y opcionales (pueden ser NULL)
