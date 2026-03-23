import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  ShoppingBag, Clock, CheckCircle, Utensils,
  Search, Plus, AlertCircle, Trash2
} from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

// Estados de pedidos unificados
const PEDIDOS_ESTADOS = {
  ALL: 'all',
  PENDING: 'pending',
  COOKING: 'cooking',
  READY: 'ready',
  SERVED: 'served',
  PAID: 'paid'
}

const ESTADOS_CONFIG = {
  [PEDIDOS_ESTADOS.PENDING]: { 
    label: 'Pendiente', 
    color: '#f59e0b', 
    bg: '#fef3c7',
    icon: Clock 
  },
  [PEDIDOS_ESTADOS.COOKING]: {
    label: 'En Cocina',
    color: '#3b82f6',
    bg: '#dbeafe',
    icon: CheckCircle
  },
  [PEDIDOS_ESTADOS.READY]: { 
    label: 'Listo', 
    color: '#22c55e', 
    bg: '#dcfce7',
    icon: CheckCircle 
  },
  [PEDIDOS_ESTADOS.SERVED]: { 
    label: 'Servido', 
    color: '#64748b', 
    bg: '#f1f5f9',
    icon: Utensils 
  },
  [PEDIDOS_ESTADOS.PAID]: { 
    label: 'Pagado', 
    color: '#22c55e', 
    bg: '#dcfce7',
    icon: CheckCircle 
  }
}

