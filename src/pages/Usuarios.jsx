import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Users, User, Mail, Shield } from 'lucide-react'

function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()
  const toast = useToast()

  useEffect(() => {
    fetchUsuarios()
  }, [])

  async function fetchUsuarios() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setUsuarios(data || [])
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar usuarios: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getRoleIcon = (role) => {
    switch(role) {
      case 'admin': return <Shield size={16} />
      case 'kitchen': return <span style={{ fontSize: '16px' }}>👨‍🍳</span>
      default: return <User size={16} />
    }
  }

  const getRoleBadge = (role) => {
    const badges = {
      'admin': 'badge-danger',
      'waiter': 'badge-info',
      'kitchen': 'badge-warning'
    }
    return badges[role] || 'badge-secondary'
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">🔒</div>
          <h3>Acceso Denegado</h3>
          <p>Solo los administradores pueden acceder a esta sección</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="loading-spinner"><div className="spinner"></div></div>
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2>👥 Usuarios del Sistema</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {usuarios.length} usuarios registrados
          </p>
        </div>
      </div>

      {/* Lista de usuarios */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Fecha Registro</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(user => (
                <tr key={user.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '50%', 
                        background: 'var(--primary-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary)',
                        fontWeight: 600
                      }}>
                        {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{user.full_name || 'Sin nombre'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                          {user.id.slice(0, 8)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Mail size={14} style={{ color: 'var(--text-secondary)' }} />
                      {user.email}
                    </div>
                  </td>
                  <td>
                    <span className={'badge ' + getRoleBadge(user.role)}>
                      {getRoleIcon(user.role)}
                      <span style={{ marginLeft: '0.25rem' }}>
                        {user.role === 'admin' ? 'Administrador' : 
                         user.role === 'kitchen' ? 'Cocina' : 'Mesero'}
                      </span>
                    </span>
                  </td>
                  <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {new Date(user.created_at).toLocaleDateString('es-ES')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Usuarios
