-- ============================================
-- Vista de Administración para Reportes
-- ============================================
-- Esta vista permite a los admins ver todos los reportes de forma ordenada

-- Crear vista de reportes para admin
CREATE OR REPLACE VIEW admin_support_reports AS
SELECT 
  sr.id,
  sr.user_id,
  sr.user_email,
  sr.report_type,
  sr.urgency,
  sr.description,
  sr.status,
  sr.admin_response,
  sr.responded_at,
  rp.full_name as responded_by_name,
  sr.created_at,
  sr.updated_at,
  u.email as user_email_full,
  p.full_name as user_name,
  p.role as user_role
FROM support_reports sr
LEFT JOIN profiles p ON sr.user_id = p.id
LEFT JOIN auth.users u ON sr.user_id = u.id
LEFT JOIN profiles rp ON sr.responded_by = rp.id
ORDER BY 
  CASE sr.urgency
    WHEN 'high' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 3
    ELSE 4
  END,
  sr.created_at DESC;

-- Comentar para no dar permisos directos a la vista
-- GRANT SELECT ON admin_support_reports TO authenticated;

-- ============================================
-- Función para obtener reporte por ID
-- ============================================
CREATE OR REPLACE FUNCTION get_support_report_by_id(report_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_email TEXT,
  report_type TEXT,
  urgency TEXT,
  description TEXT,
  status TEXT,
  admin_response TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  responded_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  user_name TEXT,
  user_role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.id,
    sr.user_id,
    sr.user_email,
    sr.report_type,
    sr.urgency,
    sr.description,
    sr.status,
    sr.admin_response,
    sr.responded_at,
    rp.full_name as responded_by_name,
    sr.created_at,
    sr.updated_at,
    p.full_name as user_name,
    p.role as user_role
  FROM support_reports sr
  LEFT JOIN profiles p ON sr.user_id = p.id
  LEFT JOIN profiles rp ON sr.responded_by = rp.id
  WHERE sr.id = report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Función para responder a un reporte
-- ============================================
CREATE OR REPLACE FUNCTION respond_to_support_report(
  p_report_id UUID,
  p_response TEXT,
  p_status TEXT DEFAULT 'resolved'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Obtener ID del admin actual
  SELECT id INTO v_admin_id
  FROM profiles
  WHERE id = auth.uid() AND role = 'admin';
  
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Solo los administradores pueden responder reportes';
  END IF;
  
  -- Actualizar el reporte
  UPDATE support_reports
  SET 
    admin_response = p_response,
    status = p_status,
    responded_at = NOW(),
    responded_by = v_admin_id,
    updated_at = NOW()
  WHERE id = p_report_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Ejemplos de uso
-- ============================================

-- 1. Ver todos los reportes (admin)
-- SELECT * FROM admin_support_reports;

-- 2. Ver solo reportes pendientes
-- SELECT * FROM admin_support_reports WHERE status = 'pending';

-- 3. Ver solo reportes de alta urgencia
-- SELECT * FROM admin_support_reports WHERE urgency = 'high';

-- 4. Responder a un reporte
-- SELECT respond_to_support_report(
--   'UUID_DEL_REPORTE',
--   'Gracias por reportar. Hemos solucionado el problema.',
--   'resolved'
-- );

-- 5. Obtener estadísticas
-- SELECT * FROM get_support_reports_stats();

-- ============================================
-- Notificaciones (opcional)
-- ============================================
-- Si quieres recibir notificaciones cuando hay nuevos reportes,
-- puedes configurar un webhook en Supabase:
-- https://supabase.com/docs/guides/database/webhooks

-- Ejemplo de trigger para notificar nuevos reportes de alta urgencia:
CREATE OR REPLACE FUNCTION notify_high_urgency_report()
RETURNS TRIGGER AS $$
BEGIN
  -- Aquí podrías integrar con un servicio de notificaciones
  -- Por ahora solo registramos en consola
  RAISE NOTICE 'Nuevo reporte de alta urgencia: %', NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER high_urgency_report_notification
  AFTER INSERT ON support_reports
  FOR EACH ROW
  WHEN (NEW.urgency = 'high')
  EXECUTE FUNCTION notify_high_urgency_report();
