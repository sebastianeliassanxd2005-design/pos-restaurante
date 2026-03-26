import { useState } from 'react'
import { Book, Utensils, Users, DollarSign, Calendar, ShoppingBag, Receipt, Settings, HelpCircle, ChevronDown, ChevronRight } from 'lucide-react'

function Manual() {
  const [expandedSection, setExpandedSection] = useState(null)

  const sections = [
    {
      id: 'introduccion',
      title: 'Introducción',
      icon: Book,
      content: (
        <>
          <p><strong>Bienvenido al Sistema POS para Restaurantes</strong></p>
          <p>Este sistema te permite gestionar de manera eficiente tu restaurante, incluyendo:</p>
          <ul>
            <li>✅ Gestión de mesas y floor plan</li>
            <li>✅ Toma de pedidos</li>
            <li>✅ Reservas con pre-orden</li>
            <li>✅ Control de caja y pagos</li>
            <li>✅ Reportes y estadísticas</li>
            <li>✅ Gestión de usuarios</li>
          </ul>
          <div className="alert alert-info" style={{marginTop: '1rem'}}>
            <strong>💡 Tip:</strong> Puedes acceder a este manual en cualquier momento desde el menú lateral.
          </div>
        </>
      )
    },
    {
      id: 'roles',
      title: 'Roles de Usuario',
      icon: Users,
      content: (
        <>
          <h4>Administrador</h4>
          <ul>
            <li>✅ Acceso completo al sistema</li>
            <li>✅ Gestionar mesas y floor plan</li>
            <li>✅ Ver todos los pedidos</li>
            <li>✅ Acceder a reportes</li>
            <li>✅ Gestionar usuarios</li>
            <li>✅ Configurar el restaurante</li>
          </ul>

          <h4 style={{marginTop: '1rem'}}>Mesero</h4>
          <ul>
            <li>✅ Ver mesas asignadas</li>
            <li>✅ Tomar pedidos</li>
            <li>✅ Gestionar reservas</li>
            <li>✅ Cobrar pedidos</li>
            <li>❌ No puede editar floor plan</li>
            <li>❌ No puede ver reportes completos</li>
          </ul>
        </>
      )
    },
    {
      id: 'mesas',
      title: 'Gestión de Mesas',
      icon: Utensils,
      content: (
        <>
          <h4>Vista Floor Plan</h4>
          <ol>
            <li>Ve a <strong>Mesas</strong> en el menú</li>
            <li>Selecciona la vista <strong>Floor Plan</strong> (ícono de cuadrícula)</li>
            <li>Arrastra las mesas para organizar tu salón</li>
            <li>Los colores indican el estado:
              <ul>
                <li>🟢 <strong>Verde:</strong> Disponible</li>
                <li>🔴 <strong>Rojo:</strong> Ocupada (tiene pedido activo)</li>
                <li>🟠 <strong>Naranja:</strong> Reservada</li>
              </ul>
            </li>
          </ol>

          <h4 style={{marginTop: '1rem'}}>Estados de Mesa</h4>
          <table className="table" style={{fontSize: '0.875rem'}}>
            <thead>
              <tr>
                <th>Estado</th>
                <th>Descripción</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="badge badge-success">Disponible</span></td>
                <td>Lista para recibir clientes</td>
                <td>Click → Ocupar</td>
              </tr>
              <tr>
                <td><span className="badge badge-danger">Ocupada</span></td>
                <td>Con pedido activo</td>
                <td>Click → Ver pedido</td>
              </tr>
              <tr>
                <td><span className="badge badge-warning">Reservada</span></td>
                <td>Con reserva confirmada</td>
                <td>Click → Ver reserva</td>
              </tr>
            </tbody>
          </table>

          <h4 style={{marginTop: '1rem'}}>Crear Zona (Solo Admin)</h4>
          <ol>
            <li>Click en <strong>"Crear Zona"</strong></li>
            <li>Arrastra en el canvas para definir el área</li>
            <li>Click en la zona para editar nombre</li>
            <li>Click en el ícono de paleta para cambiar color</li>
          </ol>

          <div className="alert alert-warning" style={{marginTop: '1rem'}}>
            <strong>⚠️ Nota:</strong> Solo los administradores pueden editar el Floor Plan. Los meseros tienen vista de solo lectura.
          </div>
        </>
      )
    },
    {
      id: 'pedidos',
      title: 'Nuevo Pedido',
      icon: ShoppingBag,
      content: (
        <>
          <h4>Paso 1: Seleccionar Mesa</h4>
          <ol>
            <li>Ve a <strong>Nuevo Pedido</strong></li>
            <li>Selecciona una mesa del grid superior</li>
            <li>La mesa debe estar disponible o reservada</li>
          </ol>

          <h4 style={{marginTop: '1rem'}}>Paso 2: Agregar Productos</h4>
          <ol>
            <li>Busca productos por nombre o categoría</li>
            <li>Click en un producto para agregarlo al carrito</li>
            <li>El carrito aparece en la columna derecha (desktop) o colapsado (móvil)</li>
          </ol>

          <h4 style={{marginTop: '1rem'}}>Paso 3: Enviar a Cocina</h4>
          <ol>
            <li>Revisa los productos en el carrito</li>
            <li>Ajusta cantidades con + / -</li>
            <li>Agrega notas si es necesario (ícono ✏️)</li>
            <li>Click en <strong>"Enviar a Cocina"</strong></li>
          </ol>

          <div className="alert alert-success" style={{marginTop: '1rem'}}>
            <strong>✅ Automático:</strong> Al agregar el primer producto, la mesa se marca como ocupada automáticamente.
          </div>

          <h4 style={{marginTop: '1rem'}}>Editar Pedido Existente</h4>
          <ol>
            <li>Selecciona una mesa ocupada</li>
            <li>Verás el pedido activo</li>
            <li>Click en ✏️ para editar items</li>
            <li>Click en 🗑️ para cancelar el pedido</li>
          </ol>
        </>
      )
    },
    {
      id: 'reservas',
      title: 'Reservas',
      icon: Calendar,
      content: (
        <>
          <h4>Crear Nueva Reserva</h4>
          <ol>
            <li>Ve a <strong>Reservas</strong></li>
            <li>Click en <strong>"Nueva Reserva"</strong></li>
            <li>Completa los datos:
              <ul>
                <li>Nombre del cliente</li>
                <li>Teléfono y email</li>
                <li>Fecha y hora</li>
                <li>Número de personas</li>
                <li>Mesa (opcional)</li>
              </ul>
            </li>
            <li>Activa <strong>"Agregar Pre-orden"</strong> si deseas</li>
            <li>Click en <strong>"Crear Reserva"</strong></li>
          </ol>

          <h4 style={{marginTop: '1rem'}}>Pre-orden de Reservas</h4>
          <ol>
            <li>Activa el switch "Agregar Pre-orden"</li>
            <li>Selecciona productos del menú</li>
            <li>Agrega cantidades y notas</li>
            <li>Los productos se guardarán con la reserva</li>
          </ol>

          <h4 style={{marginTop: '1rem'}}>Alarma de Reserva</h4>
          <ul>
            <li>🔔 Cuando es la hora de la reserva, sonará una alarma</li>
            <li>El modal muestra información del cliente</li>
            <li>Opciones:
              <ul>
                <li><strong>Detener:</strong> Silencia la alarma</li>
                <li><strong>Ir a Pedido:</strong> Abre el POS con la mesa</li>
              </ul>
            </li>
          </ul>

          <div className="alert alert-info" style={{marginTop: '1rem'}}>
            <strong>🕐 Recordatorio:</strong> La alarma suena desde 1 hora antes hasta 2 horas después de la hora de reserva.
          </div>
        </>
      )
    },
    {
      id: 'pedidos-section',
      title: 'Pedidos',
      icon: Receipt,
      content: (
        <>
          <h4>Ver Todos los Pedidos</h4>
          <ol>
            <li>Ve a <strong>Pedidos</strong></li>
            <li>Filtra por estado:
              <ul>
                <li>Todos</li>
                <li>Pendiente</li>
                <li>En Cocina</li>
                <li>Listo</li>
                <li>Servido</li>
                <li>Pagado</li>
                <li>Cancelado</li>
              </ul>
            </li>
          </ol>

          <h4 style={{marginTop: '1rem'}}>Estados del Pedido</h4>
          <table className="table" style={{fontSize: '0.875rem'}}>
            <thead>
              <tr>
                <th>Estado</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="badge" style={{background: '#fef3c7', color: '#92400e'}}>Pendiente</span></td>
                <td>Recién creado, esperando cocina</td>
              </tr>
              <tr>
                <td><span className="badge" style={{background: '#dbeafe', color: '#1e40af'}}>En Cocina</span></td>
                <td>Preparándose</td>
              </tr>
              <tr>
                <td><span className="badge" style={{background: '#dcfce7', color: '#065f46'}}>Listo</span></td>
                <td>Terminado, listo para servir</td>
              </tr>
              <tr>
                <td><span className="badge" style={{background: '#f1f5f9', color: '#475569'}}>Servido</span></td>
                <td>Entregado al cliente</td>
              </tr>
              <tr>
                <td><span className="badge badge-success">Pagado</span></td>
                <td>Cliente pagó</td>
              </tr>
              <tr>
                <td><span className="badge badge-danger">Cancelado</span></td>
                <td>Pedido cancelado</td>
              </tr>
            </tbody>
          </table>

          <h4 style={{marginTop: '1rem'}}>Cambiar Estado</h4>
          <ol>
            <li>Click en las flechas ← → para avanzar/retroceder estado</li>
            <li>Flujo normal: Pendiente → Cocina → Listo → Servido → Pagar</li>
          </ol>

          <h4 style={{marginTop: '1rem'}}>Editar Pedido</h4>
          <ol>
            <li>Solo pedidos en estado "Pendiente" o "En Cocina"</li>
            <li>Click en ✏️ Editar</li>
            <li>Agrega/elimina productos</li>
            <li>Ajusta cantidades</li>
            <li>Click en "Guardar Cambios"</li>
          </ol>
        </>
      )
    },
    {
      id: 'caja',
      title: 'Caja',
      icon: DollarSign,
      content: (
        <>
          <h4>Cobrar Pedido</h4>
          <ol>
            <li>Ve a <strong>Caja</strong></li>
            <li>Busca el pedido en "Listos para Cobrar"</li>
            <li>Click en <strong>"Cobrar"</strong></li>
            <li>Selecciona método de pago:
              <ul>
                <li>💵 Efectivo</li>
                <li>💳 Tarjeta</li>
                <li>🏦 Transferencia</li>
              </ul>
            </li>
            <li>Ingresa monto recibido (efectivo)</li>
            <li>El sistema calcula el cambio automáticamente</li>
            <li>Click en <strong>"Procesar Pago"</strong></li>
          </ol>

          <h4 style={{marginTop: '1rem'}}>Pago Dividido</h4>
          <ol>
            <li>Activa el switch "Pago dividido"</li>
            <li>Ingresa montos por cada método</li>
            <li>La suma debe ser igual al total</li>
            <li>Click en "Procesar Pago"</li>
          </ol>

          <h4 style={{marginTop: '1rem'}}>Imprimir Ticket</h4>
          <ul>
            <li>Después de pagar, el sistema pregunta si quieres imprimir</li>
            <li>O click en el ícono 🖨️ en pedidos pagados</li>
            <li>El ticket incluye:
              <ul>
                <li>Nombre del restaurante</li>
                <li>Número de ticket</li>
                <li>Mesa</li>
                <li>Items detallados</li>
                <li>Total y método de pago</li>
              </ul>
            </li>
          </ul>

          <h4 style={{marginTop: '1rem'}}>Resumen del Día</h4>
          <div className="stats-grid" style={{marginTop: '1rem'}}>
            <div className="stat-card">
              <div className="label">💵 Efectivo</div>
              <div className="value" style={{color: 'var(--success)'}}>$XX.XX</div>
            </div>
            <div className="stat-card">
              <div className="label">💳 Tarjeta</div>
              <div className="value" style={{color: 'var(--info)'}}>$XX.XX</div>
            </div>
            <div className="stat-card">
              <div className="label">🏦 Transferencia</div>
              <div className="value" style={{color: 'var(--warning)'}}>$XX.XX</div>
            </div>
            <div className="stat-card">
              <div className="label">📊 Total</div>
              <div className="value">$XX.XX</div>
            </div>
          </div>
        </>
      )
    },
    {
      id: 'reportes',
      title: 'Reportes',
      icon: HelpCircle,
      content: (
        <>
          <h4>Tipos de Reporte</h4>
          <ol>
            <li><strong>Semana:</strong> Últimos 7 días</li>
            <li><strong>Mes:</strong> Mes actual completo</li>
          </ol>

          <h4 style={{marginTop: '1rem'}}>Información Incluida</h4>
          <ul>
            <li>📈 Ventas totales</li>
            <li>💰 Ventas por método de pago</li>
            <li>🍽️ Productos más vendidos</li>
            <li>📅 Días con más ventas</li>
            <li>👥 Meseros con más ventas</li>
          </ul>

          <h4 style={{marginTop: '1rem'}}>Exportar Reportes</h4>
          <ul>
            <li>📄 <strong>PDF:</strong> Click en "Exportar PDF"</li>
            <li>📊 <strong>Excel:</strong> Click en "Exportar Excel"</li>
          </ul>

          <div className="alert alert-info" style={{marginTop: '1rem'}}>
            <strong>💡 Tip:</strong> Los reportes solo incluyen datos del día actual para evitar sobrecarga de información.
          </div>
        </>
      )
    },
    {
      id: 'configuracion',
      title: 'Configuración',
      icon: Settings,
      content: (
        <>
          <h4>Configuración del Restaurante (Solo Admin)</h4>
          <ol>
            <li>Ve a <strong>Configuración</strong></li>
            <li>Personaliza:
              <ul>
                <li>📝 Nombre del restaurante</li>
                <li>🖼️ Logo (PNG recomendado con transparencia)</li>
                <li>🎨 Color primario (botones, enlaces)</li>
              </ul>
            </li>
            <li>Click en <strong>"Guardar Cambios"</strong></li>
          </ol>

          <h4 style={{marginTop: '1rem'}}>Especificaciones del Logo</h4>
          <ul>
            <li>✅ Formato: PNG o SVG</li>
            <li>✅ Tamaño: 200x200 px mínimo</li>
            <li>✅ Peso: Menos de 2MB</li>
            <li>✅ Fondo: Transparente (recomendado)</li>
          </ul>

          <h4 style={{marginTop: '1rem'}}>Sistema</h4>
          <ul>
            <li>📤 Exportar datos (backup completo)</li>
            <li>📥 Importar datos (restaurar backup)</li>
            <li>🔄 Resetear sistema (elimina todo)</li>
          </ul>

          <div className="alert alert-danger" style={{marginTop: '1rem'}}>
            <strong>⚠️ Peligro:</strong> El reset del sistema elimina TODOS los datos. Esta acción no se puede deshacer.
          </div>
        </>
      )
    }
  ]

  function toggleSection(id) {
    setExpandedSection(expandedSection === id ? null : id)
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2>📖 Manual de Usuario</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Guía completa para usar el sistema POS
          </p>
        </div>
      </div>

      <div className="card">
        <div style={{ marginBottom: '1.5rem' }}>
          <div className="alert alert-info">
            <strong>💡 Navegación:</strong> Click en una sección para expandir/contraer el contenido.
          </div>
        </div>

        {sections.map((section) => {
          const Icon = section.icon
          const isExpanded = expandedSection === section.id

          return (
            <div
              key={section.id}
              style={{
                borderBottom: '1px solid var(--border)',
                paddingBottom: isExpanded ? '1.5rem' : '0',
                marginBottom: isExpanded ? '1.5rem' : '0'
              }}
            >
              <button
                onClick={() => toggleSection(section.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem',
                  background: isExpanded ? 'var(--primary-light)' : 'transparent',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  if (!isExpanded) {
                    e.currentTarget.style.background = 'var(--background)'
                  }
                }}
                onMouseOut={(e) => {
                  if (!isExpanded) {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <Icon size={24} style={{ color: 'var(--primary)' }} />
                <span style={{
                  flex: 1,
                  fontWeight: 600,
                  fontSize: '1rem',
                  color: isExpanded ? 'var(--primary)' : 'var(--text)'
                }}>
                  {section.title}
                </span>
                {isExpanded ? (
                  <ChevronDown size={20} style={{ color: 'var(--text-secondary)' }} />
                ) : (
                  <ChevronRight size={20} style={{ color: 'var(--text-secondary)' }} />
                )}
              </button>

              {isExpanded && (
                <div style={{
                  padding: '1.5rem',
                  paddingLeft: '3.5rem'
                }}>
                  {section.content}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>❓ ¿Necesitas Ayuda Adicional?</h3>
        <ul style={{ color: 'var(--text-secondary)' }}>
          <li>Usa el botón <strong>"Reportar Problema"</strong> en el sidebar para contactar soporte</li>
          <li>Revisa las notificaciones del sistema para actualizaciones</li>
          <li>Consulta con el administrador si tienes dudas sobre permisos</li>
        </ul>
      </div>
    </div>
  )
}

export default Manual
