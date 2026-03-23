import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Clock, Bell, CheckCircle, AlertCircle, TrendingUp, 
  Utensils, ShoppingBag, DollarSign, Calendar, ChefHat,
  Users, Phone, MessageCircle, X
} from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

function MiTurno() {
  const { profile } = useAuth()
  const toast = useToast()
  
  const [stats, setStats] = useState({
    mesasAsignadas: 0,
    pedidosActivos: 0,
    pedidosPendientes: 0,
    pedidosListos: 0,
    totalVentasTurno: 0,
    reservasHoy: 0
  })
  
  const [misMesas, setMisMesas] = useState([])
  const [misPedidos, setMisPedidos] = useState([])
  const [notificaciones, setNotificaciones] = useState([])
  const [reservasHoy, setReservasHoy] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMiTurnoData()
    
    // Polling para actualizaciones en tiempo real
    const interval = setInterval(fetchMiTurnoData, 30000) // Cada 30 segundos
    return () => clearInterval(interval)
  }, [])

  async function fetchMiTurnoData() {
    try {
      setLoading(true)
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)
      const hoyFin = new Date()
      hoyFin.setHours(23, 59, 59, 999)

      // 1. Obtener mesas ocupadas (asignadas al mesero indirectamente por órdenes activas)
      const { data: mesasData } = await supabase
        .from('tables')
        .select('*')
        .eq('status', 'occupied')
        .order('name')

      setMisMesas(mesasData || [])

      // 2. Obtener pedidos activos del día (pendientes, en cocina, listos)
      const { data: pedidosData } = await supabase
        .from('orders')
        .select('*, tables (name)')
        .gte('created_at', hoy.toISOString())
        .lte('created_at', hoyFin.toISOString())
        .in('status', ['pending', 'cooking', 'ready', 'served'])
        .order('created_at', { ascending: false })

      setMisPedidos(pedidosData || [])

      // 3. Obtener reservas de hoy
      const { data: reservasData } = await supabase
        .from('reservations')
        .select('*')
        .gte('date', hoy.toISOString())
        .lte('date', hoyFin.toISOString())
        .order('time')

      setReservasHoy(reservasData || [])

      // 4. Calcular estadísticas
      const pedidosPendientes = pedidosData?.filter(p => p.status === 'pending').length || 0
      const pedidosListos = pedidosData?.filter(p => p.status === 'ready').length || 0
      const totalVentas = pedidosData
        ?.filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + parseFloat(p.total || 0), 0) || 0

      setStats({
        mesasAsignadas: mesasData?.length || 0,
        pedidosActivos: pedidosData?.length || 0,
        pedidosPendientes,
        pedidosListos,
        totalVentasTurno: totalVentas,
        reservasHoy: reservasData?.length || 0
      })

      // 5. Generar notificaciones
      generarNotificaciones(pedidosData || [], reservasData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Error al cargar datos del turno')
    } finally {
      setLoading(false)
    }
  }

  function generarNotificaciones(pedidos, reservas) {
    const notifs = []

    // Notificar pedidos listos
    const listos = pedidos.filter(p => p.status === 'ready')
    listos.forEach(pedido => {
      notifs.push({
        id: `ready-${pedido.id}`,
        type: 'success',
        title: '¡Pedido Listo!',
        message: `Mesa ${pedido.tables?.name || 'N/A'} - Orden #${pedido.id}`,
        icon: CheckCircle,
        color: '#22c55e'
      })
    })

    // Notificar pedidos pendientes por mucho tiempo
    const ahora = new Date()
    const pendientes = pedidos.filter(p => {
      const creado = new Date(pedido.created_at)
      const diffMin = (ahora - creado) / 60000
      return p.status === 'pending' && diffMin > 5
    })
    pendientes.forEach(pedido => {
      notifs.push({
        id: `pending-${pedido.id}`,
        type: 'warning',
        title: 'Pedido Pendiente',
        message: `Mesa ${pedido.tables?.name || 'N/A'} - Más de 5 min`,
        icon: AlertCircle,
        color: '#f59e0b'
      })
    })

    // Notificar reservas próximas (en menos de 1 hora)
    const ahoraHora = ahora.getHours() * 60 + ahora.getMinutes()
    reservas.forEach(reserva => {
      const [hora, min] = reserva.time.split(':').map(Number)
      const reservaMin = hora * 60 + min
      const diffMin = reservaMin - ahoraHora
      if (diffMin > 0 && diffMin <= 60) {
        notifs.push({
          id: `reservation-${reserva.id}`,
          type: 'info',
          title: 'Reserva Próxima',
          message: `${reserva.guest_name} - ${reserva.guests} personas en ${diffMin} min`,
          icon: Calendar,
          color: '#3b82f6'
        })
      }
    })

    setNotificaciones(notifs)
  }

  function getStatusBadgeClass(status) {
    const classes = {
      'pending': 'badge-warning',
      'cooking': 'badge-info',
      'ready': 'badge-success',
      'served': 'badge-secondary',
      'paid': 'badge-success'
    }
    return classes[status] || 'badge-secondary'
  }

  function getStatusLabel(status) {
    const labels = {
      'pending': 'Pendiente',
      'cooking': 'En Cocina',
      'ready': '✓ Listo',
      'served': 'Servido',
      'paid': 'Pagado'
    }
    return labels[status] || status
  }

  async function marcarLlegada(reserva) {
    try {
      // Buscar o crear mesa para la reserva
      const { data: mesaExistente } = await supabase
        .from('tables')
        .select('id')
        .eq('name', `Reserva ${reserva.guest_name}`)
        .single()

      if (mesaExistente) {
        await supabase
          .from('tables')
          .update({ status: 'occupied' })
          .eq('id', mesaExistente.id)
      }

      await supabase
        .from('reservations')
        .update({ status: 'arrived' })
        .eq('id', reserva.id)

      toast.success(`✓ ${reserva.guest_name} ha llegado - Mesa asignada`)
      fetchMiTurnoData()
    } catch (error) {
      toast.error('Error al marcar llegada')
    }
  }

  async function enviarRecordatorioWhatsApp(reserva) {
    const mensaje = `Hola ${reserva.guest_name}, te recordamos tu reserva para ${reserva.guests} personas hoy a las ${reserva.time}. ¡Te esperamos!`
    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`
    window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
            <Clock size={24} style={{color:'var(--primary)'}} />
            Mi Turno
          </h2>
          <p style={{color:'var(--text-secondary)',fontSize:'0.875rem'}}>
            {new Date().toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
            {profile?.full_name && ` | ${profile.full_name}`}
          </p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={fetchMiTurnoData}
          style={{display:'flex',alignItems:'center',gap:'0.5rem'}}
        >
          <TrendingUp size={18} />
          Actualizar
        </button>
      </div>

      {/* Notificaciones - Solo si hay */}
      {notificaciones.length > 0 && (
        <div style={{marginBottom:'1.5rem'}}>
          {notificaciones.slice(0, 3).map((notif, idx) => {
            const Icon = notif.icon
            return (
              <div 
                key={notif.id} 
                style={{
                  display:'flex',
                  alignItems:'center',
                  gap:'1rem',
                  padding:'1rem 1.25rem',
                  marginBottom: idx < notificaciones.length - 1 ? '0.75rem' : '0',
                  background: `${notif.color}15`,
                  border: `1px solid ${notif.color}30`,
                  borderLeft: `4px solid ${notif.color}`,
                  borderRadius: '8px'
                }}
              >
                <Icon size={22} style={{color:notif.color}} />
                <div style={{flex:1}}>
                  <strong style={{color:notif.color}}>{notif.title}</strong>
                  <div style={{fontSize:'0.875rem',color:'var(--text-secondary)'}}>{notif.message}</div>
                </div>
                <button 
                  onClick={() => setNotificaciones(prev => prev.filter(n => n.id !== notif.id))}
                  style={{background:'none',border:'none',color:'var(--text-secondary)',cursor:'pointer'}}
                >
                  <X size={18} />
                </button>
              </div>
            )
          })}
          {notificaciones.length > 3 && (
            <div style={{textAlign:'center',padding:'0.5rem',color:'var(--text-secondary)',fontSize:'0.75rem'}}>
              +{notificaciones.length - 3} notificaciones más
            </div>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid" style={{gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:'1rem',marginBottom:'1.5rem'}}>
        {/* Mesas Ocupadas */}
        <div className="stat-card" style={{padding:'1rem',borderLeft:'4px solid #dc2626'}}>
          <div className="label" style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
            <Utensils size={16} style={{color:'#dc2626'}} />
            Mesas
          </div>
          <div className="value" style={{fontSize:'1.75rem'}}>{stats.mesasAsignadas}</div>
          <div className="change" style={{fontSize:'0.7rem',paddingTop:'0.5rem'}}>
            Ocupadas ahora
          </div>
        </div>

        {/* Pedidos Activos */}
        <div className="stat-card" style={{padding:'1rem',borderLeft:'4px solid #3b82f6'}}>
          <div className="label" style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
            <ShoppingBag size={16} style={{color:'#3b82f6'}} />
            Pedidos
          </div>
          <div className="value" style={{fontSize:'1.75rem'}}>{stats.pedidosActivos}</div>
          <div className="change" style={{fontSize:'0.7rem',paddingTop:'0.5rem'}}>
            Activos hoy
          </div>
        </div>

        {/* Pedidos Listos */}
        <div className="stat-card" style={{padding:'1rem',borderLeft:'4px solid #22c55e'}}>
          <div className="label" style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
            <CheckCircle size={16} style={{color:'#22c55e'}} />
            Listos
          </div>
          <div className="value" style={{fontSize:'1.75rem'}}>{stats.pedidosListos}</div>
          <div className="change" style={{fontSize:'0.7rem',paddingTop:'0.5rem',color:'#22c55e'}}>
            Para servir
          </div>
        </div>

        {/* Ventas Turno */}
        <div className="stat-card" style={{padding:'1rem',borderLeft:'4px solid #f59e0b'}}>
          <div className="label" style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
            <DollarSign size={16} style={{color:'#f59e0b'}} />
            Ventas
          </div>
          <div className="value" style={{fontSize:'1.75rem'}}>${stats.totalVentasTurno.toFixed(0)}</div>
          <div className="change" style={{fontSize:'0.7rem',paddingTop:'0.5rem'}}>
            En tu turno
          </div>
        </div>
      </div>

      {/* Contenido Principal - 2 Columnas */}
      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(auto-fit, minmax(350px, 1fr))',
        gap:'1.5rem'
      }}>
        {/* Pedidos Activos */}
        <div className="card">
          <h3 style={{fontSize:'1.0625rem',marginBottom:'1rem',display:'flex',alignItems:'center',gap:'0.5rem'}}>
            <ChefHat size={20} style={{color:'var(--primary)'}} />
            Pedidos Activos
          </h3>
          {misPedidos.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{fontSize:'0.7rem'}}>Mesa</th>
                    <th style={{fontSize:'0.7rem'}}>Estado</th>
                    <th style={{fontSize:'0.7rem'}}>Total</th>
                    <th style={{fontSize:'0.7rem'}}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {misPedidos.map((pedido) => (
                    <tr key={pedido.id}>
                      <td style={{fontWeight:500}}>{pedido.tables?.name || 'N/A'}</td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(pedido.status)}`} style={{fontSize:'0.65rem'}}>
                          {getStatusLabel(pedido.status)}
                        </span>
                      </td>
                      <td style={{fontWeight:600}}>${parseFloat(pedido.total || 0).toFixed(2)}</td>
                      <td>
                        {pedido.status === 'ready' && (
                          <button 
                            className="btn btn-success btn-sm"
                            style={{padding:'0.25rem 0.5rem',fontSize:'0.7rem'}}
                            onClick={() => {
                              supabase.from('orders').update({status:'served'}).eq('id',pedido.id)
                              toast.success('Pedido marcado como servido')
                              fetchMiTurnoData()
                            }}
                          >
                            Servir
                          </button>
                        )}
                        {pedido.status === 'pending' && (
                          <button 
                            className="btn btn-warning btn-sm"
                            style={{padding:'0.25rem 0.5rem',fontSize:'0.7rem'}}
                            onClick={() => {
                              supabase.from('orders').update({status:'cooking'}).eq('id',pedido.id)
                              toast.info('Pedido enviado a cocina')
                              fetchMiTurnoData()
                            }}
                          >
                            Cocina
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{padding:'2rem 1rem'}}>
              <ShoppingBag size={40} style={{opacity:0.3,marginBottom:'0.5rem'}} />
              <p style={{color:'var(--text-secondary)'}}>No hay pedidos activos</p>
            </div>
          )}
        </div>

        {/* Reservas de Hoy */}
        <div className="card">
          <h3 style={{fontSize:'1.0625rem',marginBottom:'1rem',display:'flex',alignItems:'center',gap:'0.5rem'}}>
            <Calendar size={20} style={{color:'#3b82f6'}} />
            Reservas Hoy
          </h3>
          {reservasHoy.length > 0 ? (
            <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
              {reservasHoy.map((reserva) => (
                <div 
                  key={reserva.id}
                  style={{
                    display:'flex',
                    alignItems:'center',
                    gap:'1rem',
                    padding:'1rem',
                    background:'var(--background)',
                    borderRadius:'8px',
                    border: reserva.status === 'arrived' ? '2px solid #22c55e' : '1px solid var(--border)'
                  }}
                >
                  <div style={{
                    width:40,
                    height:40,
                    borderRadius:'50%',
                    background: reserva.status === 'arrived' ? '#dcfce7' : 
                               reserva.status === 'confirmed' ? '#dbeafe' : '#fef3c7',
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                    fontWeight:700,
                    color: reserva.status === 'arrived' ? '#166534' : 
                           reserva.status === 'confirmed' ? '#1e40af' : '#92400e'
                  }}>
                    {reserva.time.split(':')[0]}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:'0.875rem'}}>{reserva.guest_name}</div>
                    <div style={{fontSize:'0.75rem',color:'var(--text-secondary)'}}>
                      {reserva.guests} personas • {reserva.time} hrs
                    </div>
                    {reserva.notes && (
                      <div style={{fontSize:'0.7rem',color:'var(--text-secondary)',marginTop:'0.25rem'}}>
                        📝 {reserva.notes}
                      </div>
                    )}
                  </div>
                  {reserva.status !== 'arrived' && (
                    <div style={{display:'flex',gap:'0.5rem'}}>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{padding:'0.375rem',minWidth:'36px'}}
                        onClick={() => enviarRecordatorioWhatsApp(reserva)}
                        title="Enviar recordatorio"
                      >
                        <MessageCircle size={16} />
                      </button>
                      <button
                        className="btn btn-success btn-sm"
                        style={{padding:'0.375rem 0.75rem',fontSize:'0.75rem'}}
                        onClick={() => marcarLlegada(reserva)}
                      >
                        ✓ Llegó
                      </button>
                    </div>
                  )}
                  {reserva.status === 'arrived' && (
                    <span className="badge badge-success" style={{fontSize:'0.65rem'}}>
                      En mesa
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{padding:'2rem 1rem'}}>
              <Calendar size={40} style={{opacity:0.3,marginBottom:'0.5rem'}} />
              <p style={{color:'var(--text-secondary)'}}>No hay reservas hoy</p>
            </div>
          )}
        </div>
      </div>

      {/* Mesas Ocupadas - Full Width */}
      {misMesas.length > 0 && (
        <div className="card" style={{marginTop:'1.5rem'}}>
          <h3 style={{fontSize:'1.0625rem',marginBottom:'1rem',display:'flex',alignItems:'center',gap:'0.5rem'}}>
            <Utensils size={20} style={{color:'#dc2626'}} />
            Mesas Ocupadas
          </h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))',gap:'0.75rem'}}>
            {misMesas.map((mesa) => (
              <div
                key={mesa.id}
                style={{
                  display:'flex',
                  flexDirection:'column',
                  alignItems:'center',
                  padding:'1rem',
                  background:'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                  borderRadius:'8px',
                  border:'2px solid #dc2626'
                }}
              >
                <div style={{
                  width:36,
                  height:36,
                  borderRadius:'50%',
                  background:'#dc2626',
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'center',
                  color:'white',
                  fontWeight:700,
                  fontSize:'0.875rem',
                  marginBottom:'0.5rem'
                }}>
                  {mesa.name.replace('Mesa ','')}
                </div>
                <span className="badge badge-danger" style={{fontSize:'0.65rem'}}>Ocupada</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default MiTurno
