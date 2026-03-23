import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { LayoutDashboard, Utensils, ShoppingBag, Receipt, ClipboardList, Coffee, DollarSign, LogOut, User, Users, Calendar, Settings, Database, BarChart3, Menu, X } from 'lucide-react'
import { ToastProvider } from './context/ToastContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import Dashboard from './pages/Dashboard'
import Tables from './pages/Tables'
import Menu from './pages/Menu'
import POS from './pages/POS'
import Orders from './pages/Orders'
import Caja from './pages/Caja'
import Login from './pages/Login'
import Usuarios from './pages/Usuarios'
import Reservas from './pages/Reservas'
import Configuracion from './pages/Configuracion'
import Reportes from './pages/Reportes'
import Sistema from './pages/Sistema'
import './App.css'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    )
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

function Navigation() {
  const location = useLocation()
  const { user, profile, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/mesas', icon: Utensils, label: 'Mesas' },
    { path: '/reservas', icon: Calendar, label: 'Reservas' },
    { path: '/menu', icon: ClipboardList, label: 'Menú' },
    { path: '/pos', icon: ShoppingBag, label: 'Pedido' },
    { path: '/ordenes', icon: Receipt, label: 'Órdenes' },
    { path: '/caja', icon: DollarSign, label: 'Caja' },
  ]

  const adminItems = [
    { path: '/usuarios', icon: Users, label: 'Usuarios' },
    { path: '/reportes', icon: BarChart3, label: 'Reportes' },
    { path: '/sistema', icon: Database, label: 'Sistema' },
  ]

  const handleNavClick = () => {
    setMobileMenuOpen(false)
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="sidebar hide-mobile">
        <div className="sidebar-header">
          <Coffee size={32} style={{ color: 'var(--primary)' }} />
          <div>
            <h1>POS Restaurante</h1>
            {profile && (
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {profile.full_name || profile.email}
              </p>
            )}
          </div>
        </div>
        <ul className="nav-links">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <li key={item.path}>
                <Link to={item.path} className={isActive ? 'active' : ''}>
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
          {profile?.role === 'admin' && (
            <>
              <li>
                <Link to="/usuarios" className={location.pathname === '/usuarios' ? 'active' : ''}>
                  <Users size={20} />
                  <span>Usuarios</span>
                </Link>
              </li>
              <li>
                <Link to="/reportes" className={location.pathname === '/reportes' ? 'active' : ''}>
                  <BarChart3 size={20} />
                  <span>Reportes</span>
                </Link>
              </li>
              <li>
                <Link to="/sistema" className={location.pathname === '/sistema' ? 'active' : ''}>
                  <Database size={20} />
                  <span>Sistema</span>
                </Link>
              </li>
            </>
          )}
        </ul>
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <User size={18} />
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile?.full_name || 'Usuario'}
              </p>
              <p style={{ fontSize: '0.625rem', color: '#94a3b8', textTransform: 'capitalize' }}>
                {profile?.role || 'waiter'}
              </p>
            </div>
          </div>
          <button 
            className="btn btn-outline" 
            style={{ width: '100%', fontSize: '0.75rem' }}
            onClick={() => signOut()}
          >
            <LogOut size={14} /> Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* Mobile Header with Hamburger Menu */}
      <header className="mobile-header show-mobile">
        <div className="mobile-header-content">
          <button 
            className="hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menú"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="mobile-logo">
            <Coffee size={24} style={{ color: 'var(--primary)' }} />
            <span>POS Restaurante</span>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={handleNavClick} />
      )}

      {/* Mobile Slide Menu */}
      <nav className={`mobile-slide-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <User size={20} />
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                {profile?.full_name || 'Usuario'}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'capitalize' }}>
                {profile?.role || 'waiter'}
              </p>
            </div>
          </div>
          <button 
            className="btn-close-menu"
            onClick={handleNavClick}
            aria-label="Cerrar menú"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mobile-menu-items">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`mobile-menu-item ${isActive ? 'active' : ''}`}
                onClick={handleNavClick}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            )
          })}
          
          {profile?.role === 'admin' && (
            <>
              <div className="mobile-menu-divider">Administración</div>
              {adminItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link 
                    key={item.path} 
                    to={item.path} 
                    className={`mobile-menu-item ${isActive ? 'active' : ''}`}
                    onClick={handleNavClick}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </>
          )}
        </div>

        <div className="mobile-menu-footer">
          <button 
            className="btn btn-outline" 
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => {
              signOut()
              handleNavClick()
            }}
          >
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>
    </>
  )
}

function AppContent() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <Navigation />
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
