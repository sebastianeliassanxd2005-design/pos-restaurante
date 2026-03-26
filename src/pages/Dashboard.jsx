import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { DollarSign, ShoppingBag, Users, TrendingUp, AlertCircle, Clock, ChefHat } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({
    totalVentas: 0,
    ordenesHoy: 0,
    mesasOcupadas: 0,
    mesasTotales: 0,
    ticketPromedio: 0,
    productosMasVendidos: [],
    ordenesPendientes: 0,
    misOrdenes: 0
  })
  const [ordenesRecientes, setOrdenesRecientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const toast = useToast()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      setError(null)
      setLoading(true)
      
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)
      
      // Obtener órdenes pagadas hoy
      const { data: ordenesHoy, error: errorOrdenes } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', hoy.toISOString())
        .eq('status', 'paid')

      if (errorOrdenes) throw errorOrdenes

      const totalVentas = ordenesHoy?.reduce((sum, o) => sum + parseFloat(o.total || 0), 0) || 0
      
      // Obtener mesas
      const { data: mesasData, error: errorMesas } = await supabase
        .from('tables')
        .select('status')
      
      if (errorMesas) throw errorMesas
      
      const mesasOcupadas = mesasData?.filter(m => m.status === 'occupied').length || 0
      const mesasTotales = mesasData?.length || 0

      // Contar órdenes pendientes
      const { data: ordenesPendientes, error: errorPendientes } = await supabase
        .from('orders')
        .select('id')
        .in('status', ['pending', 'cooking'])
      
      if (errorPendientes) throw errorPendientes

      // Productos más vendidos - de todas las órdenes pagadas
      const { data: itemsVentas, error: errorItems } = await supabase
        .from('order_items')
        .select('product_name, quantity')
        .in('status', ['served', 'ready', 'pending', 'cooking'])
        .order('quantity', { ascending: false })
        .limit(5)

      if (errorItems) throw errorItems

      const productosContador = {}
      itemsVentas?.forEach(item => {
        productosContador[item.product_name] = (productosContador[item.product_name] || 0) + item.quantity
      })
      
      const productosMasVendidos = Object.entries(productosContador)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)

      // Órdenes recientes
      const { data: ordenes, error: errorRecientes } = await supabase
        .from('orders')
        .select('*, tables (name)')
        .order('created_at', { ascending: false })
        .limit(5)

      if (errorRecientes) throw errorRecientes

      setStats({
        totalVentas,
        ordenesHoy: ordenesHoy?.length || 0,
        mesasOcupadas,
        mesasTotales,
        ticketPromedio: ordenesHoy?.length ? totalVentas / ordenesHoy.length : 0,
        productosMasVendidos,
        ordenesPendientes: ordenesPendientes?.length || 0
      })
      setOrdenesRecientes(ordenes || [])
    } catch (error) {
      console.error('Error:', error)
      setError(error.message)
      toast.error('Error al cargar datos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const ocupacionPorcentaje = stats.mesasTotales > 0 
    ? Math.round((stats.mesasOcupadas / stats.mesasTotales) * 100) 
    : 0

  function getStatusBadgeClass(status) {
    if (status === 'paid' || status === 'served') return 'badge-success'
    if (status === 'cooking') return 'badge-warning'
    if (status === 'cancelled') return 'badge-danger'
    return 'badge-secondary'
  }

  function getStatusLabel(status) {
    const labels = {
      'pending': 'Pendiente',
      'cooking': 'Cocina',
      'served': 'Servida',
      'paid': 'Pagada',
      'cancelled': 'Cancelada'
    }
    return labels[status] || status
  }

  if (error) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>Error al cargar datos</h3>
          <p style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{error}</p>
          <button className="btn btn-primary" onClick={fetchDashboardData} style={{ marginTop: '1rem' }}>
            Reintentar
          </button>
        </div>
      </div>
    )
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
      <div className="page-header">
        <div>
          <h2>
            {profile?.role === 'admin' && '👤 Dashboard Administrativo'}
            {profile?.role === 'waiter' && '👨‍🍳 Panel de Mesero'}
            {profile?.role === 'kitchen' && '👨‍🍳 Cocina - Órdenes Pendientes'}
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {profile?.full_name && ` | Bienvenido, ${profile.full_name}`}
          </p>
        </div>
      </div>

      {/* Alerta de órdenes pendientes - Solo admin y meseros */}
      {stats.ordenesPendientes > 0 && profile?.role !== 'kitchen' && (
        <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--warning)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <AlertCircle size={24} style={{ color: 'var(--warning)' }} />
            <div>
              <strong>{stats.ordenesPendientes} órdenes pendientes</strong>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                Hay órdenes que requieren atención
              </p>
            </div>
            <a href="/ordenes" className="btn btn-warning" style={{ marginLeft: 'auto' }}>
              Ver
            </a>
          </div>
        </div>
      )}

      {/* Stats - Diferentes por rol */}
      {profile?.role === 'kitchen' ? (
        /* Dashboard para Cocina */
        <div className="stats-grid">
          <div className="stat-card">
            <div className="label">
              <ChefHat size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
              Órdenes en Cocina
            </div>
            <div className="value">{stats.ordenesPendientes}</div>
            <div className="change positive">
              <Clock size={16} /> Pendientes
            </div>
          </div>
        </div>
      ) : (
        /* Dashboard para Admin y Meseros */
        <div className="stats-grid">
          <div className="stat-card">
            <div className="label">
              <DollarSign size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
              Ventas Hoy
            </div>
            <div className="value">${stats.totalVentas.toFixed(2)}</div>
            <div className="change positive">
              <TrendingUp size={16} /> {stats.ordenesHoy} ventas
            </div>
          </div>

          <div className="stat-card">
            <div className="label">
              <ShoppingBag size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
              Órdenes
            </div>
            <div className="value">{stats.ordenesHoy}</div>
            <div className="change">Total hoy</div>
          </div>

          <div className="stat-card">
            <div className="label">
              <Users size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
              Mesas
            </div>
            <div className="value">{stats.mesasOcupadas}/{stats.mesasTotales}</div>
            <div className="change">
              <div style={{ flex: 1, height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: ocupacionPorcentaje + '%', height: '100%', background: 'var(--primary)' }}></div>
              </div>
              <span style={{ marginLeft: '0.5rem' }}>{ocupacionPorcentaje}%</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="label">
              <TrendingUp size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
              Ticket Promedio
            </div>
            <div className="value">${stats.ticketPromedio.toFixed(2)}</div>
            <div className="change">Por orden</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Órdenes Recientes</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Mesa</th>
                  <th>Estado</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {ordenesRecientes.length > 0 ? ordenesRecientes.map((orden) => (
                  <tr key={orden.id}>
                    <td>{orden.tables?.name || 'N/A'}</td>
                    <td>
                      <span className={'badge ' + getStatusBadgeClass(orden.status)}>
                        {getStatusLabel(orden.status)}
                      </span>
                    </td>
                    <td>${parseFloat(orden.total || 0).toFixed(2)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      No hay órdenes recientes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>🏆 Más Vendidos</h3>
          {stats.productosMasVendidos.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {stats.productosMasVendidos.map((prod, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'var(--background)', borderRadius: '0.5rem' }}>
                  <div style={{ 
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : 'var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.75rem', color: idx < 3 ? '#000' : 'var(--text-secondary)'
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{prod.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{prod.quantity} un.</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p style={{ color: 'var(--text-secondary)' }}>Sin datos de ventas</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
