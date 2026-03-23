-- ==========================================
-- SISTEMA POS PARA RESTAURANTE - SUPABASE
-- Versión Mejorada
-- ==========================================

-- Usuarios (meseros/admin)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'waiter', -- admin, waiter, kitchen
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categorías de productos
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  icon TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Productos del menú
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL NOT NULL,
  cost DECIMAL DEFAULT 0,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  available BOOLEAN DEFAULT true,
  image_url TEXT,
  preparation_time INT DEFAULT 0, -- minutos
  calories INT,
  is_featured BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mesas del restaurante
CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  capacity INT,
  status TEXT DEFAULT 'available', -- available, occupied, reserved, maintenance
  section TEXT DEFAULT 'main', -- main, vip, terrace, bar
  qr_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pedidos
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,
  table_id UUID REFERENCES tables(id),
  waiter_id UUID REFERENCES profiles(id),
  waiter_name TEXT,
  status TEXT DEFAULT 'pending', -- pending, cooking, served, paid, cancelled, refunded
  subtotal DECIMAL DEFAULT 0,
  discount DECIMAL DEFAULT 0,
  discount_reason TEXT,
  tax DECIMAL DEFAULT 0,
  total DECIMAL DEFAULT 0,
  payment_method TEXT, -- cash, card, transfer, split
  notes TEXT,
  kitchen_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  cooked_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ
);

-- Items del pedido
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL NOT NULL,
  discount DECIMAL DEFAULT 0,
  subtotal DECIMAL NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending', -- pending, cooking, ready, served, cancelled
  modifiers JSONB DEFAULT '[]', -- extras, modificaciones
  created_at TIMESTAMPTZ DEFAULT NOW(),
  cooked_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ
);

-- Historial de estados de orden
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  changed_by_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Descuentos y promociones
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'percentage', -- percentage, fixed
  value DECIMAL NOT NULL,
  min_order DECIMAL DEFAULT 0,
  max_uses INT,
  current_uses INT DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventario
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  ingredient_name TEXT NOT NULL,
  quantity DECIMAL NOT NULL,
  unit TEXT NOT NULL, -- kg, g, L, ml, units
  min_stock DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Movimientos de inventario
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES inventory(id),
  type TEXT NOT NULL, -- in, out, adjustment
  quantity DECIMAL NOT NULL,
  reason TEXT,
  reference TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ÍNDICES PARA MEJORAR PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(available);
CREATE INDEX IF NOT EXISTS idx_tables_status ON tables(status);

-- ==========================================
-- TRIGGERS PARA ACTUALIZACIÓN AUTOMÁTICA
-- ==========================================

-- Trigger para updated_at en orders
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para calcular totales automáticamente
CREATE OR REPLACE FUNCTION calculate_order_total()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcular subtotal de items
  SELECT COALESCE(SUM(subtotal), 0) INTO NEW.subtotal
  FROM order_items
  WHERE order_id = NEW.id AND status != 'cancelled';
  
  -- Calcular descuento
  NEW.discount = COALESCE(NEW.discount, 0);
  
  -- Calcular impuesto (19% ejemplo)
  NEW.tax = (NEW.subtotal - NEW.discount) * 0.19;
  
  -- Total final
  NEW.total = NEW.subtotal - NEW.discount + NEW.tax;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_order_total_trigger
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION calculate_order_total();

-- Trigger para historial de estados
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (order_id, status, changed_by_name, notes)
    VALUES (NEW.id, NEW.status, 'Sistema', 'Cambio de estado automático');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_order_status_change_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_status_change();

-- ==========================================
-- RLS - ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (puedes ajustar según autenticación)
CREATE POLICY "Acceso público a categorías" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso público a productos" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso público a mesas" ON tables FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso público a pedidos" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso público a order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso público a promociones" ON promotions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso público a historial" ON order_status_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Perfiles lectura" ON profiles FOR SELECT USING (true);
CREATE POLICY "Perfiles inserción" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ==========================================
-- DATOS DE EJEMPLO MEJORADOS
-- ==========================================

-- Categorías con colores
INSERT INTO categories (name, color, icon, sort_order) VALUES
  ('Bebidas', '#3b82f6', '🥤', 1),
  ('Entradas', '#f59e0b', '🍟', 2),
  ('Platos Principales', '#ef4444', '🍽️', 3),
  ('Postres', '#ec4899', '🍰', 4),
  ('Café', '#78350f', '☕', 5),
  ('Especiales', '#8b5cf6', '⭐', 6);

