import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Calendar, Clock, Users, Phone, Mail, CheckCircle, XCircle, Search, Filter, Edit, Plus, Minus, ShoppingBag, Bell } from 'lucide-react'

function Reservas() {
  const [reservas, setReservas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDate, setFilterDate] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingReservation, setEditingReservation] = useState(null)
  const [editData, setEditData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    party_size: 2,
    reservation_date: '',
    reservation_time: '',
    notes: ''
  })
  
  // Estados para nueva reserva
  const [showNewReservationModal, setShowNewReservationModal] = useState(false)
  const [newReservationData, setNewReservationData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    party_size: 2,
    reservation_date: '',
    reservation_time: '19:00',
    notes: '',
    table_id: ''
  })

  // Obtener fecha mínima (hoy) para el input de fecha - usando fecha local explícita
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0') // getMonth() es 0-indexado
  const day = String(today.getDate()).padStart(2, '0')
  const minDate = `${year}-${month}-${day}` // Formato YYYY-MM-DD explícito

  // Estados para pre-orden
  const [showPreOrder, setShowPreOrder] = useState(false)
  const [preOrderItems, setPreOrderItems] = useState([])
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [preOrderQuantity, setPreOrderQuantity] = useState(1)
  const [preOrderNotes, setPreOrderNotes] = useState('')
  const [tables, setTables] = useState([])

  // Estados para alarma de reservas
  const [showAlarmModal, setShowAlarmModal] = useState(false)
  const [currentAlarmReservation, setCurrentAlarmReservation] = useState(null)
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const alarmIntervalRef = useRef(null)

  const { profile } = useAuth()
  const toast = useToast()

  // Limpiar alarmas atendidas (al cargar la página)
  function clearHandledAlarms() {
    const now = new Date()
    const hoy = now.toLocaleDateString('en-CA')
    const keysToRemove = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('alarm_handled_')) {
        // Extraer fecha de la clave
        const parts = key.split('_')
        if (parts.length >= 4) {
          const fecha = parts[2] // YYYY-MM-DD
          if (fecha < hoy) {
            keysToRemove.push(key)
          }
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }

  useEffect(() => {
    fetchReservas()
    fetchTables()
    clearHandledAlarms() // Limpiar alarmas antiguas al cargar
  }, [filterStatus, filterDate])

  // Verificar alarmas de reservas cada minuto
  useEffect(() => {
    checkAlarmReservations()

    const interval = setInterval(() => {
      checkAlarmReservations()
    }, 60000) // Cada minuto

    return () => clearInterval(interval)
  }, [])

  // Verificar reservas que son exactamente ahora para activar alarma
  async function checkAlarmReservations() {
    try {
      const ahora = new Date()
      const hoy = ahora.toLocaleDateString('en-CA')

      // Obtener reservas de hoy confirmadas o sentadas
      const { data: reservasHoy, error } = await supabase
        .from('reservations')
        .select(`
          *,
          tables (name)
        `)
        .eq('reservation_date', hoy)
        .in('status', ['confirmed', 'seated'])
        .order('reservation_time')

      if (error) {
        console.error('Error al obtener reservas:', error)
        return
      }

      if (!reservasHoy || reservasHoy.length === 0) {
        return
      }

      // Filtrar reservas que son EXACTAMENTE ahora (entre -1 y 1 minuto)
      const ahoraMismo = reservasHoy.filter(reserva => {
        const [year, month, day] = String(reserva.reservation_date).split('-')
        const timeString = String(reserva.reservation_time).substring(0, 5)
        const [hours, minutes] = timeString.split(':')

        const reservaDateTime = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hours),
          parseInt(minutes)
        )

        const diffMs = reservaDateTime - ahora
        const diffMinutes = Math.floor(diffMs / 60000)

        return diffMinutes >= -1 && diffMinutes <= 1
      })

      // Activar alarma para reservas que son ahora
      if (ahoraMismo.length > 0) {
        ahoraMismo.forEach(reserva => {
          triggerAlarm(reserva)
        })
      }
    } catch (error) {
      console.error('Error checking alarm reservations:', error)
    }
  }

  // Sonido de alarma (más elaborado y agradable) - se repite continuamente
  function playAlarmSound() {
    stopAlarmSound() // Detener cualquier alarma previa

    // Reproducir inmediatamente
    _playAlarmTone()

    // Repetir cada 2 segundos
    alarmIntervalRef.current = setInterval(() => {
      _playAlarmTone()
    }, 2000)

    setIsPlaying(true)
  }
  
  // Tono individual de alarma
  function _playAlarmTone() {
    if (audioRef.current) {
      audioRef.current.play().catch(err => {
        console.error('Error al reproducir alarma:', err)
      })
    } else {
      // Fallback: usar Audio API con melodía más elaborada
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      
      // Crear melodía agradable (arpegio ascendente)
      const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 659.25] // C-E-G-C-G-E
      const duration = 0.2
      
      notes.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.frequency.value = freq
        oscillator.type = 'sine'
        
        const startTime = audioContext.currentTime + (index * duration)
        gainNode.gain.setValueAtTime(0.3, startTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration)
        
        oscillator.start(startTime)
        oscillator.stop(startTime + duration)
      })
    }
  }

  // Detener alarma
  function stopAlarmSound() {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current)
      alarmIntervalRef.current = null
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsPlaying(false)
  }

  // Activar alarma para reserva específica
  function triggerAlarm(reserva) {
    // Verificar si la alarma ya fue atendida (está en localStorage)
    const alarmKey = `alarm_handled_${reserva.id}_${reserva.reservation_date}_${String(reserva.reservation_time).substring(0, 5)}`
    const alreadyHandled = localStorage.getItem(alarmKey)
    
    if (alreadyHandled === 'true') {
      console.log('✅ Alarma ya atendida para:', reserva.customer_name)
      return
    }

    setCurrentAlarmReservation(reserva)
    setShowAlarmModal(true)
    playAlarmSound()

    // Mostrar toast de alarma
    toast.warning(`🔔 Alarma: Reserva de ${reserva.customer_name} a las ${String(reserva.reservation_time).substring(0, 5)}`)
  }

  // Marcar alarma como atendida
  function markAlarmAsHandled(reserva) {
    const alarmKey = `alarm_handled_${reserva.id}_${reserva.reservation_date}_${String(reserva.reservation_time).substring(0, 5)}`
    localStorage.setItem(alarmKey, 'true')
  }

  // Cargar mesas disponibles
  async function fetchTables() {
    try {
      const { data } = await supabase
        .from('tables')
        .select('*')
        .in('status', ['available', 'occupied', 'reserved'])
        .order('name')
      setTables(data || [])
    } catch (error) {
      console.error('Error loading tables:', error)
    }
  }

  // Cargar productos para pre-orden
  async function fetchProducts() {
    try {
      console.log('🛒 Cargando productos para pre-orden...')
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('available', true)
        .order('name')
      
      if (error) {
        console.error('❌ Error al cargar productos:', error)
      } else {
        console.log('✅ Productos cargados:', data?.length || 0)
      }
      
      setProducts(data || [])
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }

  // Abrir modal de nueva reserva
  function openNewReservationModal() {
    setShowNewReservationModal(true)
    setShowPreOrder(false)
    setPreOrderItems([])
    setNewReservationData({
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      party_size: 2,
      reservation_date: new Date().toISOString().split('T')[0],
      reservation_time: '19:00',
      notes: '',
      table_id: ''
    })
    fetchProducts()
  }

  // Crear nueva reserva con pre-orden opcional
  async function createNewReservation() {
    try {
      if (!newReservationData.customer_name || !newReservationData.table_id) {
        toast.warning('Nombre y mesa son requeridos')
        return
      }

      // Enviar fecha directamente sin compensación
      const { data: reservationData, error: reservationError } = await supabase
        .from('reservations')
        .insert([{
          customer_name: newReservationData.customer_name,
          customer_phone: newReservationData.customer_phone,
          customer_email: newReservationData.customer_email,
          party_size: newReservationData.party_size,
          reservation_date: newReservationData.reservation_date,
          reservation_time: newReservationData.reservation_time,
          notes: newReservationData.notes,
          table_id: newReservationData.table_id,
          status: 'confirmed',
          created_by: profile?.id
        }])
        .select()
        .single()

      if (reservationError) throw reservationError

      // Si hay pre-orden, guardar los items
      if (showPreOrder && preOrderItems.length > 0) {
        const itemsToInsert = preOrderItems.map(item => ({
          reservation_id: reservationData.id,
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
      setShowNewReservationModal(false)
      setPreOrderItems([])
      setShowPreOrder(false)
      fetchReservas()
    } catch (error) {
      toast.error('Error al crear reserva: ' + error.message)
    }
  }

  // Agregar producto a pre-orden
  function addProductToPreOrder() {
    console.log('📝 Agregar producto a pre-orden:', { 
      selectedProduct, 
      productsLoaded: products.length > 0 
    })
    
    if (!selectedProduct) {
      toast.warning('Selecciona un producto')
      return
    }
    
    if (!selectedProduct.id || !selectedProduct.name || !selectedProduct.price) {
      console.error('❌ Producto inválido:', selectedProduct)
      toast.error('Producto inválido. Intenta nuevamente.')
      return
    }

    const newItem = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      quantity: preOrderQuantity,
      price: selectedProduct.price,
      subtotal: selectedProduct.price * preOrderQuantity,
      notes: preOrderNotes || ''
    }

    console.log('✅ Agregando item:', newItem)
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

  async function fetchReservas() {
    try {
      setLoading(true)

      let query = supabase
        .from('reservations')
        .select(`
          *,
          tables (name)
        `)
        .order('reservation_date', { ascending: false })
        .order('reservation_time', { ascending: true })

      // Filtro por estado
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      // Filtro por fecha
      const hoy = new Date().toISOString().split('T')[0]
      
      if (filterDate === 'today') {
        query = query.eq('reservation_date', hoy)
      } else if (filterDate === 'tomorrow') {
        const manana = new Date()
        manana.setDate(manana.getDate() + 1)
        const fechaManana = manana.toISOString().split('T')[0]
        query = query.eq('reservation_date', fechaManana)
      } else if (filterDate === 'week') {
        const proxSemana = new Date()
        proxSemana.setDate(proxSemana.getDate() + 7)
        const fechaFin = proxSemana.toISOString().split('T')[0]
        query = query.gte('reservation_date', hoy).lte('reservation_date', fechaFin)
      }

      const { data, error } = await query
      
      if (error) throw error
      
      setReservas(data || [])
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar reservas: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id, status) {
    try {
      const { data: reservaActual } = await supabase
        .from('reservations')
        .select('table_id')
        .eq('id', id)
        .single()
      
      const { error } = await supabase
        .from('reservations')
        .update({ status })
        .eq('id', id)
      
      if (error) throw error
      
      if (status === 'cancelled' && reservaActual?.table_id) {
        await supabase
          .from('tables')
          .update({ status: 'available' })
          .eq('id', reservaActual.table_id)
        toast.success('Reserva cancelada - Mesa liberada')
      } else if (status === 'completed' && reservaActual?.table_id) {
        if (confirm('¿Desea liberar la mesa ahora?')) {
          await supabase
            .from('tables')
            .update({ status: 'available' })
            .eq('id', reservaActual.table_id)
          toast.success('Reserva completada - Mesa liberada')
        } else {
          toast.success('Reserva completada')
        }
      } else {
        toast.success(`Reserva ${status === 'confirmed' ? 'confirmada' : status === 'cancelled' ? 'cancelada' : 'completada'}`)
      }
      
      fetchReservas()
    } catch (error) {
      toast.error('Error: ' + error.message)
    }
  }

  async function deleteReservation(id) {
    if (!confirm('¿Estás seguro de eliminar esta reserva?')) return
    try {
      const { error } = await supabase.from('reservations').delete().eq('id', id)
      if (error) throw error
      toast.success('Reserva eliminada')
      fetchReservas()
    } catch (error) {
      toast.error('Error: ' + error.message)
    }
  }

  function openEditModal(reserva) {
    setEditingReservation(reserva)
    setEditData({
      customer_name: reserva.customer_name || '',
      customer_phone: reserva.customer_phone || '',
      customer_email: reserva.customer_email || '',
      party_size: reserva.party_size || 2,
      reservation_date: reserva.reservation_date || '',
      // Formatear hora: quitar segundos, dejar solo HH:MM
      reservation_time: reserva.reservation_time 
        ? String(reserva.reservation_time).substring(0, 5) 
        : '19:00',
      notes: reserva.notes || ''
    })
    setShowEditModal(true)
    // Cargar items de pre-orden si existen
    if (reserva.has_preorder) {
      loadPreOrderItems(reserva.id)
    }
  }

  async function loadPreOrderItems(reservationId) {
    try {
      const { data } = await supabase
        .from('reservation_items')
        .select('*')
        .eq('reservation_id', reservationId)
      setPreOrderItems(data || [])
    } catch (error) {
      console.error('Error loading pre-order items:', error)
    }
  }

  async function saveEdit() {
    try {
      // Actualizar datos de la reserva (sin ajustar fecha - el trigger solo ajusta al INSERT)
      const { error } = await supabase
        .from('reservations')
        .update({
          customer_name: editData.customer_name,
          customer_phone: editData.customer_phone,
          customer_email: editData.customer_email,
          party_size: editData.party_size,
          reservation_date: editData.reservation_date,
          reservation_time: editData.reservation_time,
          notes: editData.notes
        })
        .eq('id', editingReservation.id)

      if (error) throw error

      // Si hay pre-orden, guardar los items
      if (showPreOrder && preOrderItems.length > 0) {
        // Eliminar items existentes
        await supabase
          .from('reservation_items')
          .delete()
          .eq('reservation_id', editingReservation.id)

        // Insertar nuevos items
        const itemsToInsert = preOrderItems.map(item => ({
          reservation_id: editingReservation.id,
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

      toast.success('Reserva actualizada')
      setShowEditModal(false)
      setEditingReservation(null)
      setPreOrderItems([])
      setShowPreOrder(false)
      fetchReservas()
    } catch (error) {
      toast.error('Error al actualizar: ' + error.message)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      'confirmed': 'badge-success',
      'seated': 'badge-info',
      'cancelled': 'badge-danger',
      'completed': 'badge-secondary',
      'no_show': 'badge-warning'
    }
    return badges[status] || 'badge-secondary'
  }

  const getStatusLabel = (status) => {
    const labels = {
      'confirmed': 'Confirmada',
      'seated': 'Sentada',
      'cancelled': 'Cancelada',
      'completed': 'Completada',
      'no_show': 'No se presentó'
    }
    return labels[status] || status
  }

  const getEmptyMessage = () => {
    if (filterDate === 'today') return 'No hay reservas para hoy'
    if (filterDate === 'tomorrow') return 'No hay reservas para mañana'
    if (filterDate === 'week') return 'No hay reservas para esta semana'
    if (filterStatus !== 'all') return `No hay reservas con estado "${filterStatus}"`
    return 'No hay reservas con los filtros seleccionados'
  }

  if (loading) {
    return <div className="loading-spinner"><div className="spinner"></div></div>
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2>📅 Reservas</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {reservas.length} reservas | {reservas.filter(r => r.status === 'confirmed').length} confirmadas
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary" onClick={openNewReservationModal}>
            <Plus size={20} /> Nueva Reserva
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por nombre, teléfono o mesa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>
          
          <select
            className="form-control"
            style={{ width: 'auto' }}
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          >
            <option value="all">Todas las fechas</option>
            <option value="today">Hoy</option>
            <option value="tomorrow">Mañana</option>
            <option value="week">Próxima Semana</option>
          </select>

          <select
            className="form-control"
            style={{ width: 'auto' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Todos los estados</option>
            <option value="confirmed">Confirmadas</option>
            <option value="seated">Sentadas</option>
            <option value="completed">Completadas</option>
            <option value="cancelled">Canceladas</option>
            <option value="no_show">No Show</option>
          </select>
        </div>
      </div>

      {/* Lista de reservas */}
      {reservas.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <h3>No hay reservas</h3>
            <p>{getEmptyMessage()}</p>
            {filterDate !== 'all' && (
              <button 
                className="btn btn-primary" 
                style={{ marginTop: '1rem' }}
                onClick={() => setFilterDate('all')}
              >
                Ver todas las reservas
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-3">
          {reservas
            .filter(reserva => {
              if (!searchTerm) return true
              const search = searchTerm.toLowerCase()
              return (
                reserva.customer_name?.toLowerCase().includes(search) ||
                reserva.customer_phone?.includes(search) ||
                reserva.tables?.name?.toLowerCase().includes(search)
              )
            })
            .map(reserva => (
              <div key={reserva.id} className="card slide-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>{reserva.customer_name}</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Mesa: <strong>{reserva.tables?.name || 'N/A'}</strong>
                    </p>
                  </div>
                  <span className={'badge ' + getStatusBadge(reserva.status)}>
                    {getStatusLabel(reserva.status)}
                  </span>
                </div>

                {/* Botones de acción */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <button
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                    onClick={() => openEditModal(reserva)}
                    title="Editar reserva"
                  >
                    <Edit size={18} style={{ marginRight: '0.5rem' }} /> Editar
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                    onClick={() => deleteReservation(reserva.id)}
                    title="Eliminar reserva"
                  >
                    <XCircle size={18} style={{ marginRight: '0.5rem' }} /> Eliminar
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <Calendar size={16} style={{ color: 'var(--text-secondary)' }} />
                    <span>
                      {reserva.reservation_date}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <Clock size={16} style={{ color: 'var(--text-secondary)' }} />
                    <span>
                      {reserva.reservation_time 
                        ? String(reserva.reservation_time).substring(0, 5) 
                        : 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <Users size={16} style={{ color: 'var(--text-secondary)' }} />
                    <span>{reserva.party_size} personas</span>
                  </div>
                  {reserva.customer_phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                      <Phone size={16} style={{ color: 'var(--text-secondary)' }} />
                      <span>{reserva.customer_phone}</span>
                    </div>
                  )}
                  {reserva.customer_email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                      <Mail size={16} style={{ color: 'var(--text-secondary)' }} />
                      <span>{reserva.customer_email}</span>
                    </div>
                  )}
                </div>

                {reserva.notes && (
                  <div style={{
                    padding: '0.75rem',
                    background: 'var(--background)',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                    marginBottom: '1rem'
                  }}>
                    <strong>Notas:</strong> {reserva.notes}
                  </div>
                )}

                {reserva.has_preorder && reserva.preorder_total > 0 && (
                  <div style={{
                    padding: '0.75rem',
                    background: 'var(--success-light)',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                    marginBottom: '1rem',
                    border: '1px solid var(--success)'
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--success)' }}>
                      🛒 Pre-orden de Platos
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Total:</span>
                      <strong style={{ color: 'var(--success)' }}>${parseFloat(reserva.preorder_total).toFixed(2)}</strong>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {reserva.status === 'confirmed' && (
                    <>
                      <button 
                        className="btn btn-success btn-sm" 
                        style={{ flex: 1 }}
                        onClick={() => updateStatus(reserva.id, 'seated')}
                      >
                        <CheckCircle size={14} /> Sentar
                      </button>
                      <button 
                        className="btn btn-danger btn-sm" 
                        onClick={() => updateStatus(reserva.id, 'cancelled')}
                      >
                        <XCircle size={14} />
                      </button>
                    </>
                  )}
                  {reserva.status === 'seated' && (
                    <button 
                      className="btn btn-success btn-sm" 
                      style={{ flex: 1 }}
                      onClick={() => updateStatus(reserva.id, 'completed')}
                    >
                      Completar
                    </button>
                  )}
                  {reserva.status === 'cancelled' && (
                    <button 
                      className="btn btn-outline btn-sm" 
                      style={{ flex: 1 }}
                      onClick={() => updateStatus(reserva.id, 'confirmed')}
                    >
                      Reconfirmar
                    </button>
                  )}
                  {profile?.role === 'admin' && (
                    <button 
                      className="btn btn-outline btn-sm" 
                      onClick={() => deleteReservation(reserva.id)}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Modal de Nueva Reserva */}
      {showNewReservationModal && (
        <div className="modal-overlay" onClick={() => setShowNewReservationModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h3>📅 Nueva Reserva</h3>
            
            <div className="form-group">
              <label>Nombre del Cliente *</label>
              <input
                type="text"
                className="form-control"
                value={newReservationData.customer_name}
                onChange={(e) => setNewReservationData({ ...newReservationData, customer_name: e.target.value })}
                placeholder="Ej: Juan Pérez"
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Teléfono</label>
                <input
                  type="tel"
                  className="form-control"
                  value={newReservationData.customer_phone}
                  onChange={(e) => setNewReservationData({ ...newReservationData, customer_phone: e.target.value })}
                  placeholder="0994555188"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={newReservationData.customer_email}
                  onChange={(e) => setNewReservationData({ ...newReservationData, customer_email: e.target.value })}
                  placeholder="juan@email.com"
                />
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Fecha *</label>
                <input
                  type="date"
                  className="form-control"
                  value={newReservationData.reservation_date}
                  onChange={(e) => setNewReservationData({ ...newReservationData, reservation_date: e.target.value })}
                  min={minDate}
                />
              </div>
              <div className="form-group">
                <label>Hora *</label>
                <input
                  type="time"
                  className="form-control"
                  value={newReservationData.reservation_time}
                  onChange={(e) => setNewReservationData({ ...newReservationData, reservation_time: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Personas</label>
                <input
                  type="number"
                  className="form-control"
                  value={newReservationData.party_size}
                  onChange={(e) => setNewReservationData({ ...newReservationData, party_size: parseInt(e.target.value) || 0 })}
                  min="1"
                  max="20"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Mesa *</label>
              <select
                className="form-control"
                value={newReservationData.table_id}
                onChange={(e) => setNewReservationData({ ...newReservationData, table_id: e.target.value })}
              >
                <option value="">Seleccionar mesa</option>
                {tables.map(table => (
                  <option key={table.id} value={table.id}>
                    {table.name} ({table.capacity} personas)
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Notas</label>
              <textarea
                className="form-control"
                value={newReservationData.notes}
                onChange={(e) => setNewReservationData({ ...newReservationData, notes: e.target.value })}
                placeholder="Ocasión especial, alergias, etc."
                rows="2"
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
                    onChange={(e) => {
                      setShowPreOrder(e.target.checked)
                      if (e.target.checked) fetchProducts()
                    }}
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
            
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowNewReservationModal(false)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" onClick={createNewReservation}>
                ✅ Confirmar Reserva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Editar Reserva */}
      {showEditModal && editingReservation && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>✏️ Editar Reserva</h3>
            <form onSubmit={(e) => { e.preventDefault(); saveEdit(); }}>
              <div className="form-group">
                <label>Nombre del Cliente *</label>
                <input
                  type="text"
                  className="form-control"
                  value={editData.customer_name}
                  onChange={(e) => setEditData({ ...editData, customer_name: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={editData.customer_phone}
                    onChange={(e) => setEditData({ ...editData, customer_phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={editData.customer_email}
                    onChange={(e) => setEditData({ ...editData, customer_email: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Personas</label>
                  <input
                    type="number"
                    className="form-control"
                    value={editData.party_size}
                    onChange={(e) => setEditData({ ...editData, party_size: parseInt(e.target.value) || 0 })}
                    min="1"
                    max="20"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Mesa</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editingReservation.tables?.name || 'N/A'}
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
                    value={editData.reservation_date}
                    onChange={(e) => setEditData({ ...editData, reservation_date: e.target.value })}
                    min={minDate}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Hora *</label>
                  <input
                    type="time"
                    className="form-control"
                    value={editData.reservation_time}
                    onChange={(e) => setEditData({ ...editData, reservation_time: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Notas</label>
                <textarea
                  className="form-control"
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  rows="3"
                />
              </div>

              {/* Sección de Pre-orden */}
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
                      onChange={(e) => {
                        setShowPreOrder(e.target.checked)
                        if (e.target.checked) fetchProducts()
                      }}
                    />
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Activar pre-orden</span>
                  </label>
                </div>

                {showPreOrder && (
                  <div>
                    {/* Selector de productos */}
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
                      <label>Notas del plato (opcional)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={preOrderNotes}
                        onChange={(e) => setPreOrderNotes(e.target.value)}
                        placeholder="Ej: Sin cebolla, término medio..."
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

                    {/* Lista de items */}
                    {preOrderItems.length > 0 && (
                      <div style={{ 
                        maxHeight: '200px', 
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
                          fontWeight: 700,
                          fontSize: '1rem'
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
                <button type="button" className="btn btn-outline" onClick={() => setShowEditModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  💾 Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Alarma de Reserva */}
      {showAlarmModal && currentAlarmReservation && (
        <div className="modal-overlay" onClick={() => { stopAlarmSound(); setShowAlarmModal(false); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px', border: '3px solid #f59e0b' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              marginBottom: '1.5rem',
              animation: 'pulse 1s infinite'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)'
              }}>
                <Bell size={40} style={{ color: 'white' }} />
              </div>
            </div>
            
            <h2 style={{ 
              textAlign: 'center', 
              fontSize: '1.5rem', 
              fontWeight: 700,
              color: '#f59e0b',
              marginBottom: '0.5rem'
            }}>
              🔔 ¡Es la Hora!
            </h2>
            
            <p style={{ 
              textAlign: 'center', 
              color: 'var(--text-secondary)',
              fontSize: '0.925rem',
              marginBottom: '1.5rem'
            }}>
              La reserva está por comenzar
            </p>
            
            <div style={{
              background: 'var(--background)',
              padding: '1.25rem',
              borderRadius: '0.75rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>👤 Cliente</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{currentAlarmReservation.customer_name}</div>
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '1rem',
                marginBottom: '0.75rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>🕐 Hora</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600 }}>{String(currentAlarmReservation.reservation_time).substring(0, 5)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>👥 Personas</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600 }}>{currentAlarmReservation.party_size} personas</div>
                </div>
              </div>
              
              {currentAlarmReservation.tables && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>🪑 Mesa</div>
                  <div style={{ 
                    fontSize: '1rem', 
                    fontWeight: 600,
                    padding: '0.5rem',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    borderRadius: '0.375rem',
                    textAlign: 'center'
                  }}>
                    {currentAlarmReservation.tables?.name}
                  </div>
                </div>
              )}
            </div>
            
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'center'
            }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  if (currentAlarmReservation) {
                    markAlarmAsHandled(currentAlarmReservation)
                  }
                  stopAlarmSound()
                  setShowAlarmModal(false)
                }}
                style={{ flex: 1, padding: '0.875rem', fontWeight: 600 }}
              >
                {isPlaying ? '🔇 Detener Alarma' : 'Cerrar'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (currentAlarmReservation) {
                    markAlarmAsHandled(currentAlarmReservation)
                  }
                  stopAlarmSound()
                  setShowAlarmModal(false)
                  if (currentAlarmReservation?.table_id) {
                    window.location.href = `/pos?table=${currentAlarmReservation.table_id}`
                  }
                }}
                style={{ flex: 1, padding: '0.875rem', fontWeight: 600 }}
              >
                🛒 Ir a Pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Reservas
