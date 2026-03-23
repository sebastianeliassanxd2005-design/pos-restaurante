import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Eye, CheckCircle, XCircle, Clock, ChefHat, Printer, RefreshCw } from 'lucide-react'
import { useToast } from '../context/ToastContext'

function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [orderItems, setOrderItems] = useState([])
  const [filterStatus, setFilterStatus] = useState('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const toast = useToast()

  useEffect(() => {
    fetchOrders()
    if (autoRefresh) {
      const interval = setInterval(fetchOrders, 15000)
      return () => clearInterval(interval)
    }
  }, [filterStatus, autoRefresh])

  async function fetchOrders() {
    try {
      setError(null)
      setLoading(true)
      
      let query = supabase.from('orders').select('*, tables (name)').order('created_at', { ascending: false })
      
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }
      
      const { data, error } = await query
      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Error:', error)
      setError(error.message)
      toast.error('Error al cargar órdenes: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchOrderItems(orderId) {
    try {
      const { data } = await supabase.from('order_items').select('*').eq('order_id', orderId)
      setOrderItems(data || [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  async function updateOrderStatus(orderId, status) {
    try {
      // Obtener la orden actual para saber la mesa
      const { data: orderData } = await supabase
        .from('orders')
        .select('table_id')
        .eq('id', orderId)
        .single()

      const { error } = await supabase.from('orders').update({ status }).eq('id', orderId)
      if (error) throw error

      // Si la orden tiene mesa asociada, actualizar la reserva
      if (orderData?.table_id) {
        const hoy = new Date().toLocaleDateString('en-CA')

        if (status === 'cooking') {
          // Cuando el pedido va a cocina, el cliente ya se sentó
          await supabase
            .from('reservations')
            .update({ status: 'seated' })
            .eq('table_id', orderData.table_id)
            .eq('status', 'confirmed')
            .eq('reservation_date', hoy)
        }
      }

      toast.success('Orden actualizada')
      fetchOrders()
    } catch (error) {
      toast.error('Error: ' + error.message)
    }
  }

  async function completeOrder(order) {
    if (!confirm('¿Confirmar pago?')) return
    try {
      await supabase.from('orders').update({ status: 'paid', payment_method: 'cash' }).eq('id', order.id)

      // Actualizar reserva a completada y liberar mesa
      if (order.table_id) {
        const hoy = new Date().toLocaleDateString('en-CA')

        // Actualizar reserva a completada
        await supabase
          .from('reservations')
          .update({ status: 'completed' })
          .eq('table_id', order.table_id)
          .eq('reservation_date', hoy)

        // Liberar la mesa
        await supabase.from('tables').update({ status: 'available' }).eq('id', order.table_id)
      }

      toast.success('Orden completada - Mesa liberada')
      fetchOrders()
    } catch (error) {
      toast.error('Error: ' + error.message)
    }
  }

  async function viewOrderDetails(order) {
    setSelectedOrder(order)
    await fetchOrderItems(order.id)
  }

  function printTicket(order) {
    const ticketWindow = window.open('', '_blank')
    ticketWindow.document.write(`
      <html><head><title>Ticket #${order.id.slice(0, 8)}</title>
      <style>body{font-family:monospace;padding:20px;} .item{border-bottom:1px dashed #000;padding:5px 0;}</style>
      </head><body>
      <h1>🍽️ POS Restaurante</h1>
      <p><strong>Mesa:</strong> ${order.tables?.name || 'N/A'}</p>
      <p><strong>Orden:</strong> #${order.id.slice(0, 8)}</p>
      <hr/>
      ${orderItems.map(item => `<div class="item">${item.quantity}x ${item.product_name}</div>`).join('')}
      <hr/>
      <h3>Total: $${parseFloat(order.total || 0).toFixed(2)}</h3>
      </body></html>
    `)
    ticketWindow.document.close()
    ticketWindow.print()
  }

  function getStatusBadgeClass(status) {
    if (status === 'paid' || status === 'served') return 'badge-success'
    if (status === 'cooking') return 'badge-warning'
    if (status === 'cancelled') return 'badge-danger'
    return 'badge-secondary'
  }

  function getStatusLabel(status) {
    const labels = { 'pending': 'Pendiente', 'cooking': 'Cocina', 'served': 'Servida', 'paid': 'Pagada', 'cancelled': 'Cancelada' }
    return labels[status] || status
  }

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    cooking: orders.filter(o => o.status === 'cooking').length,
    served: orders.filter(o => o.status === 'served').length
  }

  if (error) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>Error al cargar órdenes</h3>
          <p style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{error}</p>
          <button className="btn btn-primary" onClick={fetchOrders} style={{ marginTop: '1rem' }}>Reintentar</button>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="loading-spinner"><div className="spinner"></div></div>
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2>Gestión de Órdenes</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {stats.pending} pendientes | {stats.cooking} cocina | {stats.served} servidas
          </p>
        </div>
        <button className={autoRefresh ? 'btn btn-success' : 'btn btn-outline'} onClick={() => setAutoRefresh(!autoRefresh)}>
          <RefreshCw size={16} /> Auto
        </button>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'Todas', count: orders.length },
            { id: 'pending', label: 'Pendientes', count: stats.pending },
            { id: 'cooking', label: 'Cocina', count: stats.cooking },
            { id: 'served', label: 'Servidas', count: stats.served },
            { id: 'paid', label: 'Pagadas' }
          ].map(filter => (
            <button
              key={filter.id}
              className={filterStatus === filter.id ? 'btn btn-primary' : 'btn btn-outline'}
              onClick={() => setFilterStatus(filter.id)}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>
      </div>

      {orders.filter(o => ['pending', 'cooking', 'served'].includes(o.status)).filter(o => filterStatus === 'all' || ['pending', 'cooking', 'served'].includes(filterStatus)).length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>📋 Órdenes Activas</h3>
          <div className="grid grid-3">
            {orders
              .filter(o => ['pending', 'cooking', 'served'].includes(o.status))
              .filter(o => filterStatus === 'all' || ['pending', 'cooking', 'served'].includes(filterStatus))
              .map(order => (
                <div key={order.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem' }}>{order.tables?.name || 'N/A'}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>#{order.id.slice(0, 6)}</span>
                    </div>
                    <span className={'badge badge-' + getStatusBadgeClass(order.status)}>{getStatusLabel(order.status)}</span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    <div>Total: <strong>${parseFloat(order.total || 0).toFixed(2)}</strong></div>
                    <div>Hace: {Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000)} min</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => viewOrderDetails(order)}><Eye size={14} /></button>
                    {order.status === 'pending' && (
                      <button className="btn btn-warning btn-sm" onClick={() => updateOrderStatus(order.id, 'cooking')}><ChefHat size={14} /> Cocina</button>
                    )}
                    {order.status === 'cooking' && (
                      <button className="btn btn-info btn-sm" onClick={() => updateOrderStatus(order.id, 'served')}>Servir</button>
                    )}
                    {order.status === 'served' && (
                      <a 
                        href={`/caja?order=${order.id}`} 
                        className="btn btn-success btn-sm"
                        style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        💰 Cobrar
                      </a>
                    )}
                    <button className="btn btn-outline btn-sm" onClick={() => printTicket(order)}><Printer size={14} /></button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <div>
        <h3 style={{ marginBottom: '1rem' }}>📁 Historial</h3>
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Mesa</th>
                  <th>Estado</th>
                  <th>Total</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {orders.filter(o => ['paid', 'cancelled'].includes(o.status)).filter(o => filterStatus === 'all' || ['paid', 'cancelled'].includes(filterStatus)).map(order => (
                  <tr key={order.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>#{order.id.slice(0, 6)}</td>
                    <td>{order.tables?.name || 'N/A'}</td>
                    <td><span className={'badge badge-' + getStatusBadgeClass(order.status)}>{getStatusLabel(order.status)}</span></td>
                    <td style={{ fontWeight: 600 }}>${parseFloat(order.total || 0).toFixed(2)}</td>
                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => viewOrderDetails(order)}><Eye size={14} /></button>
                        <button className="btn btn-outline btn-sm" onClick={() => printTicket(order)}><Printer size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {orders.filter(o => ['paid', 'cancelled'].includes(o.status)).length === 0 && (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Sin órdenes en el historial</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedOrder && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <h3>Detalle de Orden</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <p><strong>ID:</strong> #{selectedOrder.id.slice(0, 8)}</p>
                <p><strong>Mesa:</strong> {selectedOrder.tables?.name || 'N/A'}</p>
              </div>
              <div>
                <p><strong>Estado:</strong> {getStatusLabel(selectedOrder.status)}</p>
                <p><strong>Fecha:</strong> {new Date(selectedOrder.created_at).toLocaleString()}</p>
              </div>
            </div>
            <h4 style={{ marginBottom: '0.75rem' }}>Items</h4>
            <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '1rem' }}>
              {orderItems.length > 0 ? orderItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--background)', borderRadius: '0.5rem', marginBottom: '0.5rem' }}>
                  <span><strong>{item.quantity}x</strong> {item.product_name}</span>
                  <span>${(item.quantity * item.price).toFixed(2)}</span>
                </div>
              )) : <p style={{ color: 'var(--text-secondary)' }}>Cargando...</p>}
            </div>
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 700 }}>
              <span>Total:</span>
              <span style={{ color: 'var(--primary)' }}>${parseFloat(selectedOrder.total || 0).toFixed(2)}</span>
            </div>
            <button className="btn btn-outline" style={{ marginTop: '1rem', width: '100%' }} onClick={() => setSelectedOrder(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Orders