-- Mesas con secciones
INSERT INTO tables (name, code, capacity, status, section) VALUES
  ('Mesa 1', 'T001', 2, 'available', 'main'),
  ('Mesa 2', 'T002', 4, 'available', 'main'),
  ('Mesa 3', 'T003', 4, 'available', 'main'),
  ('Mesa 4', 'T004', 6, 'available', 'main'),
  ('Mesa 5', 'T005', 8, 'available', 'main'),
  ('Mesa 6', 'T006', 2, 'available', 'main'),
  ('Mesa 7', 'T007', 4, 'available', 'main'),
  ('Mesa 8', 'T008', 4, 'available', 'main'),
  ('VIP 1', 'V001', 4, 'available', 'vip'),
  ('VIP 2', 'V002', 6, 'available', 'vip'),
  ('Terraza 1', 'E001', 4, 'available', 'terrace'),
  ('Terraza 2', 'E002', 4, 'available', 'terrace'),
  ('Barra 1', 'B001', 1, 'available', 'bar'),
  ('Barra 2', 'B002', 1, 'available', 'bar'),
  ('Barra 3', 'B003', 1, 'available', 'bar');

-- Productos con más detalles
INSERT INTO products (name, description, price, cost, category_id, preparation_time, calories, is_featured) 
SELECT 'Coca Cola', 'Lata 355ml bien fría', 2.50, 1.20, id, 1, 140, false FROM categories WHERE name = 'Bebidas'
UNION ALL SELECT 'Agua Mineral', '500ml sin gas', 1.50, 0.50, id, 1, 0, false FROM categories WHERE name = 'Bebidas'
UNION ALL SELECT 'Jugo Natural', 'Naranja o Piña recién hecho', 3.00, 1.00, id, 3, 120, true FROM categories WHERE name = 'Bebidas'
UNION ALL SELECT 'Cerveza Nacional', '350ml bien fría', 3.50, 1.50, id, 1, 150, false FROM categories WHERE name = 'Bebidas'
UNION ALL SELECT 'Cerveza Importada', '355ml Corona/Heineken', 5.00, 2.50, id, 1, 145, false FROM categories WHERE name = 'Bebidas'
UNION ALL SELECT 'Limonada', 'Natural con hierbabuena', 2.50, 0.80, id, 2, 90, false FROM categories WHERE name = 'Bebidas'
UNION ALL SELECT 'Batido', 'Fresa/Vainilla/Chocolate', 4.00, 1.50, id, 3, 250, false FROM categories WHERE name = 'Bebidas'
UNION ALL SELECT 'Cóctel del Día', 'Pregunta al bartender', 6.00, 2.50, id, 5, 180, true FROM categories WHERE name = 'Bebidas';

INSERT INTO products (name, description, price, cost, category_id, preparation_time, calories, is_featured) 
SELECT 'Papas Fritas', 'Con salsa de la casa y queso', 4.50, 1.50, id, 8, 350, false FROM categories WHERE name = 'Entradas'
UNION ALL SELECT 'Aros de Cebolla', 'Crujientes con salsa ranchera', 5.00, 1.80, id, 8, 320, false FROM categories WHERE name = 'Entradas'
UNION ALL SELECT 'Empanadas', '3 unidades surtidas (carne/queso)', 6.00, 2.00, id, 10, 280, true FROM categories WHERE name = 'Entradas'
UNION ALL SELECT 'Nachos Supremos', 'Con queso, jalapeños, guacamole', 7.50, 2.50, id, 8, 450, false FROM categories WHERE name = 'Entradas'
UNION ALL SELECT 'Alitas BBQ', '6 unidades con salsa BBQ', 8.00, 3.00, id, 12, 380, true FROM categories WHERE name = 'Entradas'
UNION ALL SELECT 'Tostadas', '3 unidades con toppings', 5.50, 1.80, id, 5, 200, false FROM categories WHERE name = 'Entradas'
UNION ALL SELECT 'Guacamole', 'Con totopos caseros', 6.50, 2.20, id, 5, 290, false FROM categories WHERE name = 'Entradas';

