import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { LayoutDashboard, Utensils, ShoppingBag, Receipt, ClipboardList, DollarSign, LogOut, User, Users, Calendar, BarChart3, Database, Menu, X } from 'lucide-react'
import { ToastProvider } from './context/ToastContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import Dashboard from './pages/Dashboard'
import Tables from './pages/Tables'
import MenuPage from './pages/Menu'
import POS from './pages/POS'
import Orders from './pages/Orders'
import Caja from './pages/Caja'
import Login from './pages/Login'
import Usuarios from './pages/Usuarios'
import Reservas from './pages/Reservas'
import Configuracion from './pages/Configuracion'
import Reportes from './pages/Reportes'
import Sistema from './pages/Sistema'
import './index.css'

const SIDEBAR_WIDTH = 280

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}><div style={{width:40,height:40,border:'4px solid #e2e8f0',borderTopColor:'#dc2626',borderRadius:'50%',animation:'spin 1s linear infinite'}}></div></div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

function SidebarMenu({ isMobile, isOpen, onClose }) {
  const location = useLocation()
  const { profile, signOut } = useAuth()

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/mesas', icon: Utensils, label: 'Mesas' },
    { path: '/reservas', icon: Calendar, label: 'Reservas' },
    { path: '/pos', icon: ShoppingBag, label: 'Nuevo Pedido' },
    { path: '/ordenes', icon: Receipt, label: 'Órdenes' },
    { path: '/caja', icon: DollarSign, label: 'Caja' },
  ]

  const adminItems = profile?.role === 'admin' ? [
    { path: '/usuarios', icon: Users, label: 'Usuarios' },
    { path: '/reportes', icon: BarChart3, label: 'Reportes' },
    { path: '/sistema', icon: Database, label: 'Sistema' },
  ] : []

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
          padding: isMobile ? '1rem' : '1.5rem 1.25rem',
          borderBottom:'1px solid rgba(255,255,255,0.1)',
          background: '#1a2332'
        }}>
          <div style={{display:'flex',alignItems:'center',gap:'0.875rem'}}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              boxShadow: '0 4px 10px rgba(220, 38, 38, 0.3)'
            }}>
              <img src="/logo.svg" alt="Logo" style={{width:28,height:28}} />
            </div>
            {!isMobile && (
              <div>
                <div style={{fontWeight:700,fontSize:'0.9rem',color:'white'}}>POS</div>
                <div style={{fontSize:'0.65rem',color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.5px'}}>Restaurante</div>
              </div>
            )}
          </div>
          {isMobile && (
            <button 
              onClick={onClose} 
              style={{background:'none',border:'none',color:'#94a3b8',cursor:'pointer',padding:'0.5rem'}}
              onMouseOver={(e) => e.target.style.color = 'white'}
              onMouseOut={(e) => e.target.style.color = '#94a3b8'}
            >
              <X size={22} />
            </button>
          )}
        </div>

        {/* User Info - Solo Desktop */}
        {!isMobile && profile && (
          <div style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(255,255,255,0.02)'
          }}>
            <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                fontWeight: 600,
                fontSize: '0.875rem',
                color: 'white'
              }}>
                {profile.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:'0.8rem',color:'white',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                  {profile.full_name || 'Usuario'}
                </div>
                <div style={{fontSize:'0.65rem',color:'#64748b',textTransform:'capitalize'}}>
                  {profile.role || 'waiter'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Menu Items */}
        <div style={{flex:1,overflowY:'auto',padding:'0.75rem',display:'flex',flexDirection:'column',gap:'0.25rem'}}>
          {/* Main Section */}
          {!isMobile && (
            <div style={{padding:'0.5rem 0.5rem',fontSize:'0.65rem',textTransform:'uppercase',color:'#64748b',fontWeight:700,letterSpacing:'0.1em'}}>
              Menú Principal
            </div>
          )}
          
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
                  padding: '0.875rem 1rem',
                  color: isActive ? 'white' : '#94a3b8',
                  textDecoration: 'none',
                  background: isActive ? 'linear-gradient(90deg, rgba(220,38,38,0.2) 0%, transparent 100%)' : 'transparent',
                  borderRadius: '8px',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  borderLeft: isActive ? '3px solid #dc2626' : '3px solid transparent',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
                onMouseOver={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                    e.currentTarget.style.color = 'white'
                  }
                }}
                onMouseOut={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#94a3b8'
                  }
                }}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span>{item.label}</span>
                {isActive && (
                  <div style={{
                    position:'absolute',
                    right: '1rem',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#dc2626',
                    boxShadow: '0 0 10px #dc2626'
                  }} />
                )}
              </Link>
            )
          })}

          {/* Admin Section */}
          {adminItems.length > 0 && (
            <>
              <div style={{
                padding: isMobile ? '1rem 0.5rem 0.5rem' : '1.25rem 0.5rem 0.5rem',
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                color: '#64748b',
                fontWeight: 700,
                letterSpacing: '0.1em',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                marginTop: '0.5rem'
              }}>
                {isMobile ? 'Administración' : 'Panel Admin'}
              </div>
              {adminItems.map((item) => {
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
                      padding: '0.875rem 1rem',
                      color: isActive ? 'white' : '#94a3b8',
                      textDecoration: 'none',
                      background: isActive ? 'linear-gradient(90deg, rgba(220,38,38,0.2) 0%, transparent 100%)' : 'transparent',
                      borderRadius: '8px',
                      fontWeight: 500,
                      fontSize: '0.875rem',
                      borderLeft: isActive ? '3px solid #dc2626' : '3px solid transparent',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                    onMouseOver={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                        e.currentTarget.style.color = 'white'
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = '#94a3b8'
                      }
                    }}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    <span>{item.label}</span>
                    {isActive && (
                      <div style={{
                        position:'absolute',
                        right: '1rem',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#dc2626',
                        boxShadow: '0 0 10px #dc2626'
                      }} />
                    )}
                  </Link>
                )
              })}
            </>
          )}
        </div>

        {/* Footer - Logout */}
        <div style={{padding:'1rem',borderTop:'1px solid rgba(255,255,255,0.1)',background:'rgba(0,0,0,0.2)'}}>
          <button
            onClick={() => { signOut(); if(isMobile) onClose() }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isMobile ? 'center' : 'center',
              gap: '0.75rem',
              padding: '0.875rem',
              background: 'rgba(220,38,38,0.1)',
              border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: '8px',
              color: '#fca5a5',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(220,38,38,0.2)'
              e.currentTarget.style.borderColor = 'rgba(220,38,38,0.5)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(220,38,38,0.1)'
              e.currentTarget.style.borderColor = 'rgba(220,38,38,0.3)'
            }}
          >
            <LogOut size={18} />
            <span>{isMobile ? 'Cerrar Sesión' : 'Salir del Sistema'}</span>
          </button>
        </div>
      </div>
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
          height: '60px',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: 'white',
          padding: '0 1rem',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 2px 15px rgba(0,0,0,0.15)'
        }}>
          <button
            onClick={() => setMobileMenuOpen(true)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <Menu size={22} />
          </button>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)'
          }}>
            <img src="/logo.svg" alt="Logo" style={{width:24,height:24}} />
          </div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:'0.95rem'}}>POS Restaurante</div>
            {profile && <div style={{fontSize:'0.7rem',color:'#94a3b8'}}>{profile.full_name}</div>}
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
        paddingTop: isMobile ? '70px' : '0',
        minHeight: '100vh',
        background: '#f1f5f9'
      }}>
        <div style={{padding: !isMobile ? '1.5rem' : '1rem'}}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/mesas" element={<Tables />} />
            <Route path="/reservas" element={<Reservas />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/ordenes" element={<Orders />} />
            <Route path="/caja" element={<Caja />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/sistema" element={<Sistema />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

function AppContent() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
