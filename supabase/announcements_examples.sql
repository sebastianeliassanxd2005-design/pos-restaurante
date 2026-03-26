-- ============================================
-- Anuncios del Sistema - Ejemplos Predefinidos
-- ============================================
-- Ejecuta esto en: https://supabase.com/dashboard/project/bhampokwjyjticzzejvs/sql
-- 
-- NOTA: Asegúrate de haber ejecutado primero el archivo
-- system_announcements.sql para crear la tabla
-- ============================================

-- ============================================
-- 1. Mantenimiento del Sistema
-- ============================================
INSERT INTO system_announcements (title, message, type, priority, show_until)
VALUES (
  '⚠️ Mantenimiento Programado',
  'Estimado usuario, el sistema estará fuera de servicio en un plazo máximo de 24 horas. Se estará notificando cuando el sistema esté en funcionamiento estable.',
  'maintenance',
  'high',
  NOW() + INTERVAL '48 hours'
);

-- ============================================
-- 2. Nueva Funcionalidad - Floor Plan
-- ============================================
INSERT INTO system_announcements (title, message, type, priority, show_until)
VALUES (
  '✅ Nueva Funcionalidad: Floor Plan',
  'Se ha agregado la opción de Floor Plan para organizar visualmente las mesas. Puedes arrastrar, mover y personalizar la disposición de tu restaurante.',
  'success',
  'normal',
  NOW() + INTERVAL '7 days'
);

-- ============================================
-- 3. Actualización de Seguridad
-- ============================================
INSERT INTO system_announcements (title, message, type, priority, show_until)
VALUES (
  '🔒 Actualización de Seguridad',
  'Se ha mejorado el sistema de autenticación. Si experimentas problemas, cierra sesión y vuelve a iniciar. Tu seguridad es nuestra prioridad.',
  'warning',
  'high',
  NOW() + INTERVAL '5 days'
);

-- ============================================
-- 4. Reportes PDF y Excel
-- ============================================
INSERT INTO system_announcements (title, message, type, priority, show_until)
VALUES (
  '📊 Reportes Mejorados',
  'Ahora puedes generar reportes de ventas en PDF y Excel. Visita la sección de Reportes para explorar todas las opciones disponibles.',
  'info',
  'normal',
  NOW() + INTERVAL '10 days'
);

-- ============================================
-- 5. Problema Conocido - Impresión
-- ============================================
INSERT INTO system_announcements (title, message, type, priority, show_until)
VALUES (
  '❌ Problema Conocido: Impresión',
  'Estamos trabajando en solucionar un problema intermitente con la impresión de facturas. El resto de funciones están operativas. Disculpa las molestias.',
  'error',
  'urgent',
  NOW() + INTERVAL '24 hours'
);

-- ============================================
-- 6. Recordatorio de Reservas
-- ============================================
INSERT INTO system_announcements (title, message, type, priority, show_until)
VALUES (
  '🔔 Nuevo Sistema de Alarmas',
  'El sistema ahora te notificará automáticamente cuando sea la hora de una reserva. Asegúrate de tener el volumen activado para escuchar las alarmas.',
  'info',
  'normal',
  NOW() + INTERVAL '7 days'
);

-- ============================================
-- 7. Soporte Técnico
-- ============================================
INSERT INTO system_announcements (title, message, type, priority, show_until)
VALUES (
  '💬 Soporte Técnico Disponible',
  'Ahora puedes reportar problemas directamente desde el sistema. Haz clic en "Reportar Problema" en el menú lateral para enviar tu solicitud.',
  'success',
  'normal',
  NOW() + INTERVAL '14 days'
);

-- ============================================
-- 8. Actualización de Base de Datos
-- ============================================
INSERT INTO system_announcements (title, message, type, priority, show_until)
VALUES (
  '🔄 Actualización de Base de Datos',
  'Se realizará una actualización de la base de datos esta noche. Puede haber lentitud intermitente entre 2:00 AM y 4:00 AM.',
  'warning',
  'high',
  NOW() + INTERVAL '3 days'
);

-- ============================================
-- 9. Bienvenida a Nuevos Usuarios
-- ============================================
INSERT INTO system_announcements (title, message, type, priority, show_until)
VALUES (
  '👋 ¡Bienvenido al Sistema!',
  'Gracias por usar nuestro POS. Explora todas las funciones: Mesas, Pedidos, Reservas, Caja y Reportes. ¡Estamos aquí para ayudarte!',
  'info',
  'low',
  NOW() + INTERVAL '30 days'
);

-- ============================================
-- 10. Cierre por Inventario
-- ============================================
INSERT INTO system_announcements (title, message, type, priority, show_until)
VALUES (
  '📋 Cierre por Inventario',
  'El sistema se cerrará temporalmente para realizar inventario mensual. Por favor, guarda todos tus cambios antes de la hora indicada.',
  'maintenance',
  'high',
  NOW() + INTERVAL '2 days'
);

-- ============================================
-- Utilidades para Administrar Anuncios
-- ============================================

-- Ver todos los anuncios activos ordenados por prioridad
SELECT 
  id,
  title,
  message,
  type,
  priority,
  is_active,
  created_at,
  show_until
FROM system_announcements
WHERE is_active = true
ORDER BY 
  CASE priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'normal' THEN 3
    WHEN 'low' THEN 4
  END,
  created_at DESC;

-- Ver estadísticas de anuncios
SELECT 
  type,
  COUNT(*) as cantidad,
  COUNT(*) FILTER (WHERE is_active = true) as activos
FROM system_announcements
GROUP BY type
ORDER BY cantidad DESC;

-- Desactivar un anuncio específico (cambia el UUID)
-- UPDATE system_announcements
-- SET is_active = false
-- WHERE id = 'AQUI_PONES_EL_ID_DEL_ANUNCIO';

-- Desactivar todos los anuncios expirados
-- UPDATE system_announcements
-- SET is_active = false
-- WHERE show_until IS NOT NULL AND show_until < NOW();

-- Eliminar anuncios antiguos (más de 30 días)
-- DELETE FROM system_announcements
-- WHERE created_at < NOW() - INTERVAL '30 days' AND is_active = false;

-- ============================================
-- Plantilla para Crear Nuevos Anuncios
-- ============================================
-- Copia y pega esto, cambiando los valores:

-- INSERT INTO system_announcements (title, message, type, priority, show_until)
-- VALUES (
--   '📢 TÍTULO DEL ANUNCIO',
--   'Escribe aquí el mensaje completo que verán los usuarios...',
--   'info',              -- Tipos: info, warning, error, success, maintenance
--   'normal',            -- Prioridades: urgent, high, normal, low
--   NOW() + INTERVAL '7 days'  -- Cuándo expira (opcional)
-- );
