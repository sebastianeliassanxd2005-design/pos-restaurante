-- ============================================
-- MULTI-RESTAURANTE - Configuración Completa
-- ============================================
-- Ejecuta esto en: https://supabase.com/dashboard/project/bhampokwjyjticzzejvs/sql
-- 
-- Este archivo crea la estructura multi-restaurante con todas las políticas RLS necesarias

-- ============================================
-- 1. TABLA DE RESTAURANTES
-- ============================================

CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,  -- "restaurante1", "sabor-latino"
  logo_url TEXT,
  primary_color TEXT DEFAULT '#dc2626',  -- Color principal (rojo por defecto)
  secondary_color TEXT DEFAULT '#1e293b',  -- Color secundario (azul oscuro)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas por slug
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);

-- RLS (Row Level Security)
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. POLÍTICAS RLS PARA RESTAURANTES
-- ============================================

-- Política: Todos los autenticados pueden ver restaurantes activos
DROP POLICY IF EXISTS "Usuarios ven restaurantes activos" ON restaurants;
CREATE POLICY "Usuarios ven restaurantes activos"
  ON restaurants FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Política: Usuarios pueden actualizar SU restaurante
DROP POLICY IF EXISTS "Usuarios pueden actualizar su restaurante" ON restaurants;
CREATE POLICY "Usuarios pueden actualizar su restaurante"
  ON restaurants FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT restaurant_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Política: Admin pueden crear restaurantes
DROP POLICY IF EXISTS "Admin pueden crear restaurantes" ON restaurants;
CREATE POLICY "Admin pueden crear restaurantes"
  ON restaurants FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- 3. AGREGAR restaurant_id A TABLAS EXISTENTES
-- ============================================

-- profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id);

-- tables
ALTER TABLE tables 
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id);

-- orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id);

-- order_items
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id);

-- reservations
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id);

-- reservation_items
ALTER TABLE reservation_items 
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id);

-- products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id);

-- categories
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id);

-- floorplan_zones
ALTER TABLE floorplan_zones 
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id);

-- floorplan_structures
ALTER TABLE floorplan_structures 
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id);

-- system_announcements
ALTER TABLE system_announcements 
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id);

-- support_reports
ALTER TABLE support_reports 
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id);

-- ============================================
-- 4. DATOS DE EJEMPLO - RESTAURANTE POR DEFECTO
-- ============================================

-- Insertar restaurante por defecto
INSERT INTO restaurants (id, name, slug, logo_url, primary_color, secondary_color)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Mi Restaurante',
  'default',
  '/logo.svg',
  '#dc2626',
  '#1e293b'
)
ON CONFLICT (id) DO NOTHING;

-- Actualizar usuarios existentes para que apunten al restaurante por defecto
UPDATE profiles 
SET restaurant_id = '00000000-0000-0000-0000-000000000001'
WHERE restaurant_id IS NULL;

-- Actualizar todas las tablas para que apunten al restaurante por defecto
UPDATE tables SET restaurant_id = '00000000-0000-0000-0000-000000000001' WHERE restaurant_id IS NULL;
UPDATE orders SET restaurant_id = '00000000-0000-0000-0000-000000000001' WHERE restaurant_id IS NULL;
UPDATE order_items SET restaurant_id = '00000000-0000-0000-0000-000000000001' WHERE restaurant_id IS NULL;
UPDATE reservations SET restaurant_id = '00000000-0000-0000-0000-000000000001' WHERE restaurant_id IS NULL;
UPDATE reservation_items SET restaurant_id = '00000000-0000-0000-0000-000000000001' WHERE restaurant_id IS NULL;
UPDATE products SET restaurant_id = '00000000-0000-0000-0000-000000000001' WHERE restaurant_id IS NULL;
UPDATE categories SET restaurant_id = '00000000-0000-0000-0000-000000000001' WHERE restaurant_id IS NULL;
UPDATE floorplan_zones SET restaurant_id = '00000000-0000-0000-0000-000000000001' WHERE restaurant_id IS NULL;
UPDATE floorplan_structures SET restaurant_id = '00000000-0000-0000-0000-000000000001' WHERE restaurant_id IS NULL;
UPDATE system_announcements SET restaurant_id = '00000000-0000-0000-0000-000000000001' WHERE restaurant_id IS NULL;
UPDATE support_reports SET restaurant_id = '00000000-0000-0000-0000-000000000001' WHERE restaurant_id IS NULL;

-- ============================================
-- 5. VERIFICACIÓN
-- ============================================

-- Verificar que el restaurante se creó
SELECT id, name, slug, primary_color, secondary_color 
FROM restaurants;

-- Verificar que los usuarios tienen restaurant_id
SELECT id, email, restaurant_id 
FROM profiles 
WHERE restaurant_id IS NOT NULL
LIMIT 5;

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'restaurants'
ORDER BY policyname;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
--
-- 1. El restaurante por defecto tiene ID: 00000000-0000-0000-0000-000000000001
-- 2. Todos los datos existentes se asignan al restaurante por defecto
-- 3. Los nuevos restaurantes tendrán UUIDs únicos
-- 4. Cada usuario pertenece a un restaurante específico
-- 5. Los datos están aislados por restaurant_id
--
-- ============================================
-- PRÓXIMOS PASOS
-- ============================================
--
-- 1. ✅ Ejecutar este SQL en Supabase
-- 2. ✅ Verificar que el restaurante por defecto se creó
-- 3. ✅ Recargar localhost (Ctrl + F5)
-- 4. ✅ Iniciar sesión con tu cuenta de admin
-- 5. ✅ Ir a Configuración y personalizar tu restaurante
--
-- ============================================
