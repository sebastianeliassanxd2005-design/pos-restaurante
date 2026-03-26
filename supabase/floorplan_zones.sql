-- ============================================
-- Floor Plan Zones - Tabla para Supabase
-- ============================================
-- Ejecuta esto en: https://supabase.com/dashboard/project/TU_PROYECTO/sql

-- 1. Crear tabla de zonas del floorplan
CREATE TABLE IF NOT EXISTS floorplan_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  x INTEGER NOT NULL DEFAULT 0,
  y INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 100,
  height INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE floorplan_zones ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acceso (todos los autenticados pueden leer/escribir)
CREATE POLICY "Usuarios autenticados pueden ver zonas"
  ON floorplan_zones
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear zonas"
  ON floorplan_zones
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar zonas"
  ON floorplan_zones
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden eliminar zonas"
  ON floorplan_zones
  FOR DELETE
  TO authenticated
  USING (true);

-- 4. Índice para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_floorplan_zones_created ON floorplan_zones(created_at DESC);

-- ============================================
-- Migrar datos desde localStorage (opcional)
-- ============================================
-- Si ya tienes zonas en localStorage, ejecuta esto en la consola del navegador:
--
-- const zones = JSON.parse(localStorage.getItem('floorplan_zones') || '[]');
-- zones.forEach(zone => {
--   supabase.from('floorplan_zones').insert({
--     id: zone.id.replace('zone_', ''),
--     name: zone.name,
--     x: zone.x,
--     y: zone.y,
--     width: zone.width,
--     height: zone.height
--   });
-- });
-- localStorage.removeItem('floorplan_zones');
