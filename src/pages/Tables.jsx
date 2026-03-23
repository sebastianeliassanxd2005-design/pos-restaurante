import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Edit, Trash2, Users, Search, Calendar, Clock, ShoppingBag } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

function Tables() {
  const { profile } = useAuth()
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showReservationModal, setShowReservationModal] = useState(false)
  const [editingTable, setEditingTable] = useState(null)
  const [selectedTableForReservation, setSelectedTableForReservation] = useState(null)
  const [filterSection, setFilterSection] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({ name: '', capacity: 4, section: 'main', code: '' })
  const [reservationData, setReservationData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    party_size: 2,
    reservation_date: '',
    reservation_time: '19:00',
    notes: ''
  })
  
  // Obtener fecha mínima (hoy) para el input de fecha
  const minDate = new Date().toISOString().split('T')[0]
  
  // Estados para pre-orden
  const [showPreOrder, setShowPreOrder] = useState(false)
  const [preOrderItems, setPreOrderItems] = useState([])
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [preOrderQuantity, setPreOrderQuantity] = useState(1)
  const [preOrderNotes, setPreOrderNotes] = useState('')
  const toast = useToast()

  const sections = [
    { id: 'main', name: 'Principal', icon: '🍽️' },
    { id: 'vip', name: 'VIP', icon: '⭐' },
    { id: 'terrace', name: 'Terraza', icon: '🌿' },
    { id: 'bar', name: 'Barra', icon: '🍺' }
  ]

  useEffect(() => {
    fetchTables()
  }, [])

  async function fetchTables() {
    try {
      setError(null)
      setLoading(true)

      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .order('name')

      if (error) throw error

      // Obtener TODAS las reservas confirmadas/sentadas (sin filtro de fecha)
      // Luego filtramos en el frontend para evitar problemas de zona horaria
      const { data: todasReservas, error: errorReservas } = await supabase
        .from('reservations')
        .select('table_id, reservation_date, reservation_time, status, customer_name')
        .in('status', ['confirmed', 'seated'])
        .order('reservation_time')

      if (errorReservas) {
        console.error('Error loading reservations:', errorReservas)
      }

      console.log('📅 Total reservas encontradas:', todasReservas?.length || 0)

      // Filtrar reservas que son de hoy o futuras (comparando strings YYYY-MM-DD)
      const hoy = new Date().toLocaleDateString('en-CA')
      const reservasFuturas = todasReservas?.filter(reserva => {
        // reservation_date viene como "2026-03-22" desde Supabase
        return reserva.reservation_date >= hoy
      })

      console.log('📅 Reservas de hoy/futuras:', reservasFuturas?.length || 0)
      console.log('📅 Fecha hoy:', hoy)
      console.log('📅 Reservas:', reservasFuturas)

      // Crear un mapa de mesas reservadas
      const mesasReservadas = {}
      reservasFuturas?.forEach(reserva => {
        if (!mesasReservadas[reserva.table_id]) {
          mesasReservadas[reserva.table_id] = reserva
        }
      })

      // Actualizar estado de las mesas
      const tablesConEstado = data.map(table => {
        if (mesasReservadas[table.id] && table.status !== 'occupied') {
          return { ...table, status: 'reserved', reservation: mesasReservadas[table.id] }
        }
        return table
      })

      console.log('🪑 Mesas con reserva:', tablesConEstado.filter(t => t.reservation).length)

      setTables(tablesConEstado || [])
    } catch (error) {
      console.error('Error:', error)
      setError(error.message)
      toast.error('Error al cargar mesas: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    
    try {
      const tableData = {
        ...formData,
        code: formData.code || `T${Date.now().toString().slice(-4)}`
      }
      
      if (editingTable) {
        const { error } = await supabase
          .from('tables')
          .update(tableData)
          .eq('id', editingTable.id)
        if (error) throw error
        toast.success('Mesa actualizada')
      } else {
        const { error } = await supabase
          .from('tables')
          .insert([{ ...tableData, status: 'available' }])
        if (error) throw error
        toast.success('Mesa creada')
      }
      
      setShowModal(false)
      setEditingTable(null)
      setFormData({ name: '', capacity: 4, section: 'main', code: '' })
      fetchTables()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error: ' + error.message)
    }
  }

  async function deleteTable(id) {
    if (!confirm('¿Eliminar esta mesa?')) return
    try {
      const { error } = await supabase.from('tables').delete().eq('id', id)
      if (error) throw error
      toast.success('Mesa eliminada')
      fetchTables()
    } catch (error) {
      toast.error('Error: ' + error.message)
    }
  }

  async function updateTableStatus(id, status) {
    try {
      const { error } = await supabase.from('tables').update({ status }).eq('id', id)
      if (error) throw error
      toast.success('Estado actualizado')
      fetchTables()

      // Si ocupó la mesa, preguntar si quiere crear pedido
      if (status === 'occupied') {
        setTimeout(async () => {
          const table = tables.find(t => t.id === id)
          if (table && confirm('¿Deseas crear un pedido para esta mesa?')) {
            window.location.href = `/pos?table=${id}`
          }
        }, 500)
      }
    } catch (error) {
      toast.error('Error: ' + error.message)
    }
  }

  function openReservationModal(table) {
    setSelectedTableForReservation(table)
    setReservationData({
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      party_size: table.capacity || 2,
      reservation_date: '',  // Sin valor por defecto - usuario debe seleccionar
      reservation_time: '19:00',
      notes: ''
    })
    setShowPreOrder(false)
    setPreOrderItems([])
    fetchProducts()
    setShowReservationModal(true)
  }

  // Cargar productos para pre-orden
  async function fetchProducts() {
    try {
      const { data } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('available', true)
        .order('name')
      setProducts(data || [])
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }

  // Agregar producto a pre-orden
  function addProductToPreOrder() {
    if (!selectedProduct) {
      toast.warning('Selecciona un producto')
      return
    }

    const newItem = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      quantity: preOrderQuantity,
      price: selectedProduct.price,
      subtotal: selectedProduct.price * preOrderQuantity,
      notes: preOrderNotes
    }

    setPreOrderItems(prev => [...prev, newItem])
    setSelectedProduct(null)
    setPreOrderQuantity(1)
    setPreOrderNotes('')
    toast.success('Producto agregado a la pre-orden')
  }

  // Eliminar producto de pre-orden
  function removeProductFromPreOrder(index) {
    setPreOrderItems(prev => prev.filter((_, i) => i !== index))
  }

  // Calcular total de pre-orden
  const preOrderTotal = preOrderItems.reduce((sum, item) => sum + item.subtotal, 0)

  async function createReservation() {
    try {
      // Enviar fecha directamente sin compensación
      const { data: reservationDataResult, error: reservationError } = await supabase
        .from('reservations')
        .insert([{
          table_id: selectedTableForReservation.id,
          customer_name: reservationData.customer_name,
          customer_phone: reservationData.customer_phone,
          customer_email: reservationData.customer_email,
          party_size: reservationData.party_size,
          reservation_date: reservationData.reservation_date,
          reservation_time: reservationData.reservation_time,
          notes: reservationData.notes,
          status: 'confirmed',
          created_by: profile?.id
        }])
        .select()
        .single()

      if (reservationError) throw reservationError

      // CAMBIAR estado de la mesa a "reserved"
      const { error: tableError } = await supabase
        .from('tables')
        .update({ status: 'reserved' })
        .eq('id', selectedTableForReservation.id)

      if (tableError) {
        console.error('Error al actualizar estado de mesa:', tableError)
      }

      // Si hay pre-orden, guardar los items
      if (showPreOrder && preOrderItems.length > 0) {
        const itemsToInsert = preOrderItems.map(item => ({
          reservation_id: reservationDataResult.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
          notes: item.notes
        }))

        const { error: itemsError } = await supabase
          .from('reservation_items')
          .insert(itemsToInsert)

        if (itemsError) throw itemsError
      }

      toast.success('Reserva creada exitosamente')
      setShowReservationModal(false)
      setSelectedTableForReservation(null)
      setPreOrderItems([])
      setShowPreOrder(false)
      fetchTables()
    } catch (error) {
      toast.error('Error al crear reserva: ' + error.message)
    }
  }

  // Verificar si ya es la fecha y hora de la reserva (o pasó)
  function isReservationTime(reservation) {
    const ahora = new Date()
    
    // Formatear hora sin segundos: "14:00:00" → "14:00"
    const horaSinSegundos = String(reservation.reservation_time).substring(0, 5)
    const [hours, minutes] = horaSinSegundos.split(':')
    
    // Crear fecha de la reserva
    const [year, month, day] = String(reservation.reservation_date).split('-')
    const reservaDateTime = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes)
    )

    // Permitir crear pedido DESDE la hora exacta de la reserva hasta 2 horas después
    const unaHoraDespues = new Date(reservaDateTime.getTime() + 2 * 60 * 60 * 1000)

    // El botón se activa cuando la hora actual es >= hora de reserva
    const dentroDelRango = ahora >= reservaDateTime && ahora <= unaHoraDespues
    
    console.log('🕐 Verificando reserva:', {
      cliente: reservation.customer_name,
      horaReserva: horaSinSegundos,
      ahora: ahora.toLocaleTimeString(),
      reservaDateTime: reservaDateTime.toLocaleTimeString(),
      unaHoraDespues: unaHoraDespues.toLocaleTimeString(),
      dentroDelRango: dentroDelRango
    })

    return dentroDelRango
  }

  function editTable(table) {
    setEditingTable(table)
    setFormData({ name: table.name, capacity: table.capacity, section: table.section || 'main', code: table.code || '' })
    setShowModal(true)
  }

  const filteredTables = tables.filter(table => {
    const matchesSection = filterSection === 'all' || table.section === filterSection
    const matchesSearch = table.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSection && matchesSearch
  })

  const tablesBySection = filteredTables.reduce((acc, table) => {
    const section = table.section || 'main'
    if (!acc[section]) acc[section] = []
    acc[section].push(table)
    return acc
  }, {})

  const getStatusConfig = (status) => {
    const configs = {
      'available': { color: 'success', label: 'Disponible' },
      'occupied': { color: 'danger', label: 'Ocupada' },
      'reserved': { color: 'warning', label: 'Reservada' },
      'maintenance': { color: 'secondary', label: 'Mantenimiento' }
    }
    return configs[status] || configs['available']
  }

  if (error) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>Error al cargar mesas</h3>
          <p style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{error}</p>
          <button className="btn btn-primary" onClick={fetchTables} style={{ marginTop: '1rem' }}>Reintentar</button>
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
          <h2>Gestión de Mesas</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {tables.length} mesas | {tables.filter(t => t.status === 'occupied').length} ocupadas
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} /> Nueva Mesa
        </button>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {sections.map(section => (
            <button
              key={section.id}
              className={filterSection === section.id ? 'btn btn-primary' : 'btn btn-outline'}
              onClick={() => setFilterSection(section.id)}
            >
              {section.icon} {section.name}
            </button>
          ))}
          <input
            type="text"
            className="form-control"
            placeholder="Buscar mesa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '200px', marginLeft: 'auto' }}
          />
        </div>
      </div>

      {Object.keys(tablesBySection).length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p>No se encontraron mesas</p>
          </div>
        </div>
      ) : (
        Object.entries(tablesBySection).map(([section, sectionTables]) => (
          <div key={section}>
            <h3 style={{ margin: '1.5rem 0 1rem', fontSize: '1.125rem', color: 'var(--text-secondary)' }}>
              {sections.find(s => s.id === section)?.icon} {sections.find(s => s.id === section)?.name || section}
              <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem' }}>({sectionTables.length})</span>
            </h3>
            <div className="grid grid-4">
              {sectionTables.map((table) => {
                const statusConfig = getStatusConfig(table.status)
                return (
                  <div key={table.id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <h4 style={{ fontSize: '1rem' }}>{table.name}</h4>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn btn-outline" style={{ padding: '0.25rem' }} onClick={() => editTable(table)}>
                          <Edit size={14} />
                        </button>
                        <button className="btn btn-danger" style={{ padding: '0.25rem' }} onClick={() => deleteTable(table.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      <Users size={16} /> {table.capacity} personas
                    </div>
                    <span className={'badge badge-' + statusConfig.color} style={{ marginBottom: '1rem', display: 'inline-block' }}>
                      {statusConfig.label}
                    </span>
                    
                    {/* Mostrar info de la reserva si está reservada */}
                    {table.reservation && (
                      <div style={{
                        padding: '0.75rem',
                        background: 'var(--warning-light)',
                        borderRadius: '0.5rem',
                        marginBottom: '1rem',
                        fontSize: '0.75rem'
                      }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--warning)' }}>
                          📅 Reservada
                        </div>
                        <div>
                          {/* Mostrar fecha sin conversión UTC - usar la fecha directa de la reserva */}
                          {table.reservation.reservation_date} - 
                          <strong> {String(table.reservation.reservation_time).substring(0, 5)}</strong>
                        </div>
                        <div style={{ fontWeight: 500 }}>{table.reservation.customer_name}</div>
                        <div style={{ marginTop: '0.5rem' }}>
                          {isReservationTime(table.reservation) ? (
                            <span style={{ color: 'var(--success)', fontWeight: 600 }}>✅ Lista para pedido</span>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>⏳ Pedido disponible a la hora de reserva</span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {table.status === 'available' ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-danger" style={{ flex: 1, fontSize: '0.75rem' }} onClick={() => updateTableStatus(table.id, 'occupied')}>Ocupar</button>
                        <button className="btn btn-warning" style={{ flex: 1, fontSize: '0.75rem' }} onClick={() => openReservationModal(table)}>
                          <Calendar size={14} style={{ marginRight: '0.25rem' }} /> Reservar
                        </button>
                      </div>
                    ) : table.status === 'reserved' ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {table.reservation && isReservationTime(table.reservation) ? (
                          <a href={`/pos?table=${table.id}`} className="btn btn-primary" style={{ flex: 1, fontSize: '0.75rem', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                            🛒 Pedido
                          </a>
                        ) : (
                          <button className="btn btn-outline" disabled style={{ flex: 1, fontSize: '0.75rem' }}>
                            ⏳ Pendiente
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <a href={`/pos?table=${table.id}`} className="btn btn-primary" style={{ flex: 1, fontSize: '0.75rem', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                          🛒 Pedido
                        </a>
                        <button className="btn btn-success" style={{ flex: 1, fontSize: '0.75rem' }} onClick={() => updateTableStatus(table.id, 'available')}>Liberar</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{editingTable ? 'Editar Mesa' : 'Nueva Mesa'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre</label>
                <input type="text" className="form-control" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Mesa 1" required />
              </div>
              <div className="form-group">
                <label>Código</label>
                <input type="text" className="form-control" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="Ej: T001" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Capacidad</label>
                  <input type="number" className="form-control" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })} min="1" max="20" required />
                </div>
                <div className="form-group">
                  <label>Sección</label>
                  <select className="form-control" value={formData.section} onChange={(e) => setFormData({ ...formData, section: e.target.value })} required>
                    <option value="main">Principal</option>
                    <option value="vip">VIP</option>
                    <option value="terrace">Terraza</option>
                    <option value="bar">Barra</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingTable ? 'Actualizar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Reservas */}
      {showReservationModal && selectedTableForReservation && (
        <div className="modal-overlay" onClick={() => setShowReservationModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>📅 Reservar {selectedTableForReservation.name}</h3>
            <form onSubmit={(e) => { e.preventDefault(); createReservation(); }}>
              <div className="form-group">
                <label>Nombre del Cliente *</label>
                <input
                  type="text"
                  className="form-control"
                  value={reservationData.customer_name}
                  onChange={(e) => setReservationData({ ...reservationData, customer_name: e.target.value })}
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={reservationData.customer_phone}
                    onChange={(e) => setReservationData({ ...reservationData, customer_phone: e.target.value })}
                    placeholder="555-1234"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={reservationData.customer_email}
                    onChange={(e) => setReservationData({ ...reservationData, customer_email: e.target.value })}
                    placeholder="juan@email.com"
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Personas</label>
                  <input
                    type="number"
                    className="form-control"
                    value={reservationData.party_size}
                    onChange={(e) => setReservationData({ ...reservationData, party_size: parseInt(e.target.value) || 0 })}
                    min="1"
                    max="20"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Capacidad Mesa</label>
                  <input
                    type="text"
                    className="form-control"
                    value={`${selectedTableForReservation.capacity} personas`}
                    disabled
                    style={{ background: 'var(--background)' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Fecha *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={reservationData.reservation_date}
                    onChange={(e) => setReservationData({ ...reservationData, reservation_date: e.target.value })}
                    min={minDate}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Hora *</label>
                  <input
                    type="time"
                    className="form-control"
                    value={reservationData.reservation_time}
                    onChange={(e) => setReservationData({ ...reservationData, reservation_time: e.target.value })}
                    min="09:00"
                    max="23:00"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Notas / Ocasión Especial</label>
                <textarea
                  className="form-control"
                  value={reservationData.notes}
                  onChange={(e) => setReservationData({ ...reservationData, notes: e.target.value })}
                  placeholder="Ej: Cumpleaños, Aniversario, Alergias..."
                  rows="3"
                />
              </div>

              {/* Pre-orden */}
              <div style={{ 
                marginTop: '1.5rem', 
                padding: '1rem', 
                background: 'var(--background)', 
                borderRadius: '0.5rem' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0 }}>🛒 Pre-orden de Platos</h4>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={showPreOrder}
                      onChange={(e) => setShowPreOrder(e.target.checked)}
                    />
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Activar pre-orden</span>
                  </label>
                </div>

                {showPreOrder && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Producto</label>
                        <select
                          className="form-control"
                          value={selectedProduct?.id || ''}
                          onChange={(e) => {
                            const prod = products.find(p => p.id === e.target.value)
                            setSelectedProduct(prod || null)
                          }}
                        >
                          <option value="">Seleccionar producto</option>
                          {products.map(prod => (
                            <option key={prod.id} value={prod.id}>
                              {prod.name} - ${parseFloat(prod.price).toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Cantidad</label>
                        <input
                          type="number"
                          className="form-control"
                          value={preOrderQuantity}
                          onChange={(e) => setPreOrderQuantity(parseInt(e.target.value) || 1)}
                          min="1"
                          max="20"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Notas del plato</label>
                      <input
                        type="text"
                        className="form-control"
                        value={preOrderNotes}
                        onChange={(e) => setPreOrderNotes(e.target.value)}
                        placeholder="Sin cebolla, término medio..."
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ width: '100%', marginBottom: '1rem' }}
                      onClick={addProductToPreOrder}
                    >
                      <Plus size={16} style={{ marginRight: '0.5rem' }} /> Agregar a Pre-orden
                    </button>

                    {preOrderItems.length > 0 && (
                      <div style={{ 
                        maxHeight: '150px', 
                        overflowY: 'auto',
                        background: 'var(--surface)',
                        padding: '0.75rem',
                        borderRadius: '0.5rem'
                      }}>
                        {preOrderItems.map((item, index) => (
                          <div
                            key={index}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '0.5rem',
                              borderBottom: '1px solid var(--border)'
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                {item.quantity}x {item.product_name}
                              </div>
                              {item.notes && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  {item.notes}
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                                ${item.subtotal.toFixed(2)}
                              </span>
                              <button
                                type="button"
                                className="btn btn-danger"
                                style={{ padding: '0.25rem' }}
                                onClick={() => removeProductFromPreOrder(index)}
                              >
                                <Minus size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginTop: '0.75rem',
                          paddingTop: '0.75rem',
                          borderTop: '2px solid var(--border)',
                          fontWeight: 700
                        }}>
                          <span>Total Pre-orden:</span>
                          <span style={{ color: 'var(--primary)' }}>${preOrderTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowReservationModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <Calendar size={16} style={{ marginRight: '0.5rem' }} /> Confirmar Reserva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Tables
