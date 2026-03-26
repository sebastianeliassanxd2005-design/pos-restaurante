-- ============================================
-- System Announcements - Anuncios del Sistema
-- ============================================
-- Ejecuta esto en: https://supabase.com/dashboard/project/bhampokwjyjticzzejvs/sql

-- 1. Crear tabla de anuncios del sistema
CREATE TABLE IF NOT EXISTS system_announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  priority TEXT NOT NULL DEFAULT 'normal',
  is_active BOOLEAN NOT NULL DEFAULT true,
  show_until TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE system_announcements ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acceso

-- Todos los autenticados pueden ver anuncios activos
CREATE POLICY "Todos pueden ver anuncios activos"
  ON system_announcements
  FOR SELECT
  TO authenticated
  USING (is_active = true AND (show_until IS NULL OR show_until > NOW()));

-- Solo admin puede crear anuncios
CREATE POLICY "Solo admin puede crear anuncios"
  ON system_announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Solo admin puede actualizar anuncios
CREATE POLICY "Solo admin puede actualizar anuncios"
  ON system_announcements
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Solo admin puede eliminar anuncios
CREATE POLICY "Solo admin puede eliminar anuncios"
  ON system_announcements
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 4. Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON system_announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_show_until ON system_announcements(show_until);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON system_announcements(priority);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON system_announcements(created_at DESC);

-- 5. Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON system_announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Funciones adicionales
-- ============================================

-- Función para obtener anuncios activos
CREATE OR REPLACE FUNCTION get_active_announcements()
RETURNS TABLE (
  id UUID,
  title TEXT,
  message TEXT,
  type TEXT,
  priority TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  show_until TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sa.id,
    sa.title,
    sa.message,
    sa.type,
    sa.priority,
    sa.created_at,
    sa.show_until
  FROM system_announcements sa
  WHERE sa.is_active = true 
    AND (sa.show_until IS NULL OR sa.show_until > NOW())
  ORDER BY 
    CASE sa.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
    END,
    sa.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Tipos de anuncio disponibles:
-- ============================================
-- info: Información general (azul)
-- warning: Advertencia (amarillo)
-- error: Error/Problema (rojo)
-- success: Éxito/Actualización (verde)
-- maintenance: Mantenimiento (naranja)

-- ============================================
-- Prioridades disponibles:
-- ============================================
-- urgent: Urgente (muestra inmediatamente)
-- high: Alta prioridad
-- normal: Prioridad normal
-- low: Baja prioridad

-- ============================================
-- Ejemplos de uso
-- ============================================

-- Insertar anuncio de mantenimiento
-- INSERT INTO system_announcements (title, message, type, priority, show_until)
-- VALUES (
--   '⚠️ Mantenimiento Programado',
--   'Estimado usuario, el sistema estará fuera de servicio en un plazo máximo de 24 horas. Se estará notificando cuando el sistema esté en funcionamiento estable.',
--   'maintenance',
--   'high',
--   NOW() + INTERVAL '48 hours'
-- );

-- Insertar anuncio de actualización
-- INSERT INTO system_announcements (title, message, type, priority)
-- VALUES (
--   '✅ Nueva Funcionalidad',
--   'Se ha agregado la opción de Floor Plan para organizar las mesas. ¡Revísala!',
--   'success',
--   'normal'
-- );

-- Desactivar un anuncio
-- UPDATE system_announcements
-- SET is_active = false
-- WHERE id = 'UUID_DEL_ANUNCIO';

-- ============================================
-- Vista para admin
-- ============================================
CREATE OR REPLACE VIEW admin_announcements AS
SELECT 
  sa.id,
  sa.title,
  sa.message,
  sa.type,
  sa.priority,
  sa.is_active,
  sa.show_until,
  sa.created_at,
  sa.updated_at,
  p.full_name as created_by_name,
  u.email as created_by_email
FROM system_announcements sa
LEFT JOIN profiles p ON sa.created_by = p.id
LEFT JOIN auth.users u ON sa.created_by = u.id
ORDER BY sa.created_at DESC;
