import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useRestaurant } from '../context/RestaurantContext'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, AlertTriangle, Clock } from 'lucide-react'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [lockoutInfo, setLockoutInfo] = useState(null)

  const { signIn } = useAuth()
  const { name, logo, primaryColor } = useRestaurant()
  const navigate = useNavigate()
  
  // Verificar bloqueo al cargar la página
  useEffect(() => {
    checkLockoutStatus()
    const interval = setInterval(checkLockoutStatus, 1000) // Actualizar cada segundo
    return () => clearInterval(interval)
  }, [])
  
  function checkLockoutStatus() {
    const lockoutUntil = localStorage.getItem('pos_lockout_until')
    if (lockoutUntil) {
      const lockoutTime = parseInt(lockoutUntil)
      const now = Date.now()
      
      if (now < lockoutTime) {
        const remainingMs = lockoutTime - now
        const remainingMinutes = Math.ceil(remainingMs / 60000)
        const remainingSeconds = Math.ceil((remainingMs % 60000) / 1000)
        setLockoutInfo({
          isLocked: true,
          remainingMinutes,
          remainingSeconds
        })
      } else {
        setLockoutInfo(null)
      }
    } else {
      setLockoutInfo(null)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    
    // Si está bloqueado, no permitir login
    if (lockoutInfo?.isLocked) {
      return
    }
    
    setLoading(true)

    const result = await signIn(email, password)

    if (result.success) {
      navigate('/')
    } else if (result.locked) {
      // Actualizar información de bloqueo
      setLockoutInfo({
        isLocked: true,
        remainingMinutes: result.remainingMinutes || 15,
        remainingSeconds: 0
      })
    }
    
    setLoading(false)
  }

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
        <div className="circle circle-3"></div>
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="logo">
            <div style={{
              width: 120,
              height: 120,
              background: 'white',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <img
                src={logo || '/logo-large.svg'}
                alt={`${name} Logo`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain'
                }}
              />
            </div>
          </div>
          <h1 style={{color: primaryColor}}>{name || 'POS Restaurante'}</h1>
          <p>Sistema de Punto de Venta</p>
        </div>

        {/* Alerta de bloqueo */}
        {lockoutInfo?.isLocked && (
          <div style={{
            padding: '1rem',
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '2px solid #dc2626',
            borderRadius: '0.75rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Lock size={20} style={{color: 'white'}} />
            </div>
            <div style={{flex: 1}}>
              <div style={{fontWeight: 700, color: '#991b1b', marginBottom: '0.25rem'}}>
                Cuenta Bloqueada
              </div>
              <div style={{fontSize: '0.875rem', color: '#7f1d1d'}}>
                {lockoutInfo.remainingMinutes > 0 ? (
                  `${lockoutInfo.remainingMinutes} minuto(s) restantes`
                ) : (
                  `${lockoutInfo.remainingSeconds} segundo(s) restantes`
                )}
              </div>
            </div>
            <Clock size={24} style={{color: '#dc2626', animation: 'pulse 1s infinite'}} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>
              <Mail size={16} /> Correo Electrónico
            </label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@restaurante.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label>
              <Lock size={16} /> Contraseña
            </label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-login" 
            disabled={loading || lockoutInfo?.isLocked}
            style={{
              opacity: lockoutInfo?.isLocked ? 0.5 : 1,
              cursor: lockoutInfo?.isLocked ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? (
              <span className="spinner-small"></span>
            ) : lockoutInfo?.isLocked ? (
              '🔒 Cuenta Bloqueada'
            ) : (
              '🔐 Iniciar Sesión'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
