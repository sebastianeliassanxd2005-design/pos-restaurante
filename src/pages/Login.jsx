import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock } from 'lucide-react'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    const result = await signIn(email, password)

    if (result.success) {
      navigate('/')
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
            <img src="/logo-large.svg" alt="POS Restaurante Logo" style={{width:120,height:120}} />
          </div>
          <h1>POS Restaurante</h1>
          <p>Sistema de Punto de Venta</p>
        </div>

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

          <button type="submit" className="btn btn-primary btn-login" disabled={loading}>
            {loading ? (
              <span className="spinner-small"></span>
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
