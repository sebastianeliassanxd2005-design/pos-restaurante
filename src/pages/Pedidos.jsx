import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  ShoppingBag, Clock, ChefHat, CheckCircle, Utensils, 
  Search, Filter, Plus, Trash2, Edit, AlertCircle
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
    icon: ChefHat 
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
  const [filtroEstado, setFiltroEstado] = useState(PEDIDOS_ESTADOS.ALL)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [mostrarNuevoPedido, setMostrarNuevoPedido] = useState(false)
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null)

  useEffect(() => {
    fetchPedidos()
    fetchMesas()
    
    // Polling para actualizaciones
    const interval = setInterval(() => {
      fetchPedidos()
      fetchMesas()
    }, 15000) // Cada 15 segundos
    
    return () => clearInterval(interval)
  }, [])

  async function fetchPedidos() {
    try {
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)
      
      let query = supabase
        .from('orders')
        .select('*, tables (name)')
        .gte('created_at', hoy.toISOString())
        .order('created_at', { ascending: false })

      if (filtroEstado !== PEDIDOS_ESTADOS.ALL) {
        query = query.eq('status', filtroEstado)
      }

      const { data, error } = await query

      if (error) throw error
      setPedidos(data || [])
    } catch (error) {
      console.error('Error fetching pedidos:', error)
      toast.error('Error al cargar pedidos')
    } finally {
      setLoading(false)
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

      const estadoLabel = ESTADOS_CONFIG[nuevoEstado]?.label || nuevoEstado
      toast.success(`Pedido actualizado: ${estadoLabel}`)
      fetchPedidos()
    } catch (error) {
      toast.error('Error al actualizar pedido')
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
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => window.location.href = '/pos'}
          style={{display:'flex',alignItems:'center',gap:'0.5rem'}}
        >
          <Plus size={18} />
          Nuevo Pedido
        </button>
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
          <ChefHat size={18} style={{color:'#3b82f6'}} />
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
                  <div style={{display:'flex',gap:'0.5rem'}}>
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
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => cambiarEstado(pedido.id, getNextState(pedido.status))}
                          style={{padding:'0.5rem 1rem',fontSize:'0.8rem'}}
                        >
                          {pedido.status === PEDIDOS_ESTADOS.PENDING && '→ Cocina'}
                          {pedido.status === PEDIDOS_ESTADOS.COOKING && '→ Listo'}
                          {pedido.status === PEDIDOS_ESTADOS.READY && '→ Servir'}
                          {pedido.status === PEDIDOS_ESTADOS.SERVED && '→ Cobrar'}
                        </button>
                      </>
                    )}
                    {pedido.status === PEDIDOS_ESTADOS.PAID && (
                      <span className="badge badge-success" style={{fontSize:'0.7rem'}}>
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
    </div>
  )
}

export default Pedidos
