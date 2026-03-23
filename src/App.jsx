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

  const menuStyle = {
    position: isMobile ? 'fixed' : 'relative',
    top: 0,
    left: 0,
    width: isMobile ? '80%' : '260px',
    maxWidth: isMobile ? '300px' : '260px',
    height: isMobile ? '100vh' : '100vh',
    background: '#1e293b',
    color: 'white',
    zIndex: isMobile ? 1000 : 100,
    transform: isMobile && !isOpen ? 'translateX(-100%)' : 'translateX(0)',
    transition: isMobile ? 'transform 0.3s ease' : 'none',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: isMobile ? 'none' : '4px 0 10px rgba(0,0,0,0.1)'
  }

  return (
    <>
      {/* Overlay solo para móvil */}
      {isMobile && isOpen && <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:999}} onClick={onClose} />}

      <div style={menuStyle}>
        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'1.25rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
          <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
            <img src="/logo.svg" alt="Logo" style={{width:40,height:40}} />
            {!isMobile && (
              <div>
                <div style={{fontWeight:700,fontSize:'0.875rem'}}>POS Restaurante</div>
                <div style={{fontSize:'0.7rem',color:'#94a3b8'}}>{profile?.full_name || 'Usuario'}</div>
              </div>
            )}
          </div>
          {isMobile && (
            <button onClick={onClose} style={{background:'none',border:'none',color:'white',cursor:'pointer'}}>
              <X size={24} />
            </button>
          )}
        </div>

        {/* Items */}
        <div style={{flex:1,overflowY:'auto',padding:'0.75rem 0'}}>
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
                  gap: '1rem',
                  padding: '0.875rem 1.25rem',
                  color: isActive ? 'white' : '#94a3b8',
                  textDecoration: 'none',
                  background: isActive ? '#dc2626' : 'transparent',
                  fontWeight: 500,
                  borderLeft: isActive ? '4px solid white' : '4px solid transparent'
                }}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            )
          })}

          {adminItems.length > 0 && (
            <>
              <div style={{padding:'1rem 1.25rem',fontSize:'0.7rem',textTransform:'uppercase',color:'#64748b',fontWeight:700,letterSpacing:'0.05em'}}>Administración</div>
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
                      gap: '1rem',
                      padding: '0.875rem 1.25rem',
                      color: isActive ? 'white' : '#94a3b8',
                      textDecoration: 'none',
                      background: isActive ? '#dc2626' : 'transparent',
                      fontWeight: 500,
                      borderLeft: isActive ? '4px solid white' : '4px solid transparent'
                    }}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:'1rem',borderTop:'1px solid rgba(255,255,255,0.1)'}}>
          <button
            onClick={() => { signOut(); if(isMobile) onClose() }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.75rem',
              background: 'transparent',
              border: '2px solid rgba(255,255,255,0.3)',
              borderRadius: '0.5rem',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            <LogOut size={18} />
            {!isMobile && <span>Cerrar Sesión</span>}
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

  // Detectar cambio de tamaño de pantalla
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9' }}>
      {/* Desktop Sidebar - oculta en móvil */}
      {!isMobile && <SidebarMenu isMobile={false} />}

      {/* Mobile Header - solo en móvil */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: '#1e293b',
          color: 'white',
          padding: '1rem',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <button
            onClick={() => setMobileMenuOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Menu size={24} />
          </button>
          <img src="/logo.svg" alt="Logo" style={{height:40,width:40}} />
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:'1rem'}}>POS Restaurante</div>
            {profile && <div style={{fontSize:'0.75rem',color:'#94a3b8'}}>{profile.full_name}</div>}
          </div>
        </div>
      )}

      {/* Mobile Menu */}
      {isMobile && <SidebarMenu isMobile={true} isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />}

      {/* Main Content */}
      <div style={{
        flex: 1,
        marginLeft: !isMobile ? '260px' : '0',
        paddingTop: isMobile ? '70px' : '0',
        minHeight: '100vh',
        background: '#f1f5f9'
      }}>
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
