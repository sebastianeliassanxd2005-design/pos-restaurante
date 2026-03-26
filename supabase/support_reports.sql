-- ============================================
-- Support Reports - Tabla para Reportes de Usuarios
-- ============================================
-- Ejecuta esto en: https://supabase.com/dashboard/project/bhampokwjyjticzzejvs/sql

-- 1. Crear tabla de reportes de soporte
CREATE TABLE IF NOT EXISTS support_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  report_type TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'medium',
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_response TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  responded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE support_reports ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acceso

-- Los usuarios autenticados pueden ver sus propios reportes
CREATE POLICY "Usuarios pueden ver sus propios reportes"
  ON support_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Los usuarios autenticados pueden crear reportes
CREATE POLICY "Usuarios pueden crear reportes"
  ON support_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Solo admin puede ver todos los reportes
CREATE POLICY "Admin puede ver todos los reportes"
  ON support_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Solo admin puede actualizar reportes (responder)
CREATE POLICY "Admin puede actualizar reportes"
  ON support_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 4. Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_support_reports_user_id ON support_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_support_reports_status ON support_reports(status);
CREATE INDEX IF NOT EXISTS idx_support_reports_created_at ON support_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_reports_urgency ON support_reports(urgency);

-- 5. Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_support_reports_updated_at
  BEFORE UPDATE ON support_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Funciones adicionales para administración
-- ============================================

-- Función para obtener estadísticas de reportes
CREATE OR REPLACE FUNCTION get_support_reports_stats()
RETURNS TABLE (
  total_reports BIGINT,
  pending_reports BIGINT,
  resolved_reports BIGINT,
  high_urgency_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'resolved')::BIGINT,
    COUNT(*) FILTER (WHERE urgency = 'high')::BIGINT
  FROM support_reports;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Datos de ejemplo (opcional, para pruebas)
-- ============================================
-- INSERT INTO support_reports (user_id, user_email, report_type, urgency, description, status)
-- VALUES 
--   (
--     (SELECT id FROM auth.users LIMIT 1),
--     'usuario@ejemplo.com',
--     'error',
--     'medium',
--     'El sistema se cierra cuando intento guardar un pedido',
--     'pending'
--   ),
--   (
--     (SELECT id FROM auth.users LIMIT 1),
--     'usuario@ejemplo.com',
--     'performance',
--     'high',
--     'La aplicación está muy lenta al cargar las mesas',
--     'pending'
--   );

-- ============================================
-- Notas importantes
-- ============================================
-- 
-- 1. Para ver los reportes desde el dashboard:
--    https://supabase.com/dashboard/project/bhampokwjyjticzzejvs/editor
--
-- 2. Para responder a un reporte desde SQL:
--    UPDATE support_reports
--    SET 
--      status = 'resolved',
--      admin_response = 'El problema ha sido solucionado. Gracias por reportarlo.',
--      responded_at = NOW(),
--      responded_by = 'UUID_DEL_ADMIN'
--    WHERE id = 'UUID_DEL_REPORTE';
--
-- 3. Estados disponibles:
--    - pending: Pendiente de revisión
--    - in_progress: En proceso de solución
--    - resolved: Resuelto
--    - closed: Cerrado (sin acción)
--
-- 4. Tipos de reporte:
--    - error: Error del sistema
--    - bug: Bug o fallo
--    - performance: Problemas de rendimiento
--    - data: Datos incorrectos
--    - other: Otro
--
-- 5. Urgencias:
--    - low: Baja prioridad
--    - medium: Prioridad media
--    - high: Alta prioridad (crítico)
