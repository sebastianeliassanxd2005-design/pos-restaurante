import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Search, Plus, Minus, Trash2, StickyNote, ShoppingBag } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function POS() {
  const { profile } = useAuth()
  const [searchParams] = useSearchParams()
  const [tables, setTables] = useState([])
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedTable, setSelectedTable] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [cart, setCart] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showNotes, setShowNotes] = useState(false)
  const [noteItemIndex, setNoteItemIndex] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [showCartMobile, setShowCartMobile] = useState(false)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false)
  const [activeOrder, setActiveOrder] = useState(null) // Orden activa de la mesa seleccionada
  const toast = useToast()

  // Detectar cambio de tamaño de pantalla
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      setIsMobile(width <= 768)
    }
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Cargar datos iniciales
  useEffect(() => {
    fetchData()
  }, [])

  // Seleccionar mesa automáticamente si viene por URL
  useEffect(() => {
    const tableId = searchParams.get('table')
    
    console.log('=== USEFFECT SELECCIONAR MESA ===')
    console.log('🔍 Parámetro table en URL:', tableId)
    console.log('🔍 Mesas cargadas:', tables.length)
    console.log('🔍 Mesa ya seleccionada:', selectedTable)
    console.log('🔍 IDs de mesas disponibles:', tables.map(t => t.id))
    
    // Solo proceder si hay un parámetro table y las mesas ya cargaron
    // Y NO hay una mesa seleccionada (evita re-ejecuciones)
    if (tableId && tables.length > 0 && !selectedTable) {
      const table = tables.find(t => t.id === tableId)
      console.log('🔍 Mesa encontrada en la lista:', table ? 'SÍ' : 'NO')
      
      if (table) {
        console.log('✅ Mesa encontrada:', table.name, table.status)
        setSelectedTable(tableId)
        toast.success(`Mesa ${table.name} seleccionada`)
      } else {
        console.log('❌ Mesa no encontrada en la lista filtrada')
        console.log('💡 La mesa puede estar filtrada por no estar disponible para pedido')
        console.log('💡 Intenta seleccionar la mesa manualmente del grid')
      }
    }
    console.log('=== FIN USEFFECT ===')
  }, [searchParams, tables, selectedTable])

  // Obtener orden activa de la mesa seleccionada
  useEffect(() => {
    if (!selectedTable) {
      setActiveOrder(null)
      return
    }

    async function fetchActiveOrder() {
      try {
        console.log('🔍 Buscando orden activa para mesa:', selectedTable)
        
        const { data, error } = await supabase
          .from('orders')
          .select('*, tables (name)')
          .eq('table_id', selectedTable)
          .in('status', ['pending', 'cooking', 'ready', 'served'])
          .order('created_at', { ascending: false })
          .limit(1)
        
        if (error) {
          console.error('❌ Error al buscar orden activa:', error)
          return
        }

        const order = data && data.length > 0 ? data[0] : null
        setActiveOrder(order)
        console.log('📋 Orden activa:', order ? `#${order.id.slice(0, 8)}` : 'Ninguna')
      } catch (error) {
        console.error('Error:', error)
      }
    }

    fetchActiveOrder()
  }, [selectedTable])

  async function fetchData() {
    try {
      setError(null)
      setLoading(true)

      console.log('🛒 Cargando mesas para pedido...')

      // Obtener TODAS las mesas primero
      const { data: allTables, error: tablesError } = await supabase
        .from('tables')
        .select('*')
        .order('name')

      console.log('🪑 allTables:', allTables)
      console.log('🪑 tablesError:', tablesError)

      if (tablesError) {
        console.error('Error al obtener mesas:', tablesError)
        throw tablesError
      }

      console.log('🪑 Todas las mesas:', allTables?.length || 0)
      console.log('🪑 Estados de mesas:', allTables?.map(t => `${t.name} (${t.status})`))

      // Obtener reservas confirmadas/sentadas para hoy
      const hoy = new Date().toLocaleDateString('en-CA')
      const { data: reservasHoy } = await supabase
        .from('reservations')
        .select('table_id, status')
        .eq('reservation_date', hoy)
        .in('status', ['confirmed', 'seated'])

      const mesasConReservaHoy = new Set(reservasHoy?.map(r => r.table_id) || [])

      console.log('📅 Mesas con reserva para hoy:', mesasConReservaHoy.size)

      // Obtener mesas con órdenes activas (pending, cooking, served)
      const { data: ordenesActivas } = await supabase
        .from('orders')
        .select('table_id')
        .in('status', ['pending', 'cooking', 'served'])

      const mesasConOrden = new Set(ordenesActivas?.map(o => o.table_id) || [])

      console.log('🪑 Mesas con orden activa:', mesasConOrden.size)

      // Filtrar mesas disponibles para pedido:
      // 1. Mesas reservadas (SIEMPRE disponibles)
      // 2. Mesas ocupadas SIN órdenes activas
      // 3. Mesas disponibles CON reserva para hoy
      // 4. Mesa que viene por URL (siempre incluir para que se pueda seleccionar)
      const tableIdFromUrl = searchParams.get('table')
      
      const mesasDisponibles = allTables?.filter(t => {
        // Si es la mesa que viene por URL, siempre incluir
        if (tableIdFromUrl && t.id === tableIdFromUrl) {
          console.log('🔖 Incluyendo mesa por URL:', t.name)
          return true
        }
        
        // Si está reservada, siempre mostrar
        if (t.status === 'reserved') {
          return true
        }
        // Si está ocupada, mostrar solo si NO tiene orden activa
        if (t.status === 'occupied') {
          return !mesasConOrden.has(t.id)
        }
        // Si está disponible pero tiene reserva para hoy, mostrar
        if (t.status === 'available' && mesasConReservaHoy.has(t.id)) {
          return true
        }
        // Otros casos no mostrar
        return false
      }) || []

      console.log('🪑 Mesas disponibles para pedido:', mesasDisponibles.length)
      console.log('🪑 Mesas:', mesasDisponibles.map(m => `${m.name} (${m.status})`))

      const { data: categoriesData } = await supabase.from('categories').select('*').order('name')
      const { data: productsData } = await supabase.from('products').select('*, categories(name)').eq('available', true).order('name')

      setTables(mesasDisponibles)
      setCategories(categoriesData || [])
      setProducts(productsData || [])
    } catch (error) {
      console.error('Error:', error)
      setError(error.message)
      toast.error('Error al cargar datos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function addToCart(product) {
    console.log('🛒 addToCart llamado:', {
      product: product.name,
      selectedTable,
      activeOrder: activeOrder ? 'EXISTE' : 'NO EXISTE',
      cartLength: cart.length
    })

    // Validar que haya una mesa seleccionada
    if (!selectedTable) {
      toast.warning('⚠️ Primero selecciona una mesa para generar el pedido')
      return
    }

    // Verificar si la mesa tiene una reserva y si ya es la hora
    const mesaSeleccionada = tables.find(t => t.id === selectedTable)
    if (mesaSeleccionada && mesaSeleccionada.status === 'reserved') {
      // Obtener detalles de la reserva
      const hoy = new Date().toLocaleDateString('en-CA')
      const { data: reserva } = await supabase
        .from('reservations')
        .select('reservation_date, reservation_time, customer_name')
        .eq('table_id', selectedTable)
        .eq('reservation_date', hoy)
        .in('status', ['confirmed', 'seated'])
        .single()

      if (reserva) {
        // Verificar si ya es la hora de la reserva
        const esHoraDeReserva = verificarSiEsHoraDeReserva(reserva.reservation_date, reserva.reservation_time)
        
        if (!esHoraDeReserva) {
          const horaReserva = String(reserva.reservation_time).substring(0, 5)
          toast.warning(
            `⏰ Esta mesa tiene una reserva a las ${horaReserva} para ${reserva.customer_name || 'el cliente'}.\n\n` +
            `No se pueden agregar items hasta que sea la hora de la reserva.`
          )
          return
        }
      }
    }

    // Si NO hay una orden activa, crear una automáticamente al agregar el primer item
    if (!activeOrder && cart.length === 0) {
      console.log('📋 Primer item agregado - Creando orden automáticamente...')

      try {
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert([{
            table_id: selectedTable,
            waiter_id: profile.id,
            status: 'pending',
            subtotal: product.price,
            tax: product.price * 0.12,
            total: product.price * 1.12
          }])
          .select()
          .single()

        if (orderError) {
          console.error('❌ Error al crear orden:', orderError)
          throw orderError
        }

        console.log('✅ Orden creada en BD:', orderData.id)

        // Insertar el primer item
        const firstItem = {
          order_id: orderData.id,
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: product.price,
          subtotal: product.price,
          notes: '',
          status: 'pending'
        }

        const { error: itemsError } = await supabase.from('order_items').insert([firstItem])
        if (itemsError) {
          console.error('❌ Error al crear item:', itemsError)
          throw itemsError
        }

        console.log('✅ Item creado en BD')

        // Marcar mesa como occupied
        const { error: tableError } = await supabase
          .from('tables')
          .update({ status: 'occupied' })
          .eq('id', selectedTable)

        if (tableError) {
          console.error('❌ Error al actualizar mesa:', tableError)
        } else {
          console.log('✅ Mesa marcada como occupied')
        }

        toast.success('Mesa ocupada - Pedido iniciado')

        // Recargar datos para actualizar la UI
        console.log('🔄 Recargando datos...')
        await fetchData()

        // Agregar el producto al carrito local (ya está en la BD)
        setCart([{ ...product, quantity: 1, notes: '', order_id: orderData.id }])
        console.log('🛒 Carrito actualizado, length:', 1)
        return

      } catch (error) {
        console.error('❌ Error al crear orden automática:', error)
        toast.error('Error al iniciar pedido: ' + error.message)
        // Continuar con el flujo normal si falla la creación automática
      }
    }

    // Flujo normal: agregar al carrito local
    console.log('➕ Agregando al carrito (flujo normal)')
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...prev, { ...product, quantity: 1, notes: '' }]
    })
  }

  // Verificar si ya es la hora de la reserva (permite enviar desde 1 hora antes hasta 2 horas después)
  function verificarSiEsHoraDeReserva(reservationDate, reservationTime) {
    if (!reservationDate || !reservationTime) return false

    const ahora = new Date()
    
    // Crear fecha/hora de la reserva
    const [year, month, day] = String(reservationDate).split('-')
    const timeString = String(reservationTime).substring(0, 5) // "14:00"
    const [hours, minutes] = timeString.split(':')
    
    const reservaDateTime = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes)
    )

    // Permitir desde 1 hora antes hasta 2 horas después de la hora de reserva
    const unaHoraAntes = new Date(reservaDateTime.getTime() - 60 * 60 * 1000)
    const dosHorasDespues = new Date(reservaDateTime.getTime() + 2 * 60 * 60 * 1000)

    const dentroDelRango = ahora >= unaHoraAntes && ahora <= dosHorasDespues

    return dentroDelRango
  }

  function removeFromCart(index) {
    setCart(prev => prev.filter((_, i) => i !== index))
  }

  function updateQuantity(index, delta) {
    setCart(prev => prev.map((item, i) => {
      if (i === index) {
        const newQty = item.quantity + delta
        return newQty > 0 ? { ...item, quantity: newQty } : item
      }
      return item
    }))
  }

  function addNoteToItem(index) {
    setNoteItemIndex(index)
    setNoteText(cart[index]?.notes || '')
    setShowNotes(true)
  }

  function saveNote() {
    if (noteItemIndex !== null) {
      setCart(prev => prev.map((item, i) => i === noteItemIndex ? { ...item, notes: noteText } : item))
      setShowNotes(false)
      setNoteItemIndex(null)
      setNoteText('')
      toast.success('Nota agregada')
    }
  }

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const tax = cartSubtotal * 0.19
  const cartTotal = cartSubtotal + tax

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory
    return matchesSearch && matchesCategory
  })

  async function createOrder() {
    if (!selectedTable) {
      toast.warning('Selecciona una mesa primero')
      return
    }
    if (cart.length === 0) {
      toast.warning('Agrega productos al pedido')
      return
    }

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          table_id: selectedTable,
          waiter_id: profile.id,  // Asignar mesero actual a la orden
          status: 'pending',
          subtotal: cartSubtotal,
          tax: tax,
          total: cartTotal
        }])
        .select()
        .single()

      if (orderError) throw orderError

      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity,
        notes: item.notes,
        status: 'pending'
      }))

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
      if (itemsError) throw itemsError

      await supabase.from('tables').update({ status: 'occupied' }).eq('id', selectedTable)

      toast.success('¡Orden creada!')
      setCart([])
      setSelectedTable(null)
      fetchData()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al crear orden: ' + error.message)
    }
  }

  async function cancelActiveOrder() {
    if (!activeOrder) return

    const confirmCancel = window.confirm(`¿Estás seguro de cancelar el pedido de la ${activeOrder.tables?.name || 'mesa'}?\n\nTotal: $${parseFloat(activeOrder.total || 0).toFixed(2)}\n\nEsta acción no se puede deshacer.`)
    if (!confirmCancel) return

    try {
      // Actualizar orden a cancelada
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', activeOrder.id)

      if (orderError) throw orderError

      // Liberar mesa
      await supabase.from('tables').update({ status: 'available' }).eq('id', selectedTable)

      toast.success('✅ Pedido cancelado correctamente')
      setActiveOrder(null)
      setCart([])
      setSelectedTable(null)
      fetchData()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cancelar pedido: ' + error.message)
    }
  }

  if (error) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>Error al cargar datos</h3>
          <p style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{error}</p>
          <button className="btn btn-primary" onClick={fetchData} style={{ marginTop: '1rem' }}>Reintentar</button>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="loading-spinner"><div className="spinner"></div></div>
  }

  return (
    <div className="fade-in">
      {/* Layout responsive: Columna en móvil, fila en desktop */}
      <div style={{
        display: 'flex',
        gap: isMobile ? '1rem' : '1.5rem',
        flexDirection: isMobile ? 'column' : 'row'
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card" style={{ marginBottom: isMobile ? '1rem' : '1.5rem' }}>
            <label style={{ fontWeight: 600, marginBottom: '0.75rem', display: 'block', fontSize: '0.925rem' }}>
              🪑 Paso 1: Seleccionar Mesa
            </label>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Solo aparecen mesas ocupadas o con reserva
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {tables.length === 0 ? (
                <div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    ⚠️ No hay mesas disponibles para nuevo pedido.
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Las mesas ocupadas ya tienen un pedido en curso.
                  </p>
                  <a href="/mesas" className="btn btn-primary btn-sm">Ir a Mesas</a>
                </div>
              ) : (
                tables.map(table => (
                  <button
                    key={table.id}
                    className={selectedTable === table.id ? 'btn btn-primary' : 'btn btn-outline'}
                    onClick={() => setSelectedTable(table.id)}
                    style={{ 
                      fontSize: isMobile ? '0.8125rem' : '0.875rem',
                      padding: isMobile ? '0.5rem 0.875rem' : '0.625rem 1rem'
                    }}
                  >
                    {table.name} {selectedTable === table.id && '✓'}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="card" style={{ marginBottom: isMobile ? '1rem' : '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexDirection: isMobile ? 'column' : 'row' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ flex: 1, minHeight: '40px' }}
              />
              <select 
                className="form-control" 
                style={{ 
                  width: isMobile ? '100%' : 'auto',
                  minHeight: '40px'
                }} 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">Todas las categorías</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid" style={{ 
            gridTemplateColumns: isMobile ? '1fr' : window.innerWidth <= 1280 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
            gap: isMobile ? '0.75rem' : window.innerWidth <= 1280 ? '1rem' : '1.5rem',
            position: 'relative'
          }}>
            {/* Overlay cuando no hay mesa seleccionada */}
            {!selectedTable && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(241,245,249,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                pointerEvents: 'none',
                padding: '2rem'
              }}>
                <div style={{
                  background: 'var(--surface)',
                  padding: '1.5rem',
                  borderRadius: '0.75rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  border: '2px solid var(--primary)',
                  maxWidth: '400px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🪑</div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text)' }}>
                    Selecciona una Mesa
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Primero selecciona una mesa para poder agregar productos
                  </p>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    borderRadius: '9999px',
                    fontSize: '0.8125rem',
                    fontWeight: 600
                  }}>
                    <span style={{ fontSize: '1rem' }}>👆</span>
                    Usa los botones de arriba
                  </div>
                </div>
              </div>
            )}
            
            {filteredProducts.map(product => (
              <div
                key={product.id}
                className="card"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('🖱️ CLICK en producto:', product.name, '| selectedTable:', selectedTable)
                  if (selectedTable) {
                    addToCart(product)
                  } else {
                    toast.warning('⚠️ Primero selecciona una mesa')
                  }
                }}
                style={{
                  cursor: selectedTable ? 'pointer' : 'not-allowed',
                  padding: isMobile || window.innerWidth <= 1280 ? '1rem' : '1.25rem',
                  opacity: selectedTable ? 1 : 0.6
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ 
                    fontSize: isMobile || window.innerWidth <= 1280 ? '0.875rem' : '1rem', 
                    fontWeight: 600,
                    flex: 1
                  }}>{product.name}</h4>
                  <span style={{ 
                    fontWeight: 700, 
                    color: 'var(--primary)',
                    fontSize: isMobile || window.innerWidth <= 1280 ? '0.925rem' : '1.125rem',
                    marginLeft: isMobile || window.innerWidth <= 1280 ? '0.375rem' : '0.5rem',
                    flexShrink: 0
                  }}>${parseFloat(product.price).toFixed(2)}</span>
                </div>
                <p style={{ 
                  fontSize: isMobile || window.innerWidth <= 1280 ? '0.75rem' : '0.875rem', 
                  color: 'var(--text-secondary)', 
                  marginBottom: isMobile || window.innerWidth <= 1280 ? '0.5rem' : '0.75rem', 
                  minHeight: '30px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {product.description}
                </p>
                <button 
                  className="btn btn-primary" 
                  style={{ 
                    width: '100%',
                    padding: isMobile || window.innerWidth <= 1280 ? '0.625rem' : '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.375rem',
                    fontWeight: 600,
                    fontSize: isMobile || window.innerWidth <= 1280 ? '0.8125rem' : '0.925rem'
                  }}
                >
                  <Plus size={isMobile || window.innerWidth <= 1280 ? 16 : 20} />
                  Agregar
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Carrito - Columna derecha solo en desktop (>1280px) */}
        {!isMobile && window.innerWidth > 1280 && cart.length > 0 && (
          <div style={{ width: '350px', flexShrink: 0 }}>
            <div className="card" style={{ position: 'sticky', top: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>🛒 Orden Actual</h3>
              <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '1rem' }}>
                {cart.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 0',
                      borderBottom: '1px solid var(--border)'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>{item.name}</div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)'
                      }}>${parseFloat(item.price).toFixed(2)} c/u</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <button
                        className="btn btn-outline"
                        style={{
                          padding: '0.25rem',
                          minWidth: '28px',
                          height: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onClick={(e) => { e.stopPropagation(); updateQuantity(index, -1); }}
                      >
                        <Minus size={14} />
                      </button>
                      <span style={{
                        minWidth: '24px',
                        textAlign: 'center',
                        fontWeight: 600,
                        fontSize: '0.875rem'
                      }}>{item.quantity}</span>
                      <button
                        className="btn btn-outline"
                        style={{
                          padding: '0.25rem',
                          minWidth: '28px',
                          height: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onClick={(e) => { e.stopPropagation(); updateQuantity(index, 1); }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      className="btn btn-outline"
                      style={{
                        padding: '0.25rem',
                        minWidth: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onClick={(e) => { e.stopPropagation(); addNoteToItem(index); }}
                    >
                      <StickyNote size={14} />
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{
                        padding: '0.25rem',
                        minWidth: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onClick={(e) => { e.stopPropagation(); removeFromCart(index); }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '2px solid var(--border)', paddingTop: '1rem' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  marginBottom: '1rem'
                }}>
                  <span>Total:</span>
                  <span style={{ color: 'var(--primary)' }}>${cartTotal.toFixed(2)}</span>
                </div>
                
                {activeOrder && (
                  <button
                    className="btn btn-danger btn-lg"
                    style={{
                      width: '100%',
                      padding: '1rem',
                      fontSize: '1rem',
                      marginBottom: '1rem',
                      fontWeight: 600
                    }}
                    onClick={cancelActiveOrder}
                  >
                    🗑️ Cancelar Pedido (${parseFloat(activeOrder.total || 0).toFixed(2)})
                  </button>
                )}
                
                <button
                  className="btn btn-success btn-lg"
                  style={{
                    width: '100%',
                    padding: '1.125rem',
                    fontSize: '1.0625rem'
                  }}
                  onClick={createOrder}
                  disabled={!selectedTable}
                >
                  📤 Enviar a Cocina
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showNotes && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>📝 Agregar Nota</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Producto: <strong>{cart[noteItemIndex]?.name}</strong></p>
            <textarea className="form-control" value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Ej: Sin cebolla, extra salsa..." rows="4" autoFocus />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowNotes(false)}>Cancelar</button>
              <button type="button" className="btn btn-primary" onClick={saveNote}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default POS
