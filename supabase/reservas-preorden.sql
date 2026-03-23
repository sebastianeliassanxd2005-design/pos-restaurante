-- ==========================================
-- PRE-ORDEN EN RESERVAS - SUPABASE
-- Copiar y pegar en SQL Editor
-- ==========================================

-- 1. Agregar columnas para pre-orden en reservations
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS has_preorder BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS preorder_total DECIMAL DEFAULT 0;

-- 2. Tabla para items de pre-orden
CREATE TABLE IF NOT EXISTS reservation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL NOT NULL,
  subtotal DECIMAL NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_reservation_items_reservation 
ON reservation_items(reservation_id);

CREATE INDEX IF NOT EXISTS idx_reservation_items_product 
ON reservation_items(product_id);

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE reservation_items ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de seguridad
CREATE POLICY "Usuarios autenticados pueden ver reservation_items" 
  ON reservation_items FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden crear reservation_items" 
  ON reservation_items FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden actualizar reservation_items" 
  ON reservation_items FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins pueden eliminar reservation_items" 
  ON reservation_items FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6. Función para actualizar el total de la pre-orden
CREATE OR REPLACE FUNCTION update_reservation_total()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE reservations 
    SET 
      preorder_total = (
        SELECT COALESCE(SUM(subtotal), 0)
        FROM reservation_items
        WHERE reservation_id = OLD.reservation_id
      ),
      has_preorder = (
        SELECT COUNT(*) > 0
        FROM reservation_items
        WHERE reservation_id = OLD.reservation_id
      )
    WHERE id = OLD.reservation_id;
    RETURN OLD;
  ELSE
    UPDATE reservations 
    SET 
      preorder_total = (
        SELECT COALESCE(SUM(subtotal), 0)
        FROM reservation_items
        WHERE reservation_id = NEW.reservation_id
      ),
      has_preorder = true
    WHERE id = NEW.reservation_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger para actualizar automáticamente el total
DROP TRIGGER IF EXISTS update_reservation_total_trigger ON reservation_items;
CREATE TRIGGER update_reservation_total_trigger
  AFTER INSERT OR UPDATE OR DELETE ON reservation_items
  FOR EACH ROW
  EXECUTE FUNCTION update_reservation_total();

-- ==========================================
-- DATOS DE EJEMPLO (OPCIONAL)
-- ==========================================

-- Insertar algunos items de ejemplo para una reserva existente
-- Descomenta esto si ya tienes reservas creadas
/*
DO $$
DECLARE
  reserva_id UUID;
  producto_id UUID;
BEGIN
  -- Obtener una reserva existente
  SELECT id INTO reserva_id FROM reservations LIMIT 1;
  
  -- Obtener un producto existente
  SELECT id INTO producto_id FROM products WHERE name LIKE '%Hamburguesa%' LIMIT 1;
  
  IF reserva_id IS NOT NULL AND producto_id IS NOT NULL THEN
    INSERT INTO reservation_items (reservation_id, product_id, product_name, quantity, price, subtotal, notes)
    VALUES (
      reserva_id,
      producto_id,
      'Hamburguesa Clásica',
      2,
      8.50,
      17.00,
      'Sin cebolla'
    );
  END IF;
END $$;
*/

-- ==========================================
-- CONSULTAS ÚTILES
-- ==========================================

-- Ver todas las reservas con pre-orden
-- SELECT r.*, COUNT(ri.id) as items_count, r.preorder_total
-- FROM reservations r
-- LEFT JOIN reservation_items ri ON r.id = ri.reservation_id
-- WHERE r.has_preorder = true
-- GROUP BY r.id
-- ORDER BY r.reservation_date, r.reservation_time;

-- Ver items de una reserva específica
-- SELECT ri.*, r.customer_name, r.reservation_date, r.reservation_time
-- FROM reservation_items ri
-- JOIN reservations r ON ri.reservation_id = r.id
-- WHERE r.id = 'TU_RESERVATION_ID_AQUI'
-- ORDER BY ri.created_at;

-- ==========================================
-- LISTO - Ahora puedes pre-ordenar platos en las reservas
-- ==========================================
