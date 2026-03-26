import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import {
  LayoutDashboard, Utensils, ShoppingBag, Receipt, DollarSign, LogOut,
  Menu, X, Bell, Clock, CheckCircle, TrendingUp, Users, Calendar, WifiOff,
  AlertCircle, Palette, HelpCircle
} from 'lucide-react'
import { supabase } from './lib/supabase'
import { ToastProvider } from './context/ToastContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useRestaurant } from './context/RestaurantContext'
import { usePreventScreenshot } from './hooks/usePreventScreenshot'
import { useServiceWorker } from './hooks/useServiceWorker'
import InstallPrompt from './components/InstallPrompt'
import Dashboard from './pages/Dashboard'
import Tables from './pages/Tables'
import POS from './pages/POS'
import Orders from './pages/Orders'
import Caja from './pages/Caja'
import Login from './pages/Login'
import Usuarios from './pages/Usuarios'
import Reservas from './pages/Reservas'
import Reportes from './pages/Reportes'
import Sistema from './pages/Sistema'
import MiTurno from './pages/MiTurno'
import Pedidos from './pages/Pedidos'
import RestaurantConfig from './pages/RestaurantConfig'
import Manual from './pages/Manual'
import './index.css'

const SIDEBAR_WIDTH = 260

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}>
      <div style={{width:40,height:40,border:'4px solid #e2e8f0',borderTopColor:'#dc2626',borderRadius:'50%',animation:'spin 1s linear infinite'}}></div>
    </div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

// Configuración de menús por rol
const ROLE_MENUS = {
  admin: [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/mesas', icon: Utensils, label: 'Mesas' },
    { path: '/reservas', icon: Calendar, label: 'Reservas' },
    { path: '/pos', icon: ShoppingBag, label: 'Nuevo Pedido' },
    { path: '/pedidos', icon: Receipt, label: 'Pedidos' },
    { path: '/caja', icon: DollarSign, label: 'Caja' },
    { path: '/usuarios', icon: Users, label: 'Usuarios' },
    { path: '/reportes', icon: TrendingUp, label: 'Reportes' },
    { path: '/manual', icon: HelpCircle, label: 'Manual' },
    { path: '/configuracion', icon: Palette, label: 'Configuración' },
    { path: '/sistema', icon: LayoutDashboard, label: 'Sistema' },
  ],
  waiter: [
    { path: '/mi-turno', icon: Clock, label: 'Mi Turno' },
    { path: '/mesas', icon: Utensils, label: 'Mesas' },
    { path: '/pedidos', icon: ShoppingBag, label: 'Pedidos' },
    { path: '/reservas', icon: Calendar, label: 'Reservas' },
    { path: '/caja', icon: DollarSign, label: 'Cobrar' },
    { path: '/manual', icon: HelpCircle, label: 'Manual' },
  ]
}

