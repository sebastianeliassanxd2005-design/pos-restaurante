import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { LayoutDashboard, Utensils, ShoppingBag, Receipt, ClipboardList, Coffee, DollarSign, LogOut, User, Users, Calendar, Settings, Database, BarChart3 } from 'lucide-react'
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
  
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/mesas', icon: Utensils, label: 'Mesas' },
    { path: '/reservas', icon: Calendar, label: 'Reservas' },
    { path: '/menu', icon: ClipboardList, label: 'Menú' },
    { path: '/pos', icon: ShoppingBag, label: 'Pedido' },
    { path: '/ordenes', icon: Receipt, label: 'Órdenes' },
    { path: '/caja', icon: DollarSign, label: 'Caja' },
  ]

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

      {/* Mobile Navigation Bar */}
      <nav className="mobile-nav show-mobile">
        <ul>
          <li>
            <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
              <LayoutDashboard size={20} />
              <span>Inicio</span>
            </Link>
          </li>
          <li>
            <Link to="/pos" className={location.pathname === '/pos' ? 'active' : ''}>
              <ShoppingBag size={20} />
              <span>Pedido</span>
            </Link>
          </li>
          <li>
            <Link to="/mesas" className={location.pathname === '/mesas' ? 'active' : ''}>
              <Utensils size={20} />
              <span>Mesas</span>
            </Link>
          </li>
          <li>
            <Link to="/ordenes" className={location.pathname === '/ordenes' ? 'active' : ''}>
              <Receipt size={20} />
              <span>Órdenes</span>
            </Link>
          </li>
          <li>
            <Link to="/caja" className={location.pathname === '/caja' ? 'active' : ''}>
              <DollarSign size={20} />
              <span>Caja</span>
            </Link>
          </li>
        </ul>
      </nav>
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
            <div className="app-container">
              <Navigation />
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/mesas" element={<Tables />} />
                  <Route path="/reservas" element={<Reservas />} />
                  <Route path="/menu" element={<Menu />} />
                  <Route path="/pos" element={<POS />} />
                  <Route path="/ordenes" element={<Orders />} />
                  <Route path="/caja" element={<Caja />} />
                  <Route path="/usuarios" element={<Usuarios />} />
                  <Route path="/reportes" element={<Reportes />} />
                  <Route path="/sistema" element={<Sistema />} />
                </Routes>
              </main>
            </div>
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
