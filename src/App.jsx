import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { 
  LayoutDashboard, Utensils, ShoppingBag, Receipt, DollarSign, LogOut, 
  Menu, X, Bell, Clock, CheckCircle, TrendingUp, Users, Calendar 
} from 'lucide-react'
import { ToastProvider } from './context/ToastContext'
import { AuthProvider, useAuth } from './context/AuthContext'
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
import Cocina from './pages/Cocina'
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
    { path: '/pedidos', icon: ShoppingBag, label: 'Pedidos' },
    { path: '/caja', icon: DollarSign, label: 'Caja' },
    { path: '/usuarios', icon: Users, label: 'Usuarios' },
    { path: '/reportes', icon: TrendingUp, label: 'Reportes' },
    { path: '/sistema', icon: LayoutDashboard, label: 'Sistema' },
  ],
  waiter: [
    { path: '/mi-turno', icon: Clock, label: 'Mi Turno' },
    { path: '/mesas', icon: Utensils, label: 'Mesas' },
    { path: '/pedidos', icon: ShoppingBag, label: 'Pedidos' },
    { path: '/reservas', icon: Calendar, label: 'Reservas' },
    { path: '/caja', icon: DollarSign, label: 'Cobrar' },
  ],
  kitchen: [
    { path: '/cocina', icon: ChefHat, label: 'Órdenes Cocina' },
  ]
}

function SidebarMenu({ isMobile, isOpen, onClose }) {
  const location = useLocation()
  const { profile, signOut } = useAuth()
  
  const role = profile?.role || 'waiter'
  const menuItems = ROLE_MENUS[role] || ROLE_MENUS.waiter

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
      waiter: 'Mesero',
      kitchen: 'Cocina'
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
          borderBottom:'1px solid rgba(255,255,255,0.1)',
          background: '#1a2332'
        }}>
          <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              boxShadow: '0 4px 10px rgba(220, 38, 38, 0.3)'
            }}>
              <img src="/logo.svg" alt="Logo" style={{width:24,height:24}} />
            </div>
            {!isMobile && (
              <div>
                <div style={{fontWeight:700,fontSize:'0.85rem',color:'white'}}>POS</div>
                <div style={{fontSize:'0.6rem',color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.5px'}}>Restaurante</div>
              </div>
            )}
          </div>
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
                           role === 'kitchen' ? 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)' :
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
                  color: isActive ? 'white' : '#94a3b8',
                  textDecoration: 'none',
                  background: isActive ? 'linear-gradient(90deg, rgba(220,38,38,0.15) 0%, transparent 100%)' : 'transparent',
                  borderRadius: '6px',
                  fontWeight: 500,
                  fontSize: '0.825rem',
                  borderLeft: isActive ? '3px solid #dc2626' : '3px solid transparent',
                  transition: 'all 0.15s',
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
                <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
                <span>{item.label}</span>
                {isActive && (
                  <div style={{
                    position:'absolute',
                    right: '0.75rem',
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: '#dc2626',
                    boxShadow: '0 0 8px #dc2626'
                  }} />
                )}
              </Link>
            )
          })}
        </div>

        {/* Footer - Logout */}
        <div style={{padding:'0.875rem',borderTop:'1px solid rgba(255,255,255,0.1)',background:'rgba(0,0,0,0.15)'}}>
          <button
            onClick={() => { signOut(); if(isMobile) onClose() }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.625rem',
              padding: '0.75rem',
              background: 'rgba(220,38,38,0.1)',
              border: '1px solid rgba(220,38,38,0.25)',
              borderRadius: '6px',
              color: '#fca5a5',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.8rem',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(220,38,38,0.2)'
              e.currentTarget.style.borderColor = 'rgba(220,38,38,0.4)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(220,38,38,0.1)'
              e.currentTarget.style.borderColor = 'rgba(220,38,38,0.25)'
            }}
          >
            <LogOut size={17} />
            <span>Cerrar Sesión</span>
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
            <Route path="/" element={profile?.role === 'waiter' ? <Navigate to="/mi-turno" replace /> : <Dashboard />} />
            <Route path="/mi-turno" element={<MiTurno />} />
            <Route path="/cocina" element={<Cocina />} />
            <Route path="/mesas" element={<Tables />} />
            <Route path="/reservas" element={<Reservas />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/pedidos" element={<Pedidos />} />
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