INSERT INTO products (name, description, price, cost, category_id, preparation_time, calories, is_featured) 
SELECT 'Hamburguesa Clásica', 'Carne 150g, queso, lechuga, tomate, cebolla', 8.50, 3.50, id, 15, 550, false FROM categories WHERE name = 'Platos Principales'
UNION ALL SELECT 'Hamburguesa Doble', 'Doble carne 300g, doble queso', 10.50, 4.50, id, 15, 750, true FROM categories WHERE name = 'Platos Principales'
UNION ALL SELECT 'Hamburguesa Vegana', 'Carne vegetal, queso vegan', 11.00, 4.80, id, 15, 420, false FROM categories WHERE name = 'Platos Principales'
UNION ALL SELECT 'Hot Dog Especial', 'Salchicha jumbo, toppings completos', 5.50, 2.20, id, 10, 480, false FROM categories WHERE name = 'Platos Principales'
UNION ALL SELECT 'Pizza Pepperoni', '12 pulgadas, mozzarella, pepperoni', 12.00, 4.50, id, 18, 680, true FROM categories WHERE name = 'Platos Principales'
UNION ALL SELECT 'Pizza Margarita', 'Tomate, mozzarella fresca, albahaca', 11.00, 4.00, id, 18, 620, false FROM categories WHERE name = 'Platos Principales'
UNION ALL SELECT 'Pizza Hawaiana', 'Jamón, piña, queso', 11.50, 4.20, id, 18, 640, false FROM categories WHERE name = 'Platos Principales'
UNION ALL SELECT 'Pollo a la Plancha', 'Pechuga con arroz y ensalada', 9.50, 3.80, id, 20, 450, false FROM categories WHERE name = 'Platos Principales'
UNION ALL SELECT 'Pollo Frito', '3 piezas con papas y coleslaw', 10.00, 4.00, id, 18, 680, true FROM categories WHERE name = 'Platos Principales'
UNION ALL SELECT 'Pescado Frito', 'Filete con patacones y ensalada', 11.00, 4.50, id, 20, 520, false FROM categories WHERE name = 'Platos Principales'
UNION ALL SELECT 'Salmón', 'A la plancha con vegetales', 14.00, 6.00, id, 22, 480, true FROM categories WHERE name = 'Platos Principales'
UNION ALL SELECT 'Pasta Carbonara', 'Espagueti, panceta, parmesano', 10.50, 4.00, id, 15, 590, false FROM categories WHERE name = 'Platos Principales'
UNION ALL SELECT 'Tacos al Pastor', '3 tacos con piña', 8.50, 3.20, id, 12, 420, true FROM categories WHERE name = 'Platos Principales'
UNION ALL SELECT 'Burrito', 'Carne/frijoles, arroz, queso, salsa', 9.00, 3.50, id, 12, 580, false FROM categories WHERE name = 'Platos Principales';

INSERT INTO products (name, description, price, cost, category_id, preparation_time, calories, is_featured) 
SELECT 'Helado', '3 bolas a elegir (vainilla, chocolate, fresa)', 4.00, 1.50, id, 2, 280, false FROM categories WHERE name = 'Postres'
UNION ALL SELECT 'Flan de Queso', 'Con arequipe y crema', 3.50, 1.20, id, 1, 320, false FROM categories WHERE name = 'Postres'
UNION ALL SELECT 'Brownie', 'Con helado de vainilla y chocolate', 4.50, 1.60, id, 2, 450, true FROM categories WHERE name = 'Postres'
UNION ALL SELECT 'Cheesecake', 'Con salsa de frutos rojos', 5.00, 1.80, id, 1, 380, false FROM categories WHERE name = 'Postres'
UNION ALL SELECT 'Tiramisú', 'Receta italiana tradicional', 5.50, 2.00, id, 1, 350, true FROM categories WHERE name = 'Postres'
UNION ALL SELECT 'Volcán de Chocolate', 'Con helado de vainilla', 6.00, 2.20, id, 8, 520, true FROM categories WHERE name = 'Postres';

INSERT INTO products (name, description, price, cost, category_id, preparation_time, calories, is_featured) 
SELECT 'Café Tinto', 'Café colombiano 150ml', 1.50, 0.40, id, 2, 5, false FROM categories WHERE name = 'Café'
UNION ALL SELECT 'Café Americano', 'Café filtrado 250ml', 2.50, 0.60, id, 2, 10, false FROM categories WHERE name = 'Café'
UNION ALL SELECT 'Cappuccino', 'Espresso con leche espumada', 3.50, 1.00, id, 3, 80, true FROM categories WHERE name = 'Café'
UNION ALL SELECT 'Latte', 'Espresso con leche caliente', 3.50, 1.00, id, 3, 100, false FROM categories WHERE name = 'Café'
UNION ALL SELECT 'Espresso', 'Doble shot 60ml', 2.00, 0.50, id, 2, 5, false FROM categories WHERE name = 'Café'
UNION ALL SELECT 'Mocha', 'Espresso, chocolate, leche', 4.00, 1.20, id, 3, 180, true FROM categories WHERE name = 'Café'
UNION ALL SELECT 'Frappuccino', 'Café frappé con crema', 4.50, 1.50, id, 4, 250, false FROM categories WHERE name = 'Café';

-- Promociones
INSERT INTO promotions (name, description, type, value, min_order, valid_until, active) VALUES
  ('Feliz Hora', '20% descuento en bebidas', 'percentage', 20, 0, '2026-12-31 20:00:00', true),
  ('Combo Familiar', '$5 descuento en pedidos +$30', 'fixed', 5, 30, '2026-12-31', true),
  ('Postre Gratis', 'Postre gratis con plato principal', 'fixed', 5, 15, '2026-12-31', true);