function SidebarMenu({ isMobile, isOpen, onClose }) {
  const location = useLocation()
  const { profile, signOut } = useAuth()
  const { name, logo, primaryColor } = useRestaurant()
  const [showAnnouncements, setShowAnnouncements] = useState(false)
  const [announcements, setAnnouncements] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportData, setReportData] = useState({ type: 'bug', urgency: 'medium', description: '' })

  const role = profile?.role || 'waiter'
  const menuItems = ROLE_MENUS[role] || ROLE_MENUS.waiter

  // Cargar anuncios
  useEffect(() => {
    async function loadAnnouncements() {
      try {
        const { data, error } = await supabase.rpc('get_active_announcements')
        if (error) throw error
        const readAnnouncements = JSON.parse(localStorage.getItem('readAnnouncements') || '[]')
        const unread = data?.filter(a => !readAnnouncements.includes(a.id)) || []
        setAnnouncements(data || [])
        setUnreadCount(unread.length)
      } catch (error) {
        console.error('Error loading announcements:', error)
      }
    }
    if (profile) loadAnnouncements()
  }, [profile])

  function markAllAsRead() {
    const allIds = announcements.map(a => a.id)
    localStorage.setItem('readAnnouncements', JSON.stringify(allIds))
    setUnreadCount(0)
  }

  function markAsRead(id) {
    const read = JSON.parse(localStorage.getItem('readAnnouncements') || '[]')
    if (!read.includes(id)) {
      read.push(id)
      localStorage.setItem('readAnnouncements', JSON.stringify(read))
      const unread = announcements.filter(a => !read.includes(a.id))
      setUnreadCount(unread.length)
    }
  }

  const menuStyle = isMobile ? {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '85%',
    maxWidth: '300px',
    height: '100vh',
    background: '#1e293b',
    color: 'white',
    zIndex: 1001,
    transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
    transition: 'transform 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '4px 0 15px rgba(0,0,0,0.3)'
  } : {
    width: SIDEBAR_WIDTH,
    height: '100vh',
    background: '#1e293b',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    top: 0,
    left: 0,
    boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
    zIndex: 100
  }

  const getRoleTitle = (role) => {
    const titles = {
      admin: 'Administrador',
      waiter: 'Mesero'
    }
    return titles[role] || 'Usuario'
  }

  return (
    <>
      {isMobile && isOpen && (
        <div 
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000}} 
          onClick={onClose}
        />
      )}

      <div style={menuStyle}>
        {/* Header */}
        <div style={{
          display:'flex',
          justifyContent:'space-between',
          alignItems:'center',
          padding: isMobile ? '1rem' : '1.25rem 1rem',
          borderBottom:'1px solid rgba(255,255,255,0.15)',
          background: 'rgba(255,255,255,0.05)'
        }}>
          <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '8px',
              background: `linear-gradient(135deg, ${primaryColor || '#dc2626'} 0%, ${primaryColor || '#b91c1c'} 100%)`,
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              boxShadow: `0 4px 10px ${primaryColor || '#dc2626'}55`,
              padding: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                background: 'white',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px'
              }}>
                <img 
                  src={logo || '/logo.svg'} 
                  alt="Logo" 
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain'
                  }} 
                />
              </div>
            </div>
            {!isMobile && (
              <div>
                <div style={{fontWeight:700,fontSize:'0.85rem',color:'white'}}>{name || 'POS'}</div>
                <div style={{fontSize:'0.6rem',color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.5px'}}>Restaurante</div>
              </div>
            )}
          </div>
          {!isMobile && (
            <button
              onClick={() => setShowAnnouncements(!showAnnouncements)}
              style={{
                position:'relative',
                background:'rgba(255,255,255,0.1)',
                border:'none',
                color:'white',
                cursor:'pointer',
                padding:'0.5rem',
                borderRadius:'6px',
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                minWidth:'36px',
                height:'36px'
              }}
              title="Notificaciones"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span style={{
                  position:'absolute',
                  top:-2,
                  right:-2,
                  background:'#ef4444',
                  color:'white',
                  borderRadius:'50%',
                  padding:'2px 5px',
                  fontSize:9,
                  fontWeight:700,
                  minWidth:'16px',
                  textAlign:'center'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>
          )}
          {isMobile && (
            <button
              onClick={onClose}
              style={{background:'none',border:'none',color:'#94a3b8',cursor:'pointer',padding:'0.5rem'}}
            >
              <X size={22} />
            </button>
          )}
        </div>

        {/* User Info - Solo Desktop */}
        {!isMobile && profile && (
          <div style={{
            padding: '0.875rem 1rem',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(255,255,255,0.02)'
          }}>
            <div style={{display:'flex',alignItems:'center',gap:'0.625rem'}}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: role === 'admin' ? 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' :
                           'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                fontWeight: 600,
                fontSize: '0.8rem',
                color: 'white'
              }}>
                {profile.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:'0.75rem',color:'white',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                  {profile.full_name || 'Usuario'}
                </div>
                <div style={{fontSize:'0.6rem',color:'#64748b',textTransform:'capitalize'}}>
                  {getRoleTitle(role)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Panel de Notificaciones - Solo Desktop */}
        {!isMobile && showAnnouncements && (
          <div style={{
            padding:'1rem',
            background:'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            borderBottom:'1px solid rgba(255,255,255,0.2)',
            maxHeight:'400px',
            overflowY:'auto'
          }}>
            <div style={{marginBottom:'0.75rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontWeight:700,fontSize:13,color:'white'}}>Notificaciones</div>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} style={{
                  background:'rgba(255,255,255,0.2)',
                  border:'1px solid rgba(255,255,255,0.3)',
                  color:'white',
                  padding:'4px 8px',
                  borderRadius:4,
                  fontSize:9,
                  fontWeight:600,
                  cursor:'pointer'
                }}>Marcar todas como leidas</button>
              )}
            </div>
            {announcements.length > 0 ? (
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {announcements.map(a => {
                  const colors = {
                    info:{bg:'#dbeafe',text:'#1e40af',icon:'[i]'},
                    warning:{bg:'#fef3c7',text:'#92400e',icon:'[!]'},
                    error:{bg:'#fee2e2',text:'#991b1b',icon:'[x]'},
                    success:{bg:'#d1fae5',text:'#065f46',icon:'[ok]'},
                    maintenance:{bg:'#fed7aa',text:'#9a3412',icon:'[w]'}
                  }[a.type] || {bg:'#dbeafe',text:'#1e40af',icon:'[i]'}
                  const isUnread = !JSON.parse(localStorage.getItem('readAnnouncements')||'[]').includes(a.id)
                  return (
                    <div key={a.id} onClick={()=>markAsRead(a.id)} style={{
                      padding:10,
                      background:colors.bg,
                      borderRadius:6,
                      border:isUnread?'2px solid #3b82f6':'2px solid transparent',
                      cursor:'pointer'
                    }}>
                      <div style={{display:'flex',gap:8,alignItems:'flex-start'}}>
                        <span style={{fontSize:16,fontWeight:'bold'}}>{colors.icon}</span>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:700,fontSize:11,color:colors.text,marginBottom:4}}>{a.title}</div>
                          <div style={{fontSize:10,color:'#475569',lineHeight:1.4}}>{a.message}</div>
                          <div style={{fontSize:8,color:'#94a3b8',marginTop:4}}>
                            {new Date(a.created_at).toLocaleDateString('es-ES',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{padding:'2rem',textAlign:'center',background:'rgba(255,255,255,0.95)',borderRadius:6}}>
                <div style={{fontSize:32,marginBottom:'0.5rem'}}>🔕</div>
                <div style={{fontWeight:600,fontSize:11,color:'#64748b'}}>Sin notificaciones</div>
              </div>
            )}
          </div>
        )}

        {/* Menu Items */}
        <div style={{flex:1,overflowY:'auto',overflowX:'hidden',padding:'0.5rem',display:'flex',flexDirection:'column',gap:'0.25rem',scrollbarWidth:'none',msOverflowStyle:'none'}}>
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={isMobile ? onClose : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.875rem',
                  padding: '0.75rem 0.875rem',
                  color: 'white',
                  textDecoration: 'none',
                  background: isActive ? `linear-gradient(90deg, ${primaryColor}30 0%, transparent 100%)` : 'transparent',
                  borderRadius: '6px',
                  fontWeight: 500,
                  fontSize: '0.825rem',
                  borderLeft: isActive ? `3px solid ${primaryColor}` : '3px solid transparent',
                  transition: 'all 0.15s',
                  position: 'relative'
                }}
                onMouseOver={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                    e.currentTarget.style.color = 'white'
                  }
                }}
                onMouseOut={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'white'
                  }
                }}
              >
                <Icon size={19} strokeWidth={isActive ? 2.5 : 2} style={{color: 'white'}} />
                <span style={{color: 'white'}}>{item.label}</span>
                {isActive && (
                  <div style={{
                    position:'absolute',
                    right: '0.75rem',
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: primaryColor,
                    boxShadow: `0 0 8px ${primaryColor}`
                  }} />
                )}
              </Link>
            )
          })}
        </div>

        {/* Footer - Logout */}
        <div style={{
          padding:'0.875rem',
          borderTop:'1px solid rgba(255,255,255,0.15)',
          background: 'rgba(0,0,0,0.2)'
        }}>
          {/* Botón Reportar Problema */}
          <button
            onClick={() => setShowReportModal(true)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.625rem',
              padding: '0.75rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.8rem',
              marginBottom: '0.5rem',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
            }}
          >
            <AlertCircle size={17} style={{color: 'white'}} />
            <span style={{color: 'white'}}>Reportar Problema</span>
          </button>

          {/* Botón Logout */}
          <button
            onClick={() => { signOut(); if(isMobile) onClose() }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.625rem',
              padding: '0.75rem',
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.8rem',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.25)'
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.15)'
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'
            }}
          >
            <LogOut size={17} style={{color: 'white'}} />
            <span style={{color: 'white'}}>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Modal de Reportar Problema */}
      {showReportModal && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)} style={{zIndex: 9999}}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '500px'}}>
            <h3>🚨 Reportar Problema</h3>
            
            <p style={{color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem'}}>
              Envía un reporte al equipo de soporte. Te responderemos lo antes posible.
            </p>

            <div style={{marginBottom: '1rem'}}>
              <label style={{fontWeight: 600, marginBottom: '0.5rem', display: 'block'}}>Tipo de Problema</label>
              <select
                value={reportData.type}
                onChange={(e) => setReportData({...reportData, type: e.target.value})}
                style={{width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)'}}
              >
                <option value="bug">🐛 Error / Bug</option>
                <option value="performance">⚡ Lentitud / Rendimiento</option>
                <option value="data">📊 Problema con Datos</option>
                <option value="feature">💡 Sugerencia de Mejora</option>
                <option value="other">❓ Otro</option>
              </select>
            </div>

            <div style={{marginBottom: '1rem'}}>
              <label style={{fontWeight: 600, marginBottom: '0.5rem', display: 'block'}}>Urgencia</label>
              <select
                value={reportData.urgency}
                onChange={(e) => setReportData({...reportData, urgency: e.target.value})}
                style={{width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)'}}
              >
                <option value="low">🟢 Baja - No es urgente</option>
                <option value="medium">🟡 Media - Afecta el trabajo</option>
                <option value="high">🔴 Alta - Bloquea el trabajo</option>
              </select>
            </div>

            <div style={{marginBottom: '1.5rem'}}>
              <label style={{fontWeight: 600, marginBottom: '0.5rem', display: 'block'}}>Descripción del Problema</label>
              <textarea
                value={reportData.description}
                onChange={(e) => setReportData({...reportData, description: e.target.value})}
                placeholder="Describe el problema con detalles: ¿qué estabas haciendo?, ¿qué error viste?, ¿cómo reproducirlo?"
                rows={5}
                style={{width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)', resize: 'vertical', fontFamily: 'inherit'}}
              />
            </div>

            <div style={{display: 'flex', gap: '0.75rem', justifyContent: 'flex-end'}}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowReportModal(false)}
                style={{padding: '0.75rem 1.5rem'}}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={async () => {
                  if (!reportData.description.trim()) {
                    alert('Por favor describe el problema')
                    return
                  }

                  try {
                    const { error } = await supabase
                      .from('support_reports')
                      .insert([{
                        user_id: profile?.id,
                        user_email: profile?.email,
                        report_type: reportData.type,
                        urgency: reportData.urgency,
                        description: reportData.description,
                        status: 'pending'
                      }])

                    if (error) throw error

                    // Guardar backup local
                    const reports = JSON.parse(localStorage.getItem('my_support_reports') || '[]')
                    reports.push({
                      date: new Date().toISOString(),
                      ...reportData,
                      status: 'pending'
                    })
                    localStorage.setItem('my_support_reports', JSON.stringify(reports))

                    alert('✅ Reporte enviado correctamente. Te responderemos pronto.')
                    setShowReportModal(false)
                    setReportData({type: 'bug', urgency: 'medium', description: ''})
                  } catch (error) {
                    console.error('Error al enviar reporte:', error)
                    alert('❌ Error al enviar reporte. Inténtalo de nuevo.')
                  }
                }}
                style={{padding: '0.75rem 1.5rem'}}
              >
                Enviar Reporte
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { profile } = useAuth()
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      if (!mobile) {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Redirigir meseros a Mi Turno por defecto
  const getDefaultPath = () => {
    if (profile?.role === 'waiter') return '/mi-turno'
    if (profile?.role === 'kitchen') return '/cocina'
    return '/'
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9' }}>
      {/* Desktop Sidebar */}
      {!isMobile && <SidebarMenu isMobile={false} />}

      {/* Mobile Header */}
      {isMobile && (
        <header style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '56px',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: 'white',
          padding: '0 0.875rem',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          boxShadow: '0 2px 15px rgba(0,0,0,0.15)'
        }}>
          <button
            onClick={() => setMobileMenuOpen(true)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '0.45rem',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
          >
            <Menu size={20} />
          </button>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)'
          }}>
            <img src="/logo.svg" alt="Logo" style={{width:20,height:20}} />
          </div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:'0.9rem'}}>POS</div>
            {profile && <div style={{fontSize:'0.65rem',color:'#94a3b8'}}>{profile.full_name}</div>}
          </div>
        </header>
      )}

      {/* Mobile Menu */}
      {isMobile && (
        <SidebarMenu 
          isMobile={true} 
          isOpen={mobileMenuOpen} 
          onClose={() => setMobileMenuOpen(false)} 
        />
      )}

      {/* Main Content */}
      <main style={{
        flex: 1,
        marginLeft: !isMobile ? `${SIDEBAR_WIDTH}px` : '0',
        paddingTop: isMobile ? '66px' : '0',
        minHeight: '100vh',
        background: '#f1f5f9'
      }}>
        <div style={{padding: !isMobile ? '1.25rem' : '0.875rem'}}>
          <Routes>
            <Route path="/" element={
              profile?.role === 'waiter' ? <Navigate to="/mi-turno" replace /> : 
              <Dashboard />
            } />
            <Route path="/mi-turno" element={<MiTurno />} />
            <Route path="/mesas" element={<Tables />} />
            <Route path="/reservas" element={<Reservas />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/pedidos" element={<Pedidos />} />
            <Route path="/ordenes" element={<Orders />} />
            <Route path="/caja" element={<Caja />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/manual" element={<Manual />} />
            <Route path="/configuracion" element={<RestaurantConfig />} />
            <Route path="/sistema" element={<Sistema />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

function AppContent() {
  const { isOnline, updateAvailable, updateServiceWorker } = useServiceWorker()
  
  return (
    <>
      {/* Notificación de Offline */}
      {!isOnline && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: '#f59e0b',
          color: '#92400e',
          padding: '0.75rem 1rem',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: 600,
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <WifiOff size={18} />
          <span>Modo Offline - Algunas funciones limitadas</span>
        </div>
      )}
      
      {/* Notificación de actualización disponible */}
      {updateAvailable && (
        <div style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          background: '#1e293b',
          color: 'white',
          padding: '1rem 1.25rem',
          borderRadius: '0.5rem',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          animation: 'slideUp 0.3s ease-out'
        }}>
          <div style={{flex: 1}}>
            <div style={{fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem'}}>
              Actualización disponible
            </div>
            <div style={{fontSize: '0.75rem', color: '#94a3b8'}}>
              Nueva versión lista para instalar
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={updateServiceWorker}
            style={{fontSize: '0.75rem', padding: '0.5rem 1rem'}}
          >
            Actualizar
          </button>
        </div>
      )}

      <BrowserRouter>
        {/* Prompt de instalación PWA - dentro del Router */}
        <InstallPrompt />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </>
  )
}

function App() {
  // Prevenir capturas de pantalla en toda la app
  usePreventScreenshot()
  
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
