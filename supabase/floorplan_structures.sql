-- ============================================
-- Floor Plan Structures - Paredes y Columnas
-- ============================================
-- Ejecuta esto en: https://supabase.com/dashboard/project/bhampokwjyjticzzejvs/sql

-- 1. Crear tabla de estructuras del floorplan
CREATE TABLE IF NOT EXISTS floorplan_structures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('wall', 'column')),
  x INTEGER NOT NULL DEFAULT 0,
  y INTEGER NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  size INTEGER,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE floorplan_structures ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acceso

-- Todos los autenticados pueden ver estructuras
CREATE POLICY "Todos pueden ver estructuras"
  ON floorplan_structures
  FOR SELECT
  TO authenticated
  USING (true);

-- Todos los autenticados pueden crear estructuras
CREATE POLICY "Todos pueden crear estructuras"
  ON floorplan_structures
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Todos los autenticados pueden actualizar estructuras
CREATE POLICY "Todos pueden actualizar estructuras"
  ON floorplan_structures
  FOR UPDATE
  TO authenticated
  USING (true);

-- Todos los autenticados pueden eliminar estructuras
CREATE POLICY "Todos pueden eliminar estructuras"
  ON floorplan_structures
  FOR DELETE
  TO authenticated
  USING (true);

-- 4. Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_structures_type ON floorplan_structures(type);
CREATE INDEX IF NOT EXISTS idx_structures_position ON floorplan_structures(x, y);
CREATE INDEX IF NOT EXISTS idx_structures_created_at ON floorplan_structures(created_at DESC);

-- 5. Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_structures_updated_at
  BEFORE UPDATE ON floorplan_structures
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Funciones adicionales
-- ============================================

-- Función para obtener todas las estructuras
CREATE OR REPLACE FUNCTION get_floorplan_structures()
RETURNS TABLE (
  id UUID,
  type TEXT,
  x INTEGER,
  y INTEGER,
  width INTEGER,
  height INTEGER,
  size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fs.id,
    fs.type,
    fs.x,
    fs.y,
    fs.width,
    fs.height,
    fs.size,
    fs.created_at,
    fs.updated_at
  FROM floorplan_structures fs
  ORDER BY fs.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Ejemplos de uso
-- ============================================

-- Insertar una pared
-- INSERT INTO floorplan_structures (type, x, y, width, height)
-- VALUES ('wall', 100, 100, 200, 20);

-- Insertar una columna
-- INSERT INTO floorplan_structures (type, x, y, size)
-- VALUES ('column', 150, 150, 40);

-- Obtener todas las estructuras
-- SELECT * FROM get_floorplan_structures();

-- Eliminar una estructura
-- DELETE FROM floorplan_structures WHERE id = 'UUID_DE_LA_ESTRUCTURA';

-- ============================================
-- Notas importantes
-- ============================================
-- 
-- 1. type: 'wall' para paredes, 'column' para columnas
-- 2. Para paredes: usar width y height
-- 3. Para columnas: usar size (diámetro)
-- 4. x, y: posición en el canvas
-- 5. Las estructuras se guardan permanentemente en la BD
-- 6. Se sincronizan en tiempo real entre todos los usuarios
