-- ============================================
-- ARREGLO: Columna updated_at en tabla tables
-- ============================================
-- Ejecuta esto en: https://supabase.com/dashboard/project/bhampokwjyjticzzejvs/sql
-- 
-- Problema: Error 400 - "Could not find the 'updated_at' column of 'tables'"
-- Solución: Agregar columna updated_at y trigger para actualizarla automáticamente

-- ============================================
-- 1. Agregar columna updated_at si no existe
-- ============================================

ALTER TABLE tables
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================
-- 2. Crear función para actualizar updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. Crear trigger en la tabla tables
-- ============================================

DROP TRIGGER IF EXISTS tables_updated_at ON tables;

CREATE TRIGGER tables_updated_at
  BEFORE UPDATE ON tables
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. Verificar que la columna existe
-- ============================================

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tables'
  AND column_name = 'updated_at'
ORDER BY column_name;

-- ============================================
-- 5. Verificar que el trigger existe
-- ============================================

SELECT trigger_name, event_manipulation, event_object_table, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'tables'
  AND trigger_name = 'tables_updated_at';

-- ============================================
-- Resultado esperado:
-- ============================================
-- 1. La columna updated_at debe aparecer en el resultado
-- 2. El trigger tables_updated_at debe estar creado
-- 3. Al actualizar cualquier columna de tables, updated_at se actualiza solo

-- ============================================
-- Notas:
-- ============================================
-- - updated_at se actualiza automáticamente con cada UPDATE
-- - No es necesario incluir updated_at en las consultas de actualización
-- - Esta columna es requerida por Supabase para el cacheo del schema