function Pedidos() {
  const { profile } = useAuth()
  const toast = useToast()

  const [pedidos, setPedidos] = useState([])
  const [mesas, setMesas] = useState([])
  const [mesasDelMesero, setMesasDelMesero] = useState([])  // Mesas asignadas al mesero seleccionado
  const [waiters, setWaiters] = useState([])  // Lista de meseros (para admin)
  const [selectedWaiter, setSelectedWaiter] = useState('all')  // Filtro por mesero
  const [filtroEstado, setFiltroEstado] = useState(PEDIDOS_ESTADOS.ALL)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [mostrarNuevoPedido, setMostrarNuevoPedido] = useState(false)
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null)
  
  // Estados para editar pedido
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  const [editingItems, setEditingItems] = useState([])
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [editQuantity, setEditQuantity] = useState(1)
  const [editNotes, setEditNotes] = useState('')

  useEffect(() => {
    fetchPedidos()
    fetchMesas()
    if (profile?.role === 'admin') {
      fetchWaiters()
    }

    // Polling para actualizaciones
    const interval = setInterval(() => {
      fetchPedidos()
      fetchMesas()
      if (profile?.role === 'admin' && selectedWaiter !== 'all') {
        fetchMesasDelMesero()
      }
    }, 15000) // Cada 15 segundos

    return () => clearInterval(interval)
  }, [filtroEstado, selectedWaiter]) // Se re-ejecuta cuando cambia el filtro de estado o mesero

  async function fetchMesasDelMesero() {
    try {
      // Obtener mesas asignadas al mesero seleccionado (ocupadas o disponibles)
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .eq('waiter_id', selectedWaiter)
        .order('name')

      if (error) throw error
      setMesasDelMesero(data || [])
    } catch (error) {
      console.error('Error fetching mesas del mesero:', error)
    }
  }

  async function fetchPedidos() {
    try {
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)

      // Construir query base
      let query = supabase
        .from('orders')
        .select('*, tables (name), profiles (full_name)')  // Obtener nombre del mesero
        .gte('created_at', hoy.toISOString())
        .order('created_at', { ascending: false })

      // Si es admin y hay un mesero seleccionado, filtrar por ese mesero
      if (profile?.role === 'admin' && selectedWaiter !== 'all') {
        query = query.eq('waiter_id', selectedWaiter)
      }
      // NOTA: Los meseros ven todos los pedidos por ahora
      // Cuando el sistema esté migrado, descomentar esto:
      // if (profile?.role === 'waiter') {
      //   query = query.eq('waiter_id', profile.id)
      // }

      const { data, error } = await query

      if (error) throw error

      // Filtrar por estado seleccionado (solo si no es 'all')
      let pedidosData = data || []
      if (filtroEstado !== PEDIDOS_ESTADOS.ALL) {
        pedidosData = pedidosData.filter(pedido => pedido.status === filtroEstado)
      }

      setPedidos(pedidosData)
    } catch (error) {
      console.error('Error fetching pedidos:', error)
      toast.error('Error al cargar pedidos')
    } finally {
      setLoading(false)
    }
  }

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

  async function fetchMesas() {
    try {
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .order('name')

      if (error) throw error
      setMesas(data || [])
    } catch (error) {
      console.error('Error fetching mesas:', error)
    }
  }

  async function cambiarEstado(pedidoId, nuevoEstado) {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: nuevoEstado })
        .eq('id', pedidoId)

      if (error) throw error

      // Actualizar localmente el estado del pedido inmediatamente
      setPedidos(prev => prev.map(p =>
        p.id === pedidoId ? { ...p, status: nuevoEstado } : p
      ))

      const estadoLabel = ESTADOS_CONFIG[nuevoEstado]?.label || nuevoEstado
      toast.success(`Pedido actualizado: ${estadoLabel}`)

      // Recargar para asegurar consistencia
      await fetchPedidos()
    } catch (error) {
      toast.error('Error al actualizar pedido')
    }
  }

  async function openEditModal(pedido) {
    try {
      setEditingOrder(pedido)
      
      // Cargar items existentes del pedido
      const { data: itemsData } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', pedido.id)
      
      setEditingItems(itemsData || [])
      
      // Cargar productos disponibles
      await fetchProducts()
      
      setShowEditModal(true)
    } catch (error) {
      toast.error('Error al cargar pedido: ' + error.message)
    }
  }

  async function fetchProducts() {
    try {
      const { data } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('available', true)
        .order('name')
      
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  function addProductToEdit() {
    if (!selectedProduct || editQuantity < 1) {
      toast.warning('Selecciona un producto y cantidad')
      return
    }

    // Verificar si el producto ya existe en el pedido
    const existingIndex = editingItems.findIndex(
      item => item.product_id === selectedProduct.id && item.notes === editNotes
    )

    if (existingIndex !== -1) {
      // Si ya existe, aumentar la cantidad
      const newItems = [...editingItems]
      newItems[existingIndex].quantity += editQuantity
      newItems[existingIndex].subtotal = newItems[existingIndex].unit_price * newItems[existingIndex].quantity
      setEditingItems(newItems)
      toast.success(`Cantidad aumentada a ${newItems[existingIndex].quantity}`)
    } else {
      // Si no existe, agregar nuevo item
      const newItem = {
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity: editQuantity,
        unit_price: parseFloat(selectedProduct.price),
        subtotal: parseFloat(selectedProduct.price) * editQuantity,
        notes: editNotes,
        status: 'pending'
      }
      setEditingItems([...editingItems, newItem])
      toast.success('Producto agregado al pedido')
    }
    
    setSelectedProduct(null)
    setEditQuantity(1)
    setEditNotes('')
  }

  function removeProductFromEdit(index) {
    const newItems = editingItems.filter((_, i) => i !== index)
    setEditingItems(newItems)
    toast.success('Producto eliminado')
  }

  function updateItemQuantity(index, delta) {
    const newItems = [...editingItems]
    const newQuantity = newItems[index].quantity + delta
    
    // Límite máximo: 99 unidades
    if (newQuantity > 99) {
      toast.warning('Cantidad máxima: 99 unidades')
      return
    }
    
    // Límite mínimo: 1 unidad (no debería llegar aquí porque el botón está deshabilitado)
    if (newQuantity < 1) {
      return
    }
    
    newItems[index].quantity = newQuantity
    newItems[index].subtotal = newItems[index].unit_price * newQuantity
    setEditingItems(newItems)
  }

  async function saveEditedOrder() {
    if (editingItems.length === 0) {
      toast.warning('El pedido debe tener al menos un producto')
      return
    }

    try {
      // Calcular nuevo total
      const newTotal = editingItems.reduce((sum, item) => sum + item.subtotal, 0)

      // Actualizar orden
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          total: newTotal,
          status: 'pending'  // Vuelve a pendiente para que cocina revise
        })
        .eq('id', editingOrder.id)

      if (orderError) throw orderError

      // Eliminar items existentes
      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', editingOrder.id)

      if (deleteError) throw deleteError

      // Insertar nuevos items
      const itemsToInsert = editingItems.map(item => ({
        order_id: editingOrder.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        notes: item.notes,
        status: 'pending'
      }))

      const { error: insertError } = await supabase
        .from('order_items')
        .insert(itemsToInsert)

      if (insertError) throw insertError

      toast.success('Pedido actualizado - Cocina notificada')
      setShowEditModal(false)
      setEditingOrder(null)
      setEditingItems([])
      await fetchPedidos()
    } catch (error) {
      toast.error('Error al actualizar pedido: ' + error.message)
    }
  }

  function getNextState(currentState) {
    const flow = [
      PEDIDOS_ESTADOS.PENDING,
      PEDIDOS_ESTADOS.COOKING,
      PEDIDOS_ESTADOS.READY,
      PEDIDOS_ESTADOS.SERVED,
      PEDIDOS_ESTADOS.PAID
    ]
    const currentIndex = flow.indexOf(currentState)
    return flow[currentIndex + 1] || currentState
  }

  function getPreviousState(currentState) {
    const flow = [
      PEDIDOS_ESTADOS.PENDING,
      PEDIDOS_ESTADOS.COOKING,
      PEDIDOS_ESTADOS.READY,
      PEDIDOS_ESTADOS.SERVED,
      PEDIDOS_ESTADOS.PAID
    ]
    const currentIndex = flow.indexOf(currentState)
    return flow[currentIndex - 1] || currentState
  }

  const pedidosFiltrados = pedidos.filter(pedido => {
    const matchSearch = searchTerm === '' || 
      pedido.tables?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pedido.id.toString().includes(searchTerm)
    
    return matchSearch
  })

  const stats = {
    total: pedidos.length,
    pendientes: pedidos.filter(p => p.status === PEDIDOS_ESTADOS.PENDING).length,
    cocina: pedidos.filter(p => p.status === PEDIDOS_ESTADOS.COOKING).length,
    listos: pedidos.filter(p => p.status === PEDIDOS_ESTADOS.READY).length,
    servidos: pedidos.filter(p => p.status === PEDIDOS_ESTADOS.SERVED).length
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
            <ShoppingBag size={24} style={{color:'var(--primary)'}} />
            Pedidos
          </h2>
          <p style={{color:'var(--text-secondary)',fontSize:'0.875rem'}}>
            Gestiona todos los pedidos del día
          </p>
          {profile?.role === 'admin' && (
            <p style={{fontSize:'0.75rem',color:'var(--text-secondary)',marginTop:'0.25rem'}}>
              {selectedWaiter === 'all' ? '📋 Mostrando todos los meseros' : `👤 Filtrando por mesero`}
            </p>
          )}
        </div>
        <div style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
          {/* Filtro por mesero (solo admin) */}
          {profile?.role === 'admin' && (
            <select
              className="form-control"
              style={{width:'auto',fontSize:'0.875rem'}}
              value={selectedWaiter}
              onChange={(e) => setSelectedWaiter(e.target.value)}
            >
              <option value="all">Todos los meseros</option>
              {waiters.map(waiter => (
                <option key={waiter.id} value={waiter.id}>{waiter.full_name || waiter.email}</option>
              ))}
            </select>
          )}
          <button
            className="btn btn-primary"
            onClick={() => window.location.href = '/pos'}
            style={{display:'flex',alignItems:'center',gap:'0.5rem'}}
          >
            <Plus size={18} />
            Nuevo Pedido
          </button>
        </div>
      </div>

      {/* Stats Rápidas */}
      <div style={{
        display:'flex',
        gap:'0.75rem',
        marginBottom:'1.5rem',
        flexWrap:'wrap'
      }}>
        <div style={{
          padding:'0.75rem 1rem',
          background:'var(--surface)',
          borderRadius:'8px',
          display:'flex',
          alignItems:'center',
          gap:'0.5rem',
          boxShadow:'0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <ShoppingBag size={18} style={{color:'var(--text-secondary)'}} />
          <span style={{fontWeight:600}}>{stats.total}</span>
          <span style={{fontSize:'0.75rem',color:'var(--text-secondary)'}}>Total</span>
        </div>
        <div style={{
          padding:'0.75rem 1rem',
          background:'#fef3c7',
          borderRadius:'8px',
          display:'flex',
          alignItems:'center',
          gap:'0.5rem'
        }}>
          <Clock size={18} style={{color:'#f59e0b'}} />
          <span style={{fontWeight:600,color:'#f59e0b'}}>{stats.pendientes}</span>
          <span style={{fontSize:'0.75rem',color:'#92400e'}}>Pendientes</span>
        </div>
        <div style={{
          padding:'0.75rem 1rem',
          background:'#dbeafe',
          borderRadius:'8px',
          display:'flex',
          alignItems:'center',
          gap:'0.5rem'
        }}>
          <Clock size={18} style={{color:'#3b82f6'}} />
          <span style={{fontWeight:600,color:'#3b82f6'}}>{stats.cocina}</span>
          <span style={{fontSize:'0.75rem',color:'#1e40af'}}>Cocina</span>
        </div>
        <div style={{
          padding:'0.75rem 1rem',
          background:'#dcfce7',
          borderRadius:'8px',
          display:'flex',
          alignItems:'center',
          gap:'0.5rem'
        }}>
          <CheckCircle size={18} style={{color:'#22c55e'}} />
          <span style={{fontWeight:600,color:'#22c55e'}}>{stats.listos}</span>
          <span style={{fontSize:'0.75rem',color:'#166534'}}>Listos</span>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="card" style={{marginBottom:'1.5rem',padding:'1rem'}}>
        <div style={{display:'flex',gap:'1rem',flexWrap:'wrap',alignItems:'center'}}>
          {/* Filtro por estado */}
          <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
            <button
              className={`btn ${filtroEstado === PEDIDOS_ESTADOS.ALL ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFiltroEstado(PEDIDOS_ESTADOS.ALL)}
              style={{fontSize:'0.8rem',padding:'0.5rem 0.875rem'}}
            >
              Todos
            </button>
            {Object.entries(PEDIDOS_ESTADOS).filter(([key]) => key !== 'ALL').map(([key, value]) => {
              const config = ESTADOS_CONFIG[value]
              const Icon = config.icon
              return (
                <button
                  key={value}
                  className={`btn ${filtroEstado === value ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setFiltroEstado(value)}
                  style={{fontSize:'0.8rem',padding:'0.5rem 0.875rem',display:'flex',alignItems:'center',gap:'0.375rem'}}
                >
                  <Icon size={14} />
                  {config.label}
                </button>
              )
            })}
          </div>

          {/* Búsqueda */}
          <div style={{flex:1,minWidth:'200px',position:'relative'}}>
            <Search size={16} style={{position:'absolute',left:'0.75rem',top:'50%',transform:'translateY(-50%)',color:'var(--text-secondary)'}} />
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por mesa o #pedido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{paddingLeft:'2.25rem',fontSize:'0.875rem'}}
            />
          </div>
        </div>
      </div>

      {/* Lista de Pedidos */}
      {pedidosFiltrados.length > 0 ? (
        <div style={{display:'grid',gap:'1rem'}}>
          {pedidosFiltrados.map((pedido) => {
            const estadoConfig = ESTADOS_CONFIG[pedido.status] || ESTADOS_CONFIG[PEDIDOS_ESTADOS.PENDING]
            const EstadoIcon = estadoConfig.icon
            
            return (
              <div 
                key={pedido.id}
                className="card"
                style={{
                  padding:'1rem',
                  borderLeft:`4px solid ${estadoConfig.color}`,
                  background: `linear-gradient(90deg, ${estadoConfig.bg}20 0%, transparent 100%)`
                }}
              >
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'1rem',flexWrap:'wrap'}}>
                  {/* Info Principal */}
                  <div style={{display:'flex',alignItems:'center',gap:'1rem',flex:1}}>
                    <div style={{
                      width:48,
                      height:48,
                      borderRadius:'8px',
                      background: estadoConfig.bg,
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center'
                    }}>
                      <EstadoIcon size={24} style={{color: estadoConfig.color}} />
                    </div>
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.25rem'}}>
                        <span style={{fontWeight:700,fontSize:'1rem'}}>
                          Mesa {pedido.tables?.name || 'N/A'}
                        </span>
                        <span className={`badge ${estadoConfig.bg.replace('#', 'badge-')}`} style={{
                          background: estadoConfig.bg,
                          color: estadoConfig.color,
                          fontSize:'0.65rem',
                          fontWeight:600
                        }}>
                          {estadoConfig.label}
                        </span>
                      </div>
                      <div style={{fontSize:'0.75rem',color:'var(--text-secondary)'}}>
                        #{pedido.id} • {new Date(pedido.created_at).toLocaleTimeString('es-ES', {hour:'2-digit',minute:'2-digit'})}
                        {pedido.items?.length > 0 && ` • ${pedido.items.length} items`}
                        {pedido.profiles?.full_name && (
                          <span style={{marginLeft:'0.5rem',color:'#64748b'}}>
                            👤 {pedido.profiles.full_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Total */}
                  <div style={{textAlign:'right'}}>
                    <div style={{fontWeight:700,fontSize:'1.25rem',color:'var(--primary)'}}>
                      ${parseFloat(pedido.total || 0).toFixed(2)}
                    </div>
                    {pedido.notes && (
                      <div style={{fontSize:'0.7rem',color:'var(--text-secondary)',maxWidth:'150px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        📝 {pedido.notes}
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
                    {/* Botón Editar - Solo visible para pedidos en estado pendiente o cocina */}
                    {(pedido.status === PEDIDOS_ESTADOS.PENDING || pedido.status === PEDIDOS_ESTADOS.COOKING) && (
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => openEditModal(pedido)}
                        style={{padding:'0.5rem 0.75rem',fontSize:'0.75rem'}}
                        title="Editar pedido"
                      >
                        ✏️ Editar
                      </button>
                    )}
                    
                    {/* Mensaje para pedidos no editables */}
                    {(pedido.status === PEDIDOS_ESTADOS.READY || pedido.status === PEDIDOS_ESTADOS.SERVED || pedido.status === PEDIDOS_ESTADOS.PAID) && (
                      <span style={{fontSize:'0.7rem',color:'var(--text-secondary)',fontStyle:'italic',alignSelf:'center'}}>
                        🔒 No editable
                      </span>
                    )}
                    
                    {pedido.status !== PEDIDOS_ESTADOS.PAID && (
                      <>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => cambiarEstado(pedido.id, getPreviousState(pedido.status))}
                          disabled={pedido.status === PEDIDOS_ESTADOS.PENDING}
                          style={{padding:'0.5rem',minWidth:'36px'}}
                          title="Estado anterior"
                        >
                          ←
                        </button>
                        {pedido.status === PEDIDOS_ESTADOS.SERVED ? (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => {
                              // Redirigir a Caja para procesar el pago
                              window.location.href = `/caja?orderId=${pedido.id}&tableId=${pedido.table_id}`
                            }}
                            style={{padding:'0.5rem 1rem',fontSize:'0.8rem'}}
                          >
                            💵 Cobrar
                          </button>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => cambiarEstado(pedido.id, getNextState(pedido.status))}
                            style={{padding:'0.5rem 1rem',fontSize:'0.8rem'}}
                          >
                            {pedido.status === PEDIDOS_ESTADOS.PENDING && '→ Cocina'}
                            {pedido.status === PEDIDOS_ESTADOS.COOKING && '→ Listo'}
                            {pedido.status === PEDIDOS_ESTADOS.READY && '→ Servir'}
                          </button>
                        )}
                      </>
                    )}
                    {pedido.status === PEDIDOS_ESTADOS.PAID && (
                      <span className="badge badge-success" style={{fontSize:'0.75rem'}}>
                        ✓ Completado
                      </span>
                    )}
                  </div>
                </div>

                {/* Items del pedido (expandible) */}
                {pedidoSeleccionado === pedido.id && pedido.items && (
                  <div style={{
                    marginTop:'1rem',
                    paddingTop:'1rem',
                    borderTop:'1px solid var(--border)',
                    display:'grid',
                    gap:'0.5rem'
                  }}>
                    {pedido.items.map((item, idx) => (
                      <div key={idx} style={{display:'flex',justifyContent:'space-between',fontSize:'0.875rem'}}>
                        <span>
                          <span style={{fontWeight:600,color:'var(--primary)'}}>{item.quantity}x</span>
                          {' '}{item.product_name}
                          {item.special_instructions && (
                            <span style={{fontSize:'0.75rem',color:'var(--text-secondary)',display:'block'}}>
                              📝 {item.special_instructions}
                            </span>
                          )}
                        </span>
                        <span style={{color:'var(--text-secondary)'}}>
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state" style={{padding:'3rem 1rem'}}>
            <ShoppingBag size={48} style={{opacity:0.3,marginBottom:'1rem'}} />
            <h3 style={{marginBottom:'0.5rem'}}>No hay pedidos</h3>
            <p style={{color:'var(--text-secondary)',marginBottom:'1rem'}}>
              {filtroEstado === PEDIDOS_ESTADOS.ALL
                ? 'No hay pedidos registrados hoy'
                : `No hay pedidos ${ESTADOS_CONFIG[filtroEstado]?.label?.toLowerCase()}`}
            </p>
            <button
              className="btn btn-primary"
              onClick={() => window.location.href = '/pos'}
              style={{display:'flex',alignItems:'center',gap:'0.5rem',margin:'0 auto'}}
            >
              <Plus size={18} />
              Crear Primer Pedido
            </button>
          </div>
        </div>
      )}

      {/* Mesas del Mesero Seleccionado (solo admin cuando filtra por mesero) */}
      {profile?.role === 'admin' && selectedWaiter !== 'all' && mesasDelMesero.length > 0 && (
        <div className="card" style={{marginTop:'1.5rem'}}>
          <h3 style={{fontSize:'1.0625rem',marginBottom:'1rem',display:'flex',alignItems:'center',gap:'0.5rem'}}>
            <Utensils size={20} style={{color:'#dc2626'}} />
            Mesas Asignadas a este Mesero
            <span style={{
              padding:'0.25rem 0.75rem',
              background:'#fee2e2',
              color:'#991b1b',
              borderRadius:'9999px',
              fontSize:'0.75rem',
              fontWeight:700
            }}>{mesasDelMesero.length}</span>
          </h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))',gap:'0.75rem'}}>
            {mesasDelMesero.map((mesa) => (
              <div
                key={mesa.id}
                style={{
                  padding:'1rem',
                  background: mesa.status === 'occupied' ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' :
                             mesa.status === 'reserved' ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' :
                             'var(--background)',
                  borderRadius:'8px',
                  border: mesa.status === 'occupied' ? '2px solid #dc2626' :
                         mesa.status === 'reserved' ? '2px solid #3b82f6' :
                         '1px solid var(--border)',
                  textAlign:'center'
                }}
              >
                <div style={{
                  width:40,
                  height:40,
                  borderRadius:'50%',
                  background: mesa.status === 'occupied' ? '#dc2626' :
                             mesa.status === 'reserved' ? '#3b82f6' :
                             'var(--border)',
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'center',
                  color: mesa.status === 'occupied' || mesa.status === 'reserved' ? 'white' : 'var(--text-secondary)',
                  fontWeight:700,
                  fontSize:'0.875rem',
                  margin:'0 auto 0.5rem'
                }}>
                  {mesa.name.replace('Mesa ','')}
                </div>
                <span className={`badge ${
                  mesa.status === 'occupied' ? 'badge-danger' :
                  mesa.status === 'reserved' ? 'badge-info' :
                  'badge-secondary'
                }`} style={{fontSize:'0.65rem'}}>
                  {mesa.status === 'occupied' ? 'Ocupada' :
                   mesa.status === 'reserved' ? 'Reservada' :
                   'Disponible'}
                </span>
                {mesa.status === 'occupied' && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => window.location.href = `/pos?table=${mesa.id}`}
                    style={{marginTop:'0.5rem',fontSize:'0.7rem',padding:'0.25rem 0.5rem'}}
                  >
                    Nuevo Pedido
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal para editar pedido */}
      {showEditModal && editingOrder && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '700px', maxHeight: '90vh', overflow: 'auto'}}>
            <h3 style={{marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              ✏️ Editar Pedido
              <span style={{fontSize: '0.875rem', color: 'var(--text-secondary)'}}>
                - Mesa {editingOrder.tables?.name || 'N/A'}
              </span>
            </h3>
            
            {/* Estado actual del pedido */}
            <div style={{
              padding: '0.75rem',
              background: '#fef3c7',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={18} style={{color: '#f59e0b'}} />
              <span style={{color: '#92400e', fontWeight: 600}}>
                Al editar, el pedido volverá a "Pendiente" y cocina será notificada
              </span>
            </div>

            {/* Agregar nuevos productos */}
            <div style={{
              padding: '1rem',
              background: 'var(--background)',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem'
            }}>
              <h4 style={{fontSize: '0.875rem', marginBottom: '1rem', fontWeight: 600}}>Agregar Producto</h4>
              <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end'}}>
                <div style={{flex: 2, minWidth: '200px'}}>
                  <label style={{fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block'}}>Producto</label>
                  <select
                    className="form-control"
                    value={selectedProduct?.id || ''}
                    onChange={(e) => {
                      const prod = products.find(p => p.id === e.target.value)
                      setSelectedProduct(prod)
                    }}
                    style={{fontSize: '0.875rem'}}
                  >
                    <option value="">Seleccionar producto...</option>
                    {products.map(prod => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} - ${parseFloat(prod.price).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{flex: 1, minWidth: '120px'}}>
                  <label style={{fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block'}}>Cantidad</label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    background: 'var(--background)',
                    borderRadius: '0.375rem',
                    padding: '0.25rem',
                    width: '100%'
                  }}>
                    <button
                      className="btn btn-sm"
                      onClick={() => setEditQuantity(Math.max(editQuantity - 1, 1))}
                      disabled={editQuantity === 1}
                      style={{
                        padding: '0.25rem 0.5rem',
                        minWidth: '32px',
                        fontWeight: 700,
                        fontSize: '1rem',
                        opacity: editQuantity === 1 ? 0.4 : 1,
                        cursor: editQuantity === 1 ? 'not-allowed' : 'pointer',
                        background: editQuantity === 1 ? '#e2e8f0' : 'transparent',
                        borderColor: editQuantity === 1 ? '#cbd5e1' : 'var(--border)',
                        color: editQuantity === 1 ? '#94a3b8' : 'var(--text)'
                      }}
                    >
                      −
                    </button>
                    <span style={{
                      minWidth: '24px',
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: '0.925rem',
                      color: 'var(--primary)'
                    }}>
                      {editQuantity}
                    </span>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setEditQuantity(Math.min(editQuantity + 1, 99))}
                      disabled={editQuantity >= 99}
                      style={{
                        padding: '0.25rem 0.5rem',
                        minWidth: '32px',
                        fontWeight: 700,
                        fontSize: '1rem',
                        opacity: editQuantity >= 99 ? 0.5 : 1,
                        cursor: editQuantity >= 99 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={addProductToEdit}
                  style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}
                >
                  <Plus size={16} />
                  Agregar
                </button>
              </div>
              <div style={{marginTop: '0.75rem'}}>
                <label style={{fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block'}}>Notas (opcional)</label>
                <input
                  type="text"
                  className="form-control"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Ej: Sin cebolla, bien cocido..."
                  style={{fontSize: '0.875rem'}}
                />
              </div>
            </div>

            {/* Items actuales del pedido */}
            <div style={{marginBottom: '1.5rem'}}>
              <h4 style={{fontSize: '0.875rem', marginBottom: '1rem', fontWeight: 600}}>
                Productos en el Pedido ({editingItems.length})
              </h4>
              {editingItems.length > 0 ? (
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                  {editingItems.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.75rem',
                        background: 'white',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)'
                      }}
                    >
                      {/* Botones - y + para cantidad */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        background: 'var(--background)',
                        borderRadius: '0.375rem',
                        padding: '0.25rem'
                      }}>
                        <button
                          className="btn btn-sm"
                          onClick={() => updateItemQuantity(index, -1)}
                          disabled={item.quantity === 1}
                          style={{
                            padding: '0.25rem 0.5rem',
                            minWidth: '32px',
                            fontWeight: 700,
                            fontSize: '1rem',
                            opacity: item.quantity === 1 ? 0.4 : 1,
                            cursor: item.quantity === 1 ? 'not-allowed' : 'pointer',
                            background: item.quantity === 1 ? '#e2e8f0' : 'transparent',
                            borderColor: item.quantity === 1 ? '#cbd5e1' : 'var(--border)',
                            color: item.quantity === 1 ? '#94a3b8' : 'var(--text)'
                          }}
                        >
                          −
                        </button>
                        <span style={{
                          minWidth: '24px',
                          textAlign: 'center',
                          fontWeight: 700,
                          fontSize: '0.925rem',
                          color: 'var(--primary)'
                        }}>
                          {item.quantity}
                        </span>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => updateItemQuantity(index, 1)}
                          disabled={item.quantity >= 99}
                          style={{
                            padding: '0.25rem 0.5rem',
                            minWidth: '32px',
                            fontWeight: 700,
                            fontSize: '1rem',
                            opacity: item.quantity >= 99 ? 0.5 : 1,
                            cursor: item.quantity >= 99 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          +
                        </button>
                      </div>
                      
                      <div style={{flex: 1}}>
                        <div style={{fontWeight: 600, fontSize: '0.875rem'}}>{item.product_name}</div>
                        {item.notes && (
                          <div style={{fontSize: '0.75rem', color: '#f59e0b', fontStyle: 'italic'}}>
                            📝 {item.notes}
                          </div>
                        )}
                      </div>
                      <div style={{fontWeight: 700, color: 'var(--primary)'}}>
                        ${item.subtotal.toFixed(2)}
                      </div>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => removeProductFromEdit(index)}
                        style={{padding: '0.375rem 0.5rem'}}
                        title="Eliminar producto"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{padding: '2rem 1rem'}}>
                  <ShoppingBag size={40} style={{opacity: 0.3, marginBottom: '0.5rem'}} />
                  <p style={{color: 'var(--text-secondary)'}}>No hay productos en el pedido</p>
                </div>
              )}
            </div>

            {/* Total */}
            <div style={{
              padding: '1rem',
              background: 'var(--background)',
              borderRadius: '0.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <span style={{fontWeight: 600, fontSize: '1rem'}}>Total del Pedido:</span>
              <span style={{fontWeight: 700, fontSize: '1.5rem', color: 'var(--primary)'}}>
                ${editingItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)}
              </span>
            </div>

            {/* Botones de acción */}
            <div style={{display: 'flex', gap: '0.5rem', justifyContent: 'flex-end'}}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowEditModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={saveEditedOrder}
                style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}
              >
                <CheckCircle size={16} />
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Pedidos
