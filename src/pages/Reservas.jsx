import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Calendar, Clock, Users, Phone, Mail, CheckCircle, XCircle, Search, Filter, Edit, Bell, Plus, Minus, ShoppingBag } from 'lucide-react'

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
  
  // Obtener fecha mínima (hoy) para el input de fecha
  const minDate = new Date().toISOString().split('T')[0]
  
  // Estados para pre-orden
  const [showPreOrder, setShowPreOrder] = useState(false)
  const [preOrderItems, setPreOrderItems] = useState([])
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [preOrderQuantity, setPreOrderQuantity] = useState(1)
  const [preOrderNotes, setPreOrderNotes] = useState('')
  const [tables, setTables] = useState([])
  
  // Estados para recordatorios automáticos
  const [upcomingReservations, setUpcomingReservations] = useState([])
  const [showReminderNotification, setShowReminderNotification] = useState(false)
  
  // Cargar configuración desde localStorage o usar valores por defecto
  const [reminderSettings, setReminderSettings] = useState(() => {
    const saved = localStorage.getItem('reminderSettings')
    return saved ? JSON.parse(saved) : {
      enabled: true,
      minutesBefore: 60, // Recordar 1 hora antes
      autoRefresh: true
    }
  })
  
  // Guardar configuración en localStorage cada vez que cambie
  useEffect(() => {
    localStorage.setItem('reminderSettings', JSON.stringify(reminderSettings))
  }, [reminderSettings])
  const { profile } = useAuth()
  const toast = useToast()

  useEffect(() => {
    fetchReservas()
    fetchTables()
  }, [filterStatus, filterDate])

  // Verificar recordatorios automáticos cada minuto
  useEffect(() => {
    if (!reminderSettings.enabled) return

    checkUpcomingReservations()
    
    const interval = setInterval(() => {
      checkUpcomingReservations()
    }, 60000) // Cada minuto

    return () => clearInterval(interval)
  }, [reminderSettings.enabled, reminderSettings.minutesBefore])

  // Verificar reservas próximas
  async function checkUpcomingReservations() {
    try {
      const ahora = new Date()
      // Obtener fecha local en formato YYYY-MM-DD
      const hoy = ahora.toLocaleDateString('en-CA')

      console.log('🔔 Verificando recordatorios - Fecha:', hoy, 'Hora:', ahora.toLocaleTimeString())

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
        console.log('No hay reservas para hoy')
        return
      }

      console.log('📅 Reservas encontradas:', reservasHoy.length)

      // Filtrar reservas que están por cumplirse
      const proximas = reservasHoy.filter(reserva => {
        // Crear fecha de la reserva en hora local
        const [year, month, day] = String(reserva.reservation_date).split('-')
        const timeString = String(reserva.reservation_time).substring(0, 5) // "14:00:00" → "14:00"
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

        console.log(`🕐 Reserva: ${reserva.customer_name}, Hora: ${timeString}, Faltan: ${diffMinutes} min`)

        // Si falta entre 0 y minutesBefore minutos
        return diffMinutes >= 0 && diffMinutes <= reminderSettings.minutesBefore
      })

      console.log('🔔 Reservas próximas:', proximas.length)

      if (proximas.length > 0) {
        setUpcomingReservations(proximas)
        setShowReminderNotification(true)

        // Sonar notificación
        playNotificationSound()

        console.log('✅ Notificación mostrada para:', proximas.map(p => p.customer_name).join(', '))
      }
    } catch (error) {
      console.error('Error checking upcoming reservations:', error)
    }
  }

  // Sonido de notificación
  function playNotificationSound() {
    // Usar Audio API del navegador
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  }

  // Enviar recordatorio automático
  async function sendAutoReminder(reserva) {
    if (!reserva.customer_phone) {
      toast.warning('La reserva no tiene número de teléfono')
      return
    }

    // Verificar si hay configuración de WhatsApp API
    const whatsappConfig = JSON.parse(localStorage.getItem('whatsappConfig') || '{}')
    
    const fecha = reserva.reservation_date  // Usar fecha directa sin conversión

    const hora = String(reserva.reservation_time).substring(0, 5)

    const mensaje = `Hola ${reserva.customer_name}!

Te recordamos tu reserva en nuestro restaurante:

Fecha: ${fecha}
Hora: ${hora}
Personas: ${reserva.party_size}
Mesa: ${reserva.tables?.name || 'Confirmada'}

¡Te esperamos!

Responde SI para confirmar o NO para cancelar.`

    // Si hay configuración de WhatsApp API, enviar automáticamente
    if (whatsappConfig.accessToken && whatsappConfig.phoneNumberId) {
      try {
        const response = await fetch(
          `https://graph.facebook.com/v17.0/${whatsappConfig.phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${whatsappConfig.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: reserva.customer_phone.replace(/[^0-9]/g, ''),
              type: 'text',
              text: { body: mensaje }
            })
          }
        )

        const result = await response.json()

        if (result.messages && result.messages.length > 0) {
          toast.success(`✅ WhatsApp enviado a ${reserva.customer_name}`)
          return
        }
      } catch (error) {
        console.error('Error sending WhatsApp:', error)
      }
    }

    // Si no hay API o falla, abrir WhatsApp Web manualmente
    const mensajeEncoded = encodeURIComponent(mensaje)
    const phone = reserva.customer_phone.replace(/[^0-9]/g, '')
    const url = `https://wa.me/${phone}?text=${mensajeEncoded}`
    window.open(url, '_blank')
    toast.success(`Abriendo WhatsApp para ${reserva.customer_name}`)
  }

  // Enviar todos los recordatorios
  function sendAllReminders() {
    upcomingReservations.forEach((reserva, index) => {
      setTimeout(() => {
        sendAutoReminder(reserva)
      }, index * 1000) // 1 segundo entre cada uno
    })
    
    setShowReminderNotification(false)
    setUpcomingReservations([])
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

  function sendReminder(reserva) {
    if (!reserva.customer_phone) {
      toast.warning('La reserva no tiene número de teléfono')
      return
    }

    const fecha = reserva.reservation_date  // Usar fecha directa sin conversión UTC
    const hora = String(reserva.reservation_time).substring(0, 5)

    // Usar emojis compatibles con URL
    const mensaje = `Hola ${reserva.customer_name}!

Te recordamos que tienes una reserva en nuestro restaurante:
Fecha: ${fecha}
Hora: ${hora}
Personas: ${reserva.party_size}
Mesa: ${reserva.tables?.name || 'Confirmada'}

Te esperamos!

Si necesitas cancelar o modificar, por favor avisanos.`

    // Limpiar número de teléfono (solo dígitos)
    let phone = reserva.customer_phone.replace(/[^0-9]/g, '')
    
    // Si el número no tiene código de país, agregar uno por defecto
    if (phone.length <= 10) {
      const CODIGO_PAIS = '593'
      phone = CODIGO_PAIS + phone
    }
    
    // Codificar mensaje para URL correctamente
    const mensajeEncoded = encodeURIComponent(mensaje)
    
    // Abrir WhatsApp
    const url = `https://wa.me/${phone}?text=${mensajeEncoded}`
    window.open(url, '_blank')
    
    toast.success('Abriendo WhatsApp...')
  }

  function sendEmailReminder(reserva) {
    if (!reserva.customer_email) {
      toast.warning('La reserva no tiene correo electrónico')
      return
    }

    const fecha = reserva.reservation_date  // Usar fecha directa sin conversión UTC
    const subject = encodeURIComponent(`Recordatorio de Reserva - ${fecha}`)
    const body = encodeURIComponent(`Hola ${reserva.customer_name},

Te recordamos que tienes una reserva en nuestro restaurante:

Fecha: ${fecha}
Hora: ${reserva.reservation_time}
👥 Personas: ${reserva.party_size}
🪑 Mesa: ${reserva.tables?.name || 'Confirmada'}

¡Te esperamos!

Si necesitas cancelar o modificar, por favor avísanos.

Saludos,
Equipo del Restaurante`)

    window.open(`mailto:${reserva.customer_email}?subject=${subject}&body=${body}`)
    toast.success('Abriendo cliente de correo...')
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
          <button 
            className="btn btn-outline" 
            onClick={() => setReminderSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
            title="Activar/desactivar recordatorios automáticos"
          >
            🔔 {reminderSettings.enabled ? 'ON' : 'OFF'}
          </button>
          <button className="btn btn-primary" onClick={openNewReservationModal}>
            <Plus size={20} /> Nueva Reserva
          </button>
        </div>
      </div>

      {/* Notificación de recordatorios */}
      {showReminderNotification && upcomingReservations.length > 0 && (
        <div className="card" style={{ 
          marginBottom: '1.5rem', 
          border: '2px solid var(--warning)',
          background: 'var(--warning-light)',
          animation: 'pulse 2s infinite'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--warning)' }}>
                🔔 {upcomingReservations.length} Reserva(s) Próxima(s)
              </h3>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>
                Las siguientes reservas están por cumplirse en los próximos {reminderSettings.minutesBefore} minutos:
              </p>
              <div style={{ marginTop: '0.75rem' }}>
                {upcomingReservations.map(reserva => (
                  <div key={reserva.id} style={{ 
                    background: 'var(--surface)', 
                    padding: '0.75rem', 
                    borderRadius: '0.5rem',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <strong>{reserva.customer_name}</strong>
                      <span style={{ marginLeft: '0.75rem', color: 'var(--text-secondary)' }}>
                        🕐 {reserva.reservation_time.substring(0, 5)} - {reserva.tables?.name}
                      </span>
                    </div>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => sendAutoReminder(reserva)}
                    >
                      📱 Enviar Recordatorio
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-outline"
                onClick={() => setShowReminderNotification(false)}
              >
                Cerrar
              </button>
              <button
                className="btn btn-primary"
                onClick={sendAllReminders}
              >
                📱 Enviar Todos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configuración de recordatorios */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h4 style={{ margin: 0 }}>⚙️ Recordatorios Automáticos</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>
              El sistema verificará automáticamente las reservas próximas y te notificará
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div>
              <label style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>
                Minutos antes:
              </label>
              <select
                className="form-control"
                style={{ width: 'auto', padding: '0.5rem' }}
                value={reminderSettings.minutesBefore}
                onChange={(e) => setReminderSettings(prev => ({ ...prev, minutesBefore: parseInt(e.target.value) }))}
              >
                <option value="15">15 minutos</option>
                <option value="30">30 minutos</option>
                <option value="60">1 hora</option>
                <option value="120">2 horas</option>
                <option value="180">3 horas</option>
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={reminderSettings.enabled}
                onChange={(e) => setReminderSettings(prev => ({ ...prev, enabled: e.target.checked }))}
              />
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Activados</span>
            </label>
          </div>
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

                {/* Botón de WhatsApp */}
                <button
                  className="btn"
                  style={{ 
                    width: '100%',
                    background: '#25D366',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '1rem',
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                  onClick={() => sendReminder(reserva)}
                  title="Enviar recordatorio por WhatsApp"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413"/>
                  </svg>
                  Enviar Recordatorio
                </button>

                {/* Otros botones */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <button
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                    onClick={() => sendEmailReminder(reserva)}
                    title="Enviar recordatorio por Email"
                  >
                    <Bell size={18} style={{ marginRight: '0.5rem' }} /> Email
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                    onClick={() => openEditModal(reserva)}
                    title="Editar reserva"
                  >
                    <Edit size={18} style={{ marginRight: '0.5rem' }} /> Editar
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
    </div>
  )
}

export default Reservas
