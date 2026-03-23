import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CreditCard, Wallet, TrendingUp, Printer, DollarSign, Banknote, Coins } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { useSearchParams } from 'react-router-dom'

function Caja() {
  const [searchParams] = useSearchParams()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterStatus, setFilterStatus] = useState('served')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [orderItems, setOrderItems] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountReceived, setAmountReceived] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [splitPayment, setSplitPayment] = useState(false)
  const [splitAmounts, setSplitAmounts] = useState({ cash: '', card: '', transfer: '' })
  const [dailyTotal, setDailyTotal] = useState({ cash: 0, card: 0, transfer: 0, total: 0 })
  const toast = useToast()

  useEffect(() => {
    fetchOrders()
    fetchDailyTotal()
    
    // Si viene de Órdenes con un order ID, abrir modal de pago
    const orderId = searchParams.get('order')
    if (orderId) {
      fetchOrderToPay(orderId)
    }
  }, [filterStatus, searchParams])

  async function fetchOrderToPay(orderId) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, tables (name)')
        .eq('id', orderId)
        .single()
      
      if (error) throw error
      if (data && data.status === 'served') {
        setTimeout(() => openPaymentModal(data), 500)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  async function fetchOrders() {
    try {
      setError(null)
      setLoading(true)
      
      let query = supabase.from('orders').select('*, tables (name)').order('created_at', { ascending: false })
      
      if (filterStatus === 'served') {
        query = query.eq('status', 'served')
      } else if (filterStatus === 'paid') {
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)
        query = query.gte('created_at', hoy.toISOString()).eq('status', 'paid')
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

  async function fetchDailyTotal() {
    try {
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)
      
      const { data } = await supabase
        .from('orders')
        .select('total, payment_method')
        .gte('created_at', hoy.toISOString())
        .eq('status', 'paid')
      
      const totals = { cash: 0, card: 0, transfer: 0, total: 0 }
      data?.forEach(order => {
        const total = parseFloat(order.total || 0)
        totals.total += total
        if (order.payment_method === 'cash') totals.cash += total
        else if (order.payment_method === 'card') totals.card += total
        else if (order.payment_method === 'transfer') totals.transfer += total
      })
      
      setDailyTotal(totals)
    } catch (error) {
      console.error('Error fetching daily total:', error)
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

  function openPaymentModal(order) {
    setSelectedOrder(order)
    setAmountReceived('')
    setPaymentMethod('cash')
    setSplitPayment(false)
    setSplitAmounts({ cash: '', card: '', transfer: '' })
    setShowPaymentModal(true)
  }

  async function processPayment() {
    if (!selectedOrder) return

    // Validar pago en efectivo
    if (paymentMethod === 'cash' && !splitPayment) {
      const received = parseFloat(amountReceived) || 0
      if (received < selectedOrder.total) {
        toast.warning('El monto recibido es menor al total')
        return
      }
    }

    // Validar pago dividido
    if (splitPayment) {
      const cash = parseFloat(splitAmounts.cash) || 0
      const card = parseFloat(splitAmounts.card) || 0
      const transfer = parseFloat(splitAmounts.transfer) || 0
      const total = cash + card + transfer

      if (Math.abs(total - selectedOrder.total) > 0.01) {
        toast.warning('La suma debe ser igual al total')
        return
      }
    }

    try {
      let paymentMethodFinal = splitPayment ? 'split' : paymentMethod

      const { error } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          payment_method: paymentMethodFinal,
          paid_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id)

      if (error) throw error

      // Si la orden tiene una mesa asociada, actualizar la reserva y liberar la mesa
      if (selectedOrder.table_id) {
        // Actualizar reserva a completada (si existe una reserva para hoy)
        const hoy = new Date().toLocaleDateString('en-CA')
        const { error: reservaError } = await supabase
          .from('reservations')
          .update({ status: 'completed' })
          .eq('table_id', selectedOrder.table_id)
          .eq('status', 'confirmed')
          .eq('reservation_date', hoy)

        if (reservaError) {
          console.error('Error al actualizar reserva:', reservaError)
        }

        // Liberar la mesa
        const { error: tableError } = await supabase
          .from('tables')
          .update({ status: 'available' })
          .eq('id', selectedOrder.table_id)

        if (tableError) {
          console.error('Error al liberar mesa:', tableError)
        }
      }

      toast.success('Pago procesado correctamente - Mesa liberada')
      setShowPaymentModal(false)
      setSelectedOrder(null)
      fetchOrders()
      fetchDailyTotal()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al procesar pago: ' + error.message)
    }
  }

  function printReceipt(order) {
    const ticketWindow = window.open('', '_blank')
    ticketWindow.document.write(`
      <html><head><title>Recibo #${order.id.slice(0, 8)}</title>
      <style>body{font-family:monospace;padding:20px;} h1,h2{color:#000;}</style></head>
      <body><h1>🍽️ POS Restaurante</h1><hr/>
      <p><strong>Recibo:</strong> #${order.id.slice(0, 8)}</p>
      <p><strong>Mesa:</strong> ${order.tables?.name || 'N/A'}</p>
      <p><strong>Total:</strong> $${parseFloat(order.total || 0).toFixed(2)}</p>
      <p><strong>Método:</strong> ${order.payment_method || 'Efectivo'}</p>
      <hr/><p>¡Gracias!</p></body></html>
    `)
    ticketWindow.document.close()
    ticketWindow.print()
  }

  async function viewOrderDetails(order) {
    try {
      const { data } = await supabase.from('order_items').select('*').eq('order_id', order.id)
      setOrderItems(data || [])
      const itemsList = data?.map(i => `  - ${i.quantity}x ${i.product_name}`).join('\n') || 'Sin items'
      alert(`Orden #${order.id.slice(0, 8)}\nMesa: ${order.tables?.name}\nTotal: $${order.total}\n\nItems:\n${itemsList}`)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const change = selectedOrder && amountReceived 
    ? parseFloat(amountReceived) - parseFloat(selectedOrder.total) 
    : 0

  function getPaymentMethodBadge(method) {
    const badges = { cash: 'success', card: 'info', transfer: 'warning', split: 'secondary' }
    return badges[method] || 'secondary'
  }

  function getPaymentMethodLabel(method) {
    const labels = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', split: 'Dividido' }
    return labels[method] || method
  }

  if (error) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>Error al cargar datos</h3>
          <p style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => { fetchOrders(); fetchDailyTotal() }} style={{ marginTop: '1rem' }}>Reintentar</button>
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
          <h2>💰 Caja / Cobros</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Gestiona los cobros y métodos de pago</p>
        </div>
      </div>

      {/* Resumen del día */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="label">
            <Banknote size={16} style={{ display: 'inline', marginRight: '0.25rem' }} /> Efectivo
          </div>
          <div className="value" style={{ color: 'var(--success)' }}>${dailyTotal.cash.toFixed(2)}</div>
        </div>

        <div className="stat-card">
          <div className="label">
            <CreditCard size={16} style={{ display: 'inline', marginRight: '0.25rem' }} /> Tarjeta
          </div>
          <div className="value" style={{ color: 'var(--info)' }}>${dailyTotal.card.toFixed(2)}</div>
        </div>

        <div className="stat-card">
          <div className="label">
            <Wallet size={16} style={{ display: 'inline', marginRight: '0.25rem' }} /> Transferencia
          </div>
          <div className="value" style={{ color: 'var(--warning)' }}>${dailyTotal.transfer.toFixed(2)}</div>
        </div>

        <div className="stat-card">
          <div className="label">
            <TrendingUp size={16} style={{ display: 'inline', marginRight: '0.25rem' }} /> Total del Día
          </div>
          <div className="value">${dailyTotal.total.toFixed(2)}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className={filterStatus === 'served' ? 'btn btn-primary' : 'btn btn-outline'} onClick={() => setFilterStatus('served')}>
            Por Cobrar ({orders.filter(o => o.status === 'served').length})
          </button>
          <button className={filterStatus === 'paid' ? 'btn btn-primary' : 'btn btn-outline'} onClick={() => setFilterStatus('paid')}>
            Pagadas Hoy
          </button>
        </div>
      </div>

      {/* Órdenes por cobrar */}
      {filterStatus === 'served' && (
        <div>
          <h3 style={{ marginBottom: '1rem' }}>📋 Órdenes por Cobrar</h3>
          {orders.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">✅</div>
                <h3>No hay órdenes por cobrar</h3>
              </div>
            </div>
          ) : (
            <div className="grid grid-3">
              {orders.map(order => (
                <div key={order.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem' }}>{order.tables?.name || 'N/A'}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>#{order.id.slice(0, 6)}</span>
                    </div>
                    <span className="badge badge-info">Por Cobrar</span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span>Total:</span>
                      <strong style={{ color: 'var(--primary)', fontSize: '1.125rem' }}>${parseFloat(order.total || 0).toFixed(2)}</strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => viewOrderDetails(order)}>Ver</button>
                    <button className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={() => openPaymentModal(order)}>💰 Cobrar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Historial de pagos */}
      {filterStatus === 'paid' && (
        <div>
          <h3 style={{ marginBottom: '1rem' }}>💵 Historial de Pagos</h3>
          <div className="card">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Mesa</th>
                    <th>Método</th>
                    <th>Total</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>#{order.id.slice(0, 6)}</td>
                      <td>{order.tables?.name || 'N/A'}</td>
                      <td>
                        <span className={'badge badge-' + getPaymentMethodBadge(order.payment_method)}>
                          {getPaymentMethodLabel(order.payment_method)}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>${parseFloat(order.total || 0).toFixed(2)}</td>
                      <td>{new Date(order.paid_at || order.created_at).toLocaleString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button className="btn btn-outline btn-sm" onClick={() => viewOrderDetails(order)}>Ver</button>
                          <button className="btn btn-outline btn-sm" onClick={() => printReceipt(order)}>
                            <Printer size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No hay pagos registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal de pago */}
      {showPaymentModal && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '550px' }}>
            <h3>💰 Procesar Pago</h3>
            
            <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Mesa</p>
                  <p style={{ fontWeight: 600 }}>{selectedOrder.tables?.name || 'N/A'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Orden</p>
                  <p style={{ fontWeight: 600, fontFamily: 'monospace' }}>#{selectedOrder.id.slice(0, 8)}</p>
                </div>
              </div>
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>Total:</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>${parseFloat(selectedOrder.total || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Método de pago */}
            <div className="form-group">
              <label>Método de Pago</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <button className={paymentMethod === 'cash' && !splitPayment ? 'btn btn-success' : 'btn btn-outline'} onClick={() => { setPaymentMethod('cash'); setSplitPayment(false); }}>
                  <DollarSign size={18} /><div style={{ fontSize: '0.75rem' }}>Efectivo</div>
                </button>
                <button className={paymentMethod === 'card' && !splitPayment ? 'btn btn-info' : 'btn btn-outline'} onClick={() => { setPaymentMethod('card'); setSplitPayment(false); }}>
                  <CreditCard size={18} /><div style={{ fontSize: '0.75rem' }}>Tarjeta</div>
                </button>
                <button className={paymentMethod === 'transfer' && !splitPayment ? 'btn btn-warning' : 'btn btn-outline'} onClick={() => { setPaymentMethod('transfer'); setSplitPayment(false); }}>
                  <Coins size={18} /><div style={{ fontSize: '0.75rem' }}>Transferencia</div>
                </button>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input type="checkbox" checked={splitPayment} onChange={(e) => setSplitPayment(e.target.checked)} />
                Pago dividido
              </label>
            </div>

            {/* Pago dividido */}
            {splitPayment && (
              <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>Dividir en:</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem' }}>Efectivo</label>
                    <input type="number" className="form-control" value={splitAmounts.cash} onChange={(e) => setSplitAmounts({ ...splitAmounts, cash: e.target.value })} placeholder="0.00" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem' }}>Tarjeta</label>
                    <input type="number" className="form-control" value={splitAmounts.card} onChange={(e) => setSplitAmounts({ ...splitAmounts, card: e.target.value })} placeholder="0.00" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem' }}>Transferencia</label>
                    <input type="number" className="form-control" value={splitAmounts.transfer} onChange={(e) => setSplitAmounts({ ...splitAmounts, transfer: e.target.value })} placeholder="0.00" />
                  </div>
                </div>
                <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', textAlign: 'right' }}>
                  Suma: <strong>${(parseFloat(splitAmounts.cash || 0) + parseFloat(splitAmounts.card || 0) + parseFloat(splitAmounts.transfer || 0)).toFixed(2)}</strong>
                </p>
              </div>
            )}

            {/* Monto recibido - Efectivo */}
            {!splitPayment && paymentMethod === 'cash' && (
              <div>
                <div className="form-group">
                  <label>💵 Monto Recibido</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={amountReceived} 
                    onChange={(e) => setAmountReceived(e.target.value)} 
                    placeholder="0.00" 
                    style={{ fontSize: '1.25rem', fontWeight: 600 }} 
                    autoFocus
                  />
                </div>
                
                {/* Botones de monto rápido */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  {[
                    selectedOrder.total,
                    Math.ceil(selectedOrder.total),
                    Math.ceil(selectedOrder.total / 100) * 100
                  ].map((monto, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setAmountReceived(monto.toString())}
                      style={{ fontSize: '0.75rem' }}
                    >
                      ${monto.toFixed(2)}
                    </button>
                  ))}
                </div>

                {/* Cálculo del cambio */}
                {amountReceived && (
                  <div style={{ 
                    padding: '1rem', 
                    borderRadius: '0.5rem', 
                    background: change >= 0 ? 'var(--success-light)' : 'var(--danger-light)',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Cambio:</span>
                      <span style={{ 
                        fontSize: '1.5rem', 
                        fontWeight: 700, 
                        color: change >= 0 ? 'var(--success)' : 'var(--danger)' 
                      }}>
                        ${change >= 0 ? change.toFixed(2) : '-' + Math.abs(change).toFixed(2)}
                      </span>
                    </div>
                    {change < 0 && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.5rem', margin: 0 }}>
                        ⚠️ Faltan ${Math.abs(change).toFixed(2)} para completar el pago
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Botones */}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowPaymentModal(false)}>Cancelar</button>
              <button 
                type="button" 
                className="btn btn-success" 
                onClick={processPayment}
                disabled={paymentMethod === 'cash' && !splitPayment && change < 0}
              >
                ✅ Confirmar Pago
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Caja
