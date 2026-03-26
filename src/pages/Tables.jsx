import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Minus, Edit, Trash2, Users, Search, Calendar, Clock, ShoppingBag, UserCheck, LayoutGrid, List } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import TableMap from '../components/FloorPlan'

function Tables() {
  const { profile } = useAuth()
  const [tables, setTables] = useState([])
  const [waiters, setWaiters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showReservationModal, setShowReservationModal] = useState(false)
  const [showWaiterModal, setShowWaiterModal] = useState(false)
  const [editingTable, setEditingTable] = useState(null)
  const [selectedTableForWaiter, setSelectedTableForWaiter] = useState(null)
  const [selectedWaiter, setSelectedWaiter] = useState('')
  const [selectedTableForReservation, setSelectedTableForReservation] = useState(null)
  const [filterSection, setFilterSection] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isTablet, setIsTablet] = useState(typeof window !== 'undefined' ? window.innerWidth <= 1280 : false)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false)
  const [viewMode, setViewMode] = useState('floorplan') // 'floorplan' o 'list'
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
  const navigate = useNavigate()

  // Manejar clic en una mesa (ir al POS)
  function handleTableClick(table) {
    console.log('🖱️ Click en mesa desde Floor Plan:', {
      id: table.id,
      name: table.name,
      status: table.status
    })
    
    if (table.status === 'available') {
      // Mesa disponible - preguntar si quiere ocupar
      if (confirm(`¿Desea ocupar la mesa ${table.name} y tomar pedido?`)) {
        const url = `/pos?table=${table.id}`
        console.log('🧭 Navegando a:', url)
        navigate(url)
      } else {
        console.log('❌ Usuario canceló la ocupación de la mesa')
      }
    } else {
      // Mesa ocupada o reservada - ir al POS para ver pedido
      const url = `/pos?table=${table.id}`
      console.log('🧭 Navegando a:', url)
      navigate(url)
    }
  }

  const sections = [
    { id: 'main', name: 'Principal', icon: '🍽️' },
    { id: 'vip', name: 'VIP', icon: '⭐' },
    { id: 'terrace', name: 'Terraza', icon: '🌿' },
    { id: 'bar', name: 'Barra', icon: '🍺' }
  ]

  useEffect(() => {
    fetchTables()
    if (profile?.role === 'admin') {
      fetchWaiters()
    }

    const handleResize = () => {
      const width = window.innerWidth
      setIsMobile(width <= 768)
      setIsTablet(width > 768 && width <= 1280)
    }
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  async function fetchWaiters() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'waiter')
        .order('full_name')

      if (error) throw error
      setWaiters(data || [])
    } catch (error) {
      console.error('Error fetching waiters:', error)
    }
  }

  async function fetchTables() {
    try {
      setError(null)
      setLoading(true)

      // Primero obtener las mesas
      const { data: tablesData, error: tablesError } = await supabase
        .from('tables')
        .select('*')
        .order('name')

      if (tablesError) throw tablesError

      // Luego obtener los perfiles de los meseros asignados
      const waiterIds = tablesData
        .filter(t => t.waiter_id)
        .map(t => t.waiter_id)
      
      let waitersMap = {}
      if (waiterIds.length > 0) {
        const { data: waitersData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', waiterIds)
        
        if (waitersData) {
          waitersMap = Object.fromEntries(waitersData.map(w => [w.id, w.full_name]))
        }
      }

      // Combinar datos
      const data = tablesData.map(table => ({
        ...table,
        waiter_name: waitersMap[table.waiter_id] || null
      }))

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

      // Obtener mesas con órdenes activas (para marcar como occupied)
      const { data: ordenesActivas } = await supabase
        .from('orders')
        .select('table_id')
        .in('status', ['pending', 'cooking', 'ready', 'served'])

      const mesasConOrden = new Set(ordenesActivas?.map(o => o.table_id) || [])

      console.log('📋 Mesas con orden activa:', mesasConOrden.size)

      // Actualizar estado de las mesas
      const tablesConEstado = data.map(table => {
        // Si tiene orden activa, está occupied
        if (mesasConOrden.has(table.id)) {
          return { ...table, status: 'occupied', has_active_order: true }
        }
        // Si tiene reserva y no está occupied, está reserved
        if (mesasReservadas[table.id] && table.status !== 'occupied') {
          return { ...table, status: 'reserved', reservation: mesasReservadas[table.id] }
        }
        return table
      })

      console.log('🪑 Mesas con reserva:', tablesConEstado.filter(t => t.reservation).length)
      console.log('🪑 Mesas ocupadas:', tablesConEstado.filter(t => t.status === 'occupied').length)

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
    console.log('🔄 Actualizando estado de mesa:', { id, status })
    
    // Verificar si la mesa tiene una orden activa antes de liberar
    if (status === 'available') {
      const { data: ordenesActivas } = await supabase
        .from('orders')
        .select('id, status')
        .eq('table_id', id)
        .in('status', ['pending', 'cooking', 'ready', 'served'])
        .limit(1)

      if (ordenesActivas && ordenesActivas.length > 0) {
        console.log('⚠️ La mesa tiene una orden activa:', ordenesActivas[0].id, 'Estado:', ordenesActivas[0].status)
        
        const confirmar = window.confirm(
          '¿Estás seguro de que deseas liberar esta mesa?\n\n' +
          'El pedido activo se CANCELARÁ automáticamente.'
        )
        
        if (!confirmar) {
          console.log('❌ Usuario canceló liberar mesa')
          return
        }
        
        // Cancelar pedido automáticamente
        console.log('❌ Cancelando pedido...')
        const { error: orderError } = await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('id', ordenesActivas[0].id)
        
        if (orderError) {
          console.error('❌ Error al cancelar pedido:', orderError)
          toast.error('Error al cancelar el pedido')
          return
        }
        console.log('❌ Pedido cancelado')
        toast.success('Pedido cancelado - Mesa liberada')
      }
    }
    
    try {
      console.log('💾 Actualizando mesa en BD...', { id, status })
      
      const { error } = await supabase
        .from('tables')
        .update({ status })
        .eq('id', id)
      
      if (error) {
        console.error('❌ Error al actualizar mesa:', error)
        throw error
      }
      
      console.log('✅ Mesa actualizada en BD')
      toast.success('Estado actualizado')
      
      console.log('🔄 Recargando lista de mesas...')
      await fetchTables()
      console.log('✅ Mesas recargadas')

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
      console.error('❌ Error al actualizar estado:', error)
      toast.error('Error: ' + error.message)
    }
  }

  async function assignWaiter(tableId, waiterId) {
    try {
      // Convertir string vacío a null
      const newWaiterId = waiterId === '' ? null : waiterId
      
      const { error } = await supabase
        .from('tables')
        .update({ waiter_id: newWaiterId })
        .eq('id', tableId)

      if (error) throw error

      const table = tables.find(t => t.id === tableId)

      if (newWaiterId) {
        const waiter = waiters.find(w => w.id === newWaiterId)
        toast.success(`Mesa ${table?.name} asignada a ${waiter?.full_name || 'mesero'}`)
      } else {
        toast.success('Mesero desasignado de la mesa ' + (table?.name || ''))
      }

      setShowWaiterModal(false)
      fetchTables()
    } catch (error) {
      toast.error('Error al asignar mesero: ' + error.message)
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
      <div className="page-header" style={{ flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '0.75rem' : '0' }}>
        <div>
          <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem' }}>Gestión de Mesas</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
            {tables.length} mesas | {tables.filter(t => t.status === 'occupied').length} ocupadas
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Botones de vista */}
          <div style={{ display: 'flex', background: 'white', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
            <button
              className={viewMode === 'floorplan' ? 'btn btn-primary' : 'btn btn-outline'}
              onClick={() => setViewMode('floorplan')}
              style={{ borderRadius: 0, border: 'none', padding: isMobile ? '0.5rem' : '0.625rem' }}
              title="Floor Plan"
            >
              <LayoutGrid size={isMobile ? 16 : 18} />
            </button>
            <button
              className={viewMode === 'list' ? 'btn btn-primary' : 'btn btn-outline'}
              onClick={() => setViewMode('list')}
              style={{ borderRadius: 0, border: 'none', padding: isMobile ? '0.5rem' : '0.625rem' }}
              title="Lista"
            >
              <List size={isMobile ? 16 : 18} />
            </button>
          </div>
          {!isMobile && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={20} /> Nueva Mesa
            </button>
          )}
        </div>
      </div>

      {/* Botón móvil para Nueva Mesa */}
      {isMobile && (
        <button
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
          style={{ width: '100%', marginBottom: '1rem', justifyContent: 'center' }}
        >
          <Plus size={18} /> Nueva Mesa
        </button>
      )}

      {/* Floor Plan */}
      {viewMode === 'floorplan' && (
        <div className="card" style={{ padding: 0 }}>
          <TableMap
            tables={tables}
            onTableClick={handleTableClick}
            isAdmin={profile?.role === 'admin'}
          />
        </div>
      )}

      {/* Lista */}
      {viewMode === 'list' && (
        <>
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
            <h3 style={{ margin: isMobile ? '1rem 0 0.75rem' : '1.5rem 0 1rem', fontSize: isMobile ? '1rem' : '1.125rem', color: 'var(--text-secondary)' }}>
              {sections.find(s => s.id === section)?.icon} {sections.find(s => s.id === section)?.name || section}
              <span style={{ marginLeft: '0.5rem', fontSize: isMobile ? '0.75rem' : '0.875rem' }}>({sectionTables.length})</span>
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)',
              gap: isMobile ? '0.75rem' : isTablet ? '1rem' : '1.5rem'
            }}>
              {sectionTables.map((table) => {
                const statusConfig = getStatusConfig(table.status)
                return (
                  <div key={table.id} className="card" style={{ padding: isMobile ? '0.625rem' : isTablet ? '0.875rem' : '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: isMobile ? '0.5rem' : '0.625rem' }}>
                      <h4 style={{ fontSize: isMobile ? '0.8rem' : isTablet ? '0.925rem' : '1rem', margin: 0 }}>{table.name}</h4>
                      <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                        {/* Botón para asignar mesero (solo admin) */}
                        {profile?.role === 'admin' && (
                          <button
                            className="btn btn-outline"
                            style={{ padding: '0.25rem', minWidth: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={() => {
                              setSelectedTableForWaiter(table)
                              setSelectedWaiter(table.waiter_id || '')
                              setShowWaiterModal(true)
                            }}
                            title="Asignar mesero"
                          >
                            <UserCheck size={14} />
                          </button>
                        )}
                        <button className="btn btn-outline" style={{ padding: '0.25rem', minWidth: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => editTable(table)}>
                          <Edit size={14} />
                        </button>
                        <button className="btn btn-danger" style={{ padding: '0.25rem' }} onClick={() => deleteTable(table.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Mostrar mesero asignado */}
                    {table.waiter_id && (
                      <div style={{
                        padding: '0.5rem',
                        background: profile?.role === 'admin' ? '#dbeafe' : '#f1f5f9',
                        borderRadius: '0.375rem',
                        marginBottom: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.75rem'
                      }}>
                        <UserCheck size={14} style={{ color: '#3b82f6' }} />
                        <span style={{ color: '#1e40af', fontWeight: 600 }}>
                          👤 {table.waiter_name || 'Mesero'}
                        </span>
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.375rem' : '0.5rem', marginBottom: isMobile ? '0.5rem' : '0.75rem', color: 'var(--text-secondary)', fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                      <Users size={isMobile ? 14 : 16} /> {table.capacity} {isMobile ? 'p.' : 'personas'}
                    </div>
                    <span className={'badge badge-' + statusConfig.color} style={{ marginBottom: isMobile ? '0.5rem' : '1rem', display: 'inline-block', fontSize: isMobile ? '0.65rem' : '0.75rem', padding: isMobile ? '3px 8px' : '4px 12px' }}>
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
                      <div style={{ display: 'flex', gap: isMobile ? '0.375rem' : '0.5rem', flexDirection: isMobile ? 'column' : 'row' }}>
                        <button className="btn btn-danger" style={{ flex: 1, fontSize: isMobile ? '0.65rem' : '0.75rem', padding: isMobile ? '0.5rem' : '0.625rem' }} onClick={() => updateTableStatus(table.id, 'occupied')}>Ocupar</button>
                        <button className="btn btn-warning" style={{ flex: 1, fontSize: isMobile ? '0.65rem' : '0.75rem', padding: isMobile ? '0.5rem' : '0.625rem' }} onClick={() => openReservationModal(table)}>
                          <Calendar size={isMobile ? 12 : 14} style={{ marginRight: isMobile ? '0' : '0.25rem' }} /> {isMobile ? 'Reservar' : ''}
                        </button>
                      </div>
                    ) : table.status === 'reserved' ? (
                      <div style={{ display: 'flex', gap: isMobile ? '0.375rem' : '0.5rem' }}>
                        {table.reservation && isReservationTime(table.reservation) ? (
                          <a href={`/pos?table=${table.id}`} className="btn btn-primary" style={{ flex: 1, fontSize: isMobile ? '0.65rem' : '0.75rem', padding: isMobile ? '0.5rem' : '0.625rem', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? '0.25rem' : '0.5rem' }}>
                            🛒 {isMobile ? '' : 'Pedido'}
                          </a>
                        ) : (
                          <button className="btn btn-outline" disabled style={{ flex: 1, fontSize: isMobile ? '0.65rem' : '0.75rem', padding: isMobile ? '0.5rem' : '0.625rem' }}>
                            ⏳ {isMobile ? 'Pendiente' : ''}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: isMobile ? '0.375rem' : '0.5rem', flexDirection: isMobile ? 'column' : 'row' }}>
                        <a href={`/pos?table=${table.id}`} className="btn btn-primary" style={{ flex: 1, fontSize: isMobile ? '0.65rem' : '0.75rem', padding: isMobile ? '0.5rem' : '0.625rem', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? '0.25rem' : '0.5rem' }}>
                          🛒 {isMobile ? '' : 'Pedido'}
                        </a>
                        <button className="btn btn-success" style={{ flex: 1, fontSize: isMobile ? '0.65rem' : '0.75rem', padding: isMobile ? '0.5rem' : '0.625rem' }} onClick={() => updateTableStatus(table.id, 'available')}>Liberar</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
      </>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => setPreOrderQuantity(Math.max(preOrderQuantity - 1, 1))}
                            disabled={preOrderQuantity === 1}
                            style={{
                              width: '40px',
                              height: '40px',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: preOrderQuantity === 1 ? 0.5 : 1,
                              cursor: preOrderQuantity === 1 ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <Minus size={18} />
                          </button>
                          <input
                            type="number"
                            className="form-control"
                            value={preOrderQuantity}
                            onChange={(e) => setPreOrderQuantity(parseInt(e.target.value) || 1)}
                            min="1"
                            max="20"
                            style={{ 
                              width: '80px', 
                              textAlign: 'center',
                              fontWeight: 600,
                              fontSize: '1rem'
                            }}
                            readOnly
                          />
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => setPreOrderQuantity(Math.min(preOrderQuantity + 1, 20))}
                            disabled={preOrderQuantity >= 20}
                            style={{
                              width: '40px',
                              height: '40px',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: preOrderQuantity >= 20 ? 0.5 : 1,
                              cursor: preOrderQuantity >= 20 ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <Plus size={18} />
                          </button>
                        </div>
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

      {/* Modal para asignar mesero */}
      {showWaiterModal && selectedTableForWaiter && (
        <div className="modal-overlay" onClick={() => setShowWaiterModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '400px'}}>
            <h3 style={{marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <UserCheck size={20} style={{color: 'var(--primary)'}} />
              Asignar Mesero
            </h3>
            <p style={{fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem'}}>
              {selectedTableForWaiter.name} - {selectedTableForWaiter.status === 'occupied' ? '🔴 Ocupada' : selectedTableForWaiter.status === 'reserved' ? '🔵 Reservada' : '⚪ Disponible'}
            </p>
            
            <div className="form-group">
              <label style={{fontWeight: 600, marginBottom: '0.5rem', display: 'block'}}>
                Seleccionar Mesero:
              </label>
              <select
                className="form-control"
                value={selectedWaiter}
                onChange={(e) => setSelectedWaiter(e.target.value)}
                style={{fontSize: '0.875rem'}}
              >
                <option value="">-- Sin mesero asignado --</option>
                {waiters.map(waiter => (
                  <option key={waiter.id} value={waiter.id}>
                    {waiter.full_name || waiter.email}
                  </option>
                ))}
              </select>
            </div>
            
            {selectedWaiter && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: '#dbeafe',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem'
              }}>
                <UserCheck size={16} style={{color: '#3b82f6'}} />
                <span style={{color: '#1e40af', fontWeight: 600}}>
                  👤 {waiters.find(w => w.id === selectedWaiter)?.full_name || 'Mesero seleccionado'}
                </span>
              </div>
            )}
            
            <div style={{display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem'}}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => setShowWaiterModal(false)}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => assignWaiter(selectedTableForWaiter.id, selectedWaiter)}
                style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}
              >
                <UserCheck size={16} />
                {selectedWaiter ? 'Asignar Mesero' : 'Desasignar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Tables
