import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { MessageCircle, CheckCircle, XCircle, TestTube, Save } from 'lucide-react'

function Configuracion() {
  const { profile } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [whatsappConfig, setWhatsappConfig] = useState({
    accessToken: '',
    phoneNumberId: '',
    businessAccountId: '',
    webhookVerifyToken: ''
  })
  const [connectionStatus, setConnectionStatus] = useState(null)

  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    try {
      // Cargar desde localStorage
      const saved = localStorage.getItem('whatsappConfig')
      if (saved) {
        setWhatsappConfig(JSON.parse(saved))
      }
    } catch (error) {
      console.error('Error loading config:', error)
    }
  }

  async function saveConfig() {
    try {
      setLoading(true)
      localStorage.setItem('whatsappConfig', JSON.stringify(whatsappConfig))
      toast.success('Configuración guardada')
    } catch (error) {
      toast.error('Error al guardar: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function testConnection() {
    try {
      setTesting(true)
      
      // Probar conexión con WhatsApp API
      const response = await fetch(
        `https://graph.facebook.com/v17.0/${whatsappConfig.phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${whatsappConfig.accessToken}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setConnectionStatus('connected')
        toast.success(`✅ Conectado a: ${data.name || 'WhatsApp Business'}`)
      } else {
        setConnectionStatus('error')
        toast.error('❌ Error de conexión. Verifica tus credenciales.')
      }
    } catch (error) {
      setConnectionStatus('error')
      toast.error('Error de conexión: ' + error.message)
    } finally {
      setTesting(false)
    }
  }

  async function sendTestMessage() {
    if (!whatsappConfig.phoneNumberId || !whatsappConfig.accessToken) {
      toast.warning('Configura las credenciales primero')
      return
    }

    const testPhone = prompt('Número de teléfono para prueba (con código de país):')
    if (!testPhone) return

    try {
      setTesting(true)
      
      const response = await fetch(
        `https://graph.facebook.com/v17.0/${whatsappConfig.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${whatsappConfig.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: testPhone.replace(/[^0-9]/g, ''),
            type: 'text',
            text: {
              body: '🧪 *Mensaje de Prueba*\n\nEste es un mensaje de prueba desde el sistema POS del restaurante.\n\n¡Configuración exitosa! ✅'
            }
          })
        }
      )

      const result = await response.json()

      if (result.messages && result.messages.length > 0) {
        toast.success('✅ Mensaje de prueba enviado correctamente')
      } else {
        toast.error('❌ Error al enviar: ' + JSON.stringify(result))
      }
    } catch (error) {
      toast.error('Error: ' + error.message)
    } finally {
      setTesting(false)
    }
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

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2>⚙️ Configuración de WhatsApp</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Configura WhatsApp Business API para enviar recordatorios automáticos
          </p>
        </div>
      </div>

      {/* Estado de conexión */}
      {connectionStatus && (
        <div className={`card ${connectionStatus === 'connected' ? 'success' : 'error'}`} style={{
          marginBottom: '1.5rem',
          borderLeft: `4px solid ${connectionStatus === 'connected' ? 'var(--success)' : 'var(--danger)'}`,
          background: connectionStatus === 'connected' ? 'var(--success-light)' : 'var(--danger-light)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {connectionStatus === 'connected' ? (
              <CheckCircle size={32} style={{ color: 'var(--success)' }} />
            ) : (
              <XCircle size={32} style={{ color: 'var(--danger)' }} />
            )}
            <div>
              <h3 style={{ margin: 0 }}>
                {connectionStatus === 'connected' ? '✅ Conectado a WhatsApp' : '❌ Error de Conexión'}
              </h3>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>
                {connectionStatus === 'connected' 
                  ? 'El sistema está conectado correctamente a WhatsApp Business API' 
                  : 'Verifica tus credenciales e intenta nuevamente'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Configuración de Credenciales */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageCircle size={24} /> Credenciales de WhatsApp
          </h3>

          <div className="form-group">
            <label>Access Token *</label>
            <input
              type="password"
              className="form-control"
              value={whatsappConfig.accessToken}
              onChange={(e) => setWhatsappConfig({ ...whatsappConfig, accessToken: e.target.value })}
              placeholder="EABc... (Token de Meta Developers)"
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Lo obtienes en <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer">Meta Developers</a> → Tu App → WhatsApp → API Setup
            </p>
          </div>

          <div className="form-group">
            <label>Phone Number ID *</label>
            <input
              type="text"
              className="form-control"
              value={whatsappConfig.phoneNumberId}
              onChange={(e) => setWhatsappConfig({ ...whatsappConfig, phoneNumberId: e.target.value })}
              placeholder="Ej: 593999999999"
            />
          </div>

          <div className="form-group">
            <label>Business Account ID</label>
            <input
              type="text"
              className="form-control"
              value={whatsappConfig.businessAccountId}
              onChange={(e) => setWhatsappConfig({ ...whatsappConfig, businessAccountId: e.target.value })}
              placeholder="Opcional"
            />
          </div>

          <div className="form-group">
            <label>Webhook Verify Token</label>
            <input
              type="text"
              className="form-control"
              value={whatsappConfig.webhookVerifyToken}
              onChange={(e) => setWhatsappConfig({ ...whatsappConfig, webhookVerifyToken: e.target.value })}
              placeholder="Para recibir mensajes (opcional)"
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button 
              className="btn btn-primary" 
              onClick={saveConfig}
              disabled={loading}
            >
              <Save size={18} /> {loading ? 'Guardando...' : 'Guardar Configuración'}
            </button>
            <button 
              className="btn btn-outline" 
              onClick={testConnection}
              disabled={testing || !whatsappConfig.accessToken || !whatsappConfig.phoneNumberId}
            >
              <TestTube size={18} /> {testing ? 'Probando...' : 'Probar Conexión'}
            </button>
          </div>
        </div>

        {/* Enviar Mensaje de Prueba */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TestTube size={24} /> Enviar Mensaje de Prueba
          </h3>

          <div style={{ padding: '1rem', background: 'var(--background)', borderRadius: '0.5rem', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.875rem', marginBottom: '0.5rem' }}>📋 Instrucciones:</h4>
            <ol style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, paddingLeft: '1.25rem' }}>
              <li>Obtén tus credenciales en Meta Developers</li>
              <li>Guarda la configuración</li>
              <li>Prueba la conexión</li>
              <li>Envía un mensaje de prueba a tu número</li>
            </ol>
          </div>

          <div style={{ padding: '1rem', background: 'var(--warning-light)', borderRadius: '0.5rem', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--warning)', marginBottom: '0.5rem' }}>⚠️ Importante:</h4>
            <ul style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, paddingLeft: '1.25rem' }}>
              <li>El número de prueba debe incluir código de país (ej: +593999999999)</li>
              <li>En modo sandbox, solo puedes enviar a números verificados</li>
              <li>Los mensajes tienen plantilla pre-aprobada en producción</li>
            </ul>
          </div>

          <button 
            className="btn btn-success" 
            style={{ width: '100%' }}
            onClick={sendTestMessage}
            disabled={testing || !whatsappConfig.accessToken || !whatsappConfig.phoneNumberId}
          >
            <MessageCircle size={18} /> {testing ? 'Enviando...' : 'Enviar Mensaje de Prueba'}
          </button>
        </div>
      </div>

      {/* Guía de Configuración */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>📖 Guía de Configuración Paso a Paso</h3>
        
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'var(--background)', borderRadius: '0.5rem' }}>
            <h4 style={{ margin: 0, marginBottom: '0.5rem' }}>Paso 1: Crear App en Meta Developers</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
              Ve a <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer">developers.facebook.com</a>, inicia sesión y crea una nueva app tipo "Business".
            </p>
          </div>

          <div style={{ padding: '1rem', background: 'var(--background)', borderRadius: '0.5rem' }}>
            <h4 style={{ margin: 0, marginBottom: '0.5rem' }}>Paso 2: Agregar WhatsApp</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
              En tu app, busca "WhatsApp" en productos y haz click en "Set Up". Selecciona tu cuenta de WhatsApp Business.
            </p>
          </div>

          <div style={{ padding: '1rem', background: 'var(--background)', borderRadius: '0.5rem' }}>
            <h4 style={{ margin: 0, marginBottom: '0.5rem' }}>Paso 3: Verificar Número</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
              Ve a "WhatsApp → API Setup", agrega tu número y verifícalo con el código SMS que te enviarán.
            </p>
          </div>

          <div style={{ padding: '1rem', background: 'var(--background)', borderRadius: '0.5rem' }}>
            <h4 style={{ margin: 0, marginBottom: '0.5rem' }}>Paso 4: Obtener Credenciales</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
              Copia el "Access Token" (temporal o permanente) y el "Phone Number ID" que aparecen en API Setup.
            </p>
          </div>

          <div style={{ padding: '1rem', background: 'var(--background)', borderRadius: '0.5rem' }}>
            <h4 style={{ margin: 0, marginBottom: '0.5rem' }}>Paso 5: Configurar en el Sistema</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
              Pega tus credenciales en este formulario, guarda y prueba la conexión.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Configuracion
