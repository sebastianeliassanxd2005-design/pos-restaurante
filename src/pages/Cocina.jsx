import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  ChefHat, Clock, AlertCircle, CheckCircle, Utensils, 
  Bell, Filter, TrendingUp, Calendar
} from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

function Cocina() {
  const { profile } = useAuth()
  const toast = useToast()
  
  const [ordenes, setOrdenes] = useState([])
  const [filtro, setFiltro] = useState('all') // all, pending, cooking
  const [loading, setLoading] = useState(true)
  const [ordenExpandida, setOrdenExpandida] = useState(null)

  useEffect(() => {
    fetchOrdenes()
    
    // Polling cada 10 segundos para actualizaciones en tiempo real
    const interval = setInterval(fetchOrdenes, 10000)
    return () => clearInterval(interval)
  }, [filtro])

  async function fetchOrdenes() {
    try {
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)
      
      let query = supabase
        .from('orders')
        .select('*, tables (name), order_items (*)')
        .gte('created_at', hoy.toISOString())
        .in('status', ['pending', 'cooking', 'ready'])
        .order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error
      
      // Filtrar por estado si no es 'all'
      let ordenesData = data || []
      if (filtro !== 'all') {
        ordenesData = ordenesData.filter(o => o.status === filtro)
      }
      
      setOrdenes(ordenesData)
    } catch (error) {
      console.error('Error fetching ordenes:', error)
      toast.error('Error al cargar órdenes de cocina')
    } finally {
      setLoading(false)
    }
  }

  async function cambiarEstado(ordenId, nuevoEstado) {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: nuevoEstado })
        .eq('id', ordenId)

      if (error) throw error

      const estadoLabel = nuevoEstado === 'cooking' ? 'En Cocina' : 
                         nuevoEstado === 'ready' ? 'Listo' : 'Pendiente'
      toast.success(`Orden actualizada: ${estadoLabel}`)
      
      // Actualizar localmente
      setOrdenes(prev => prev.map(o => 
        o.id === ordenId ? { ...o, status: nuevoEstado } : o
      ))
      
      // Recargar para asegurar consistencia
      await fetchOrdenes()
    } catch (error) {
      toast.error('Error al actualizar orden')
    }
  }

  function getTiempoTranscurrido(createdAt) {
    const ahora = new Date()
    const creado = new Date(createdAt)
    const diffMin = Math.floor((ahora - creado) / 60000)
    
    if (diffMin < 5) return { text: `${diffMin} min`, color: '#22c55e' }
    if (diffMin < 10) return { text: `${diffMin} min`, color: '#f59e0b' }
    return { text: `${diffMin} min`, color: '#dc2626' }
  }

  function getPrioridad(orden) {
    const tiempo = getTiempoTranscurrido(orden.created_at)
    const diffMin = parseInt(tiempo.text)
    
    if (diffMin >= 15) return 'urgente'
    if (diffMin >= 10) return 'alta'
    if (diffMin >= 5) return 'media'
    return 'normal'
  }

  const stats = {
    total: ordenes.length,
    pendientes: ordenes.filter(o => o.status === 'pending').length,
    cocina: ordenes.filter(o => o.status === 'cooking').length,
    listos: ordenes.filter(o => o.status === 'ready').length
  }

  if (loading && ordenes.length === 0) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header" style={{marginBottom:'1.5rem'}}>
        <div>
          <h2 style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
            }}>
              <ChefHat size={22} style={{color:'white'}} />
            </div>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                <span>👨‍🍳 Cocina</span>
                <span style={{
                  padding:'0.25rem 0.75rem',
                  background:'#fef3c7',
                  color:'#92400e',
                  borderRadius:'9999px',
                  fontSize:'0.7rem',
                  fontWeight:700
                }}>
                  {stats.total} Órdenes
                </span>
              </div>
              <p style={{fontSize:'0.875rem',color:'var(--text-secondary)',marginTop:'0.25rem'}}>
                Gestiona las órdenes de la cocina
              </p>
            </div>
          </h2>
        </div>
        <button 
          className="btn btn-outline" 
          onClick={fetchOrdenes}
          style={{display:'flex',alignItems:'center',gap:'0.5rem'}}
        >
          <TrendingUp size={18} />
          Actualizar
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))',
        gap:'1rem',
        marginBottom:'1.5rem'
      }}>
        <div style={{
          padding:'1rem',
          background:'white',
          borderRadius:'10px',
          border:'1px solid #e2e8f0',
          boxShadow:'0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.5rem'}}>
            <div style={{width:32,height:32,borderRadius:'8px',background:'#fef3c7',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Clock size={18} style={{color:'#f59e0b'}} />
            </div>
            <span style={{fontSize:'0.75rem',color:'#64748b',fontWeight:600}}>Totales</span>
          </div>
          <div style={{fontSize:'1.75rem',fontWeight:700,color:'#1e293b'}}>{stats.total}</div>
        </div>

        <div style={{
          padding:'1rem',
          background:'white',
          borderRadius:'10px',
          border:'1px solid #e2e8f0',
          boxShadow:'0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.5rem'}}>
            <div style={{width:32,height:32,borderRadius:'8px',background:'#fee2e2',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <AlertCircle size={18} style={{color:'#dc2626'}} />
            </div>
            <span style={{fontSize:'0.75rem',color:'#64748b',fontWeight:600}}>Pendientes</span>
          </div>
          <div style={{fontSize:'1.75rem',fontWeight:700,color:'#dc2626'}}>{stats.pendientes}</div>
        </div>

        <div style={{
          padding:'1rem',
          background:'white',
          borderRadius:'10px',
          border:'1px solid #e2e8f0',
          boxShadow:'0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.5rem'}}>
            <div style={{width:32,height:32,borderRadius:'8px',background:'#dbeafe',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <ChefHat size={18} style={{color:'#3b82f6'}} />
            </div>
            <span style={{fontSize:'0.75rem',color:'#64748b',fontWeight:600}}>En Preparación</span>
          </div>
          <div style={{fontSize:'1.75rem',fontWeight:700,color:'#3b82f6'}}>{stats.cocina}</div>
        </div>

        <div style={{
          padding:'1rem',
          background:'white',
          borderRadius:'10px',
          border:'1px solid #e2e8f0',
          boxShadow:'0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.5rem'}}>
            <div style={{width:32,height:32,borderRadius:'8px',background:'#dcfce7',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <CheckCircle size={18} style={{color:'#22c55e'}} />
            </div>
            <span style={{fontSize:'0.75rem',color:'#64748b',fontWeight:600}}>Listas</span>
          </div>
          <div style={{fontSize:'1.75rem',fontWeight:700,color:'#22c55e'}}>{stats.listos}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{marginBottom:'1.5rem',padding:'0.75rem'}}>
        <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
          <button
            className={`btn ${filtro === 'all' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFiltro('all')}
            style={{fontSize:'0.8rem',padding:'0.5rem 1rem'}}
          >
            Todas
          </button>
          <button
            className={`btn ${filtro === 'pending' ? 'btn-warning' : 'btn-outline'}`}
            onClick={() => setFiltro('pending')}
            style={{fontSize:'0.8rem',padding:'0.5rem 1rem',display:'flex',alignItems:'center',gap:'0.375rem'}}
          >
            <AlertCircle size={16} />
            Pendientes
          </button>
          <button
            className={`btn ${filtro === 'cooking' ? 'btn-info' : 'btn-outline'}`}
            onClick={() => setFiltro('cooking')}
            style={{fontSize:'0.8rem',padding:'0.5rem 1rem',display:'flex',alignItems:'center',gap:'0.375rem'}}
          >
            <ChefHat size={16} />
            En Cocina
          </button>
        </div>
      </div>

      {/* Alertas de órdenes urgentes */}
      {ordenes.some(o => getPrioridad(o) === 'urgente') && (
        <div style={{
          padding:'1rem 1.25rem',
          background:'linear-gradient(90deg, #fef2f2 0%, #fee2e2 100%)',
          border:'1px solid #fecaca',
          borderRadius:'10px',
          marginBottom:'1.5rem',
          display:'flex',
          alignItems:'center',
          gap:'0.75rem'
        }}>
          <AlertCircle size={24} style={{color:'#dc2626'}} />
          <div>
            <strong style={{color:'#991b1b'}}>⚠️ Órdenes Urgentes</strong>
            <p style={{fontSize:'0.875rem',color:'#7f1d1d',margin:0}}>
              Hay órdenes con más de 15 minutos de espera
            </p>
          </div>
        </div>
      )}

      {/* Lista de Órdenes */}
      {ordenes.length > 0 ? (
        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fill, minmax(380px, 1fr))',
          gap:'1.25rem'
        }}>
          {ordenes.map((orden) => {
            const prioridad = getPrioridad(orden)
            const tiempo = getTiempoTranscurrido(orden.created_at)
            
            const borderColors = {
              urgente: '#dc2626',
              alta: '#f59e0b',
              media: '#fbbf24',
              normal: '#22c55e'
            }

            const bgColors = {
              urgente: '#fef2f2',
              alta: '#fffbeb',
              media: '#fffbeb',
              normal: '#f0fdf4'
            }

            return (
              <div
                key={orden.id}
                className="card"
                style={{
                  padding:0,
                  borderLeft:`4px solid ${borderColors[prioridad]}`,
                  background:bgColors[prioridad],
                  boxShadow: prioridad === 'urgente' ? '0 4px 12px rgba(220, 38, 38, 0.15)' : '0 2px 8px rgba(0,0,0,0.08)'
                }}
              >
                {/* Header de la orden */}
                <div style={{
                  padding:'1rem',
                  borderBottom:'1px solid rgba(0,0,0,0.05)',
                  display:'flex',
                  justifyContent:'space-between',
                  alignItems:'center'
                }}>
                  <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                    <div style={{
                      width:40,
                      height:40,
                      borderRadius:'8px',
                      background:'white',
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      fontWeight:800,
                      fontSize:'1rem',
                      color:'var(--primary)'
                    }}>
                      {orden.tables?.name?.replace('Mesa ','') || 'N/A'}
                    </div>
                    <div>
                      <div style={{fontWeight:700,fontSize:'0.9rem',color:'#1e293b'}}>
                        Mesa {orden.tables?.name || 'N/A'}
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                        <span style={{
                          fontSize:'0.7rem',
                          padding:'0.125rem 0.5rem',
                          background:'white',
                          borderRadius:'9999px',
                          color:tiempo.color,
                          fontWeight:700,
                          border:`1px solid ${tiempo.color}30`
                        }}>
                          <Clock size={10} style={{display:'inline',marginRight:'2px'}} />
                          {tiempo.text}
                        </span>
                        {orden.status === 'pending' && (
                          <span style={{
                            fontSize:'0.65rem',
                            padding:'0.125rem 0.5rem',
                            background:'#f59e0b',
                            color:'white',
                            borderRadius:'9999px',
                            fontWeight:700
                          }}>
                            PENDIENTE
                          </span>
                        )}
                        {orden.status === 'cooking' && (
                          <span style={{
                            fontSize:'0.65rem',
                            padding:'0.125rem 0.5rem',
                            background:'#3b82f6',
                            color:'white',
                            borderRadius:'9999px',
                            fontWeight:700
                          }}>
                            COCINA
                          </span>
                        )}
                        {orden.status === 'ready' && (
                          <span style={{
                            fontSize:'0.65rem',
                            padding:'0.125rem 0.5rem',
                            background:'#22c55e',
                            color:'white',
                            borderRadius:'9999px',
                            fontWeight:700
                          }}>
                            ✓ LISTO
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setOrdenExpandida(ordenExpandida === orden.id ? null : orden.id)}
                    style={{
                      background:'white',
                      border:'1px solid var(--border)',
                      borderRadius:'6px',
                      padding:'0.375rem',
                      cursor:'pointer',
                      color:'var(--text-secondary)'
                    }}
                  >
                    {ordenExpandida === orden.id ? '▲' : '▼'}
                  </button>
                </div>

                {/* Items de la orden */}
                <div style={{padding:'1rem'}}>
                  <div style={{marginBottom:'0.75rem'}}>
                    <div style={{fontSize:'0.7rem',color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'0.5rem'}}>
                      Items a preparar
                    </div>
                    {orden.order_items?.map((item, idx) => (
                      <div 
                        key={idx}
                        style={{
                          display:'flex',
                          alignItems:'flex-start',
                          gap:'0.75rem',
                          padding:'0.625rem',
                          background:'white',
                          borderRadius:'6px',
                          marginBottom: idx < orden.order_items.length - 1 ? '0.5rem' : '0'
                        }}
                      >
                        <div style={{
                          minWidth:'28px',
                          height:'28px',
                          borderRadius:'6px',
                          background:prioridad === 'urgente' ? '#fee2e2' : '#f1f5f9',
                          display:'flex',
                          alignItems:'center',
                          justifyContent:'center',
                          fontWeight:800,
                          fontSize:'0.875rem',
                          color:prioridad === 'urgente' ? '#dc2626' : '#1e293b'
                        }}>
                          {item.quantity}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:600,fontSize:'0.875rem',color:'#1e293b'}}>
                            {item.product_name}
                          </div>
                          {item.special_instructions && (
                            <div style={{
                              fontSize:'0.7rem',
                              color:'#f59e0b',
                              marginTop:'0.25rem',
                              fontStyle:'italic'
                            }}>
                              📝 {item.special_instructions}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Acciones */}
                  <div style={{
                    display:'flex',
                    gap:'0.5rem',
                    paddingTop:'0.75rem',
                    borderTop:'1px solid rgba(0,0,0,0.05)'
                  }}>
                    {orden.status === 'pending' && (
                      <button
                        className="btn btn-primary"
                        onClick={() => cambiarEstado(orden.id, 'cooking')}
                        style={{flex:1,fontSize:'0.8rem',padding:'0.625rem'}}
                      >
                        <ChefHat size={16} style={{display:'inline',marginRight:'4px'}} />
                        A Cocinar
                      </button>
                    )}
                    {orden.status === 'cooking' && (
                      <button
                        className="btn btn-success"
                        onClick={() => cambiarEstado(orden.id, 'ready')}
                        style={{flex:1,fontSize:'0.8rem',padding:'0.625rem'}}
                      >
                        <CheckCircle size={16} style={{display:'inline',marginRight:'4px'}} />
                        Marcar Listo
                      </button>
                    )}
                    {orden.status === 'ready' && (
                      <div style={{
                        flex:1,
                        padding:'0.625rem',
                        background:'#dcfce7',
                        borderRadius:'6px',
                        textAlign:'center',
                        color:'#166534',
                        fontWeight:600,
                        fontSize:'0.8rem'
                      }}>
                        ✓ Listo para servir
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state" style={{padding:'3rem 1rem'}}>
            <div style={{
              width:80,
              height:80,
              borderRadius:'50%',
              background:'#f1f5f9',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              margin:'0 auto 1rem'
            }}>
              <ChefHat size={40} style={{color:'#94a3b8'}} />
            </div>
            <h3 style={{marginBottom:'0.5rem'}}>¡Todo limpio!</h3>
            <p style={{color:'var(--text-secondary)',marginBottom:'1rem'}}>
              {filtro === 'all' 
                ? 'No hay órdenes pendientes en este momento' 
                : `No hay órdenes ${filtro === 'pending' ? 'pendientes' : 'en cocina'}`}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Cocina
