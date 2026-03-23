-- ==========================================
-- SISTEMA DE RESERVAS - SUPABASE
-- ==========================================

-- Tabla de reservas
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  party_size INT NOT NULL,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  status TEXT DEFAULT 'confirmed', -- confirmed, seated, cancelled, completed, no_show
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para buscar reservas por fecha
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_table ON reservations(table_id);

-- Habilitar RLS
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Políticas para reservas
CREATE POLICY "Usuarios autenticados pueden ver reservas" 
  ON reservations FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden crear reservas" 
  ON reservations FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden actualizar reservas" 
  ON reservations FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins pueden eliminar reservas" 
  ON reservations FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- DATOS DE EJEMPLO
-- ==========================================

-- Reservas para hoy y mañana
DO $$
DECLARE
  hoy DATE := CURRENT_DATE;
  mesa_id UUID;
  admin_id UUID;
BEGIN
  -- Obtener ID de una mesa y admin
  SELECT id INTO mesa_id FROM tables WHERE name = 'Mesa 2' LIMIT 1;
  SELECT id INTO admin_id FROM profiles WHERE role = 'admin' LIMIT 1;
  
  -- Insertar reservas de ejemplo
  INSERT INTO reservations (table_id, customer_name, customer_phone, party_size, reservation_date, reservation_time, status, notes, created_by)
  VALUES 
    (mesa_id, 'Juan Pérez', '555-1234', 4, hoy, '19:00', 'confirmed', 'Cumpleaños', admin_id),
    (mesa_id, 'María García', '555-5678', 2, hoy + 1, '20:00', 'confirmed', 'Aniversario', admin_id),
    (mesa_id, 'Carlos López', '555-9012', 6, hoy + 1, '21:00', 'confirmed', 'Cena empresarial', admin_id);
END $$;
