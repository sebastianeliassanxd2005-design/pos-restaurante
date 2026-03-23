import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Trash2, AlertTriangle, CheckCircle, Database, Download, Upload, FileJson } from 'lucide-react'

function Sistema() {
  const { profile } = useAuth()
  const toast = useToast()
  const [resetting, setResetting] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [stats, setStats] = useState({
    mesas: 0,
    reservas: 0,
    pedidos: 0,
    productos: 0,
    usuarios: 0
  })
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      const { count: mesas } = await supabase.from('tables').select('*', { count: 'exact', head: true })
      const { count: reservas } = await supabase.from('reservations').select('*', { count: 'exact', head: true })
      const { count: pedidos } = await supabase.from('orders').select('*', { count: 'exact', head: true })
      const { count: productos } = await supabase.from('products').select('*', { count: 'exact', head: true })
      const { count: usuarios } = await supabase.from('profiles').select('*', { count: 'exact', head: true })

      setStats({
        mesas: mesas || 0,
        reservas: reservas || 0,
        pedidos: pedidos || 0,
        productos: productos || 0,
        usuarios: usuarios || 0
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  async function handleExport() {
    try {
      setExporting(true)
      toast.info('Exportando datos...')

      // Exportar todas las tablas
      const { data: mesas } = await supabase.from('tables').select('*')
      const { data: reservas } = await supabase.from('reservations').select('*')
      const { data: pedidos } = await supabase.from('orders').select('*')
      const { data: orderItems } = await supabase.from('order_items').select('*')
      const { data: productos } = await supabase.from('products').select('*')
      const { data: categorias } = await supabase.from('categories').select('*')

      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        tables: mesas || [],
        reservations: reservas || [],
        orders: pedidos || [],
        orderItems: orderItems || [],
        products: productos || [],
        categories: categorias || []
      }

      // Crear archivo JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pos-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('✅ Datos exportados correctamente')
    } catch (error) {
      console.error('Error exporting:', error)
      toast.error('Error al exportar: ' + error.message)
    } finally {
      setExporting(false)
    }
  }

  async function handleImport(event) {
    const file = event.target.files[0]
    if (!file) return

    try {
      setImporting(true)
      toast.info('Importando datos...')

      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const importData = JSON.parse(e.target.result)

          // Validar estructura
          if (!importData.tables || !importData.reservations) {
            throw new Error('Archivo inválido')
          }

          // Importar categorías
          if (importData.categories?.length > 0) {
            const { error } = await supabase.from('categories').upsert(importData.categories, { onConflict: 'id' })
            if (error) throw error
          }

          // Importar productos
          if (importData.products?.length > 0) {
            const { error } = await supabase.from('products').upsert(importData.products, { onConflict: 'id' })
            if (error) throw error
          }

          // Importar mesas
          if (importData.tables?.length > 0) {
            const { error } = await supabase.from('tables').upsert(importData.tables, { onConflict: 'id' })
            if (error) throw error
          }

          // Importar reservas
          if (importData.reservations?.length > 0) {
            const { error } = await supabase.from('reservations').upsert(importData.reservations, { onConflict: 'id' })
            if (error) throw error
          }

          // Importar pedidos
          if (importData.orders?.length > 0) {
            const { error } = await supabase.from('orders').upsert(importData.orders, { onConflict: 'id' })
            if (error) throw error
          }

          // Importar items de pedidos
          if (importData.orderItems?.length > 0) {
            const { error } = await supabase.from('order_items').upsert(importData.orderItems, { onConflict: 'id' })
            if (error) throw error
          }

          toast.success('✅ Datos importados correctamente')
          loadStats()
        } catch (error) {
          console.error('Error parsing JSON:', error)
          toast.error('Error al importar: Archivo inválido')
        }
      }
      reader.readAsText(file)
    } catch (error) {
      console.error('Error importing:', error)
      toast.error('Error al importar: ' + error.message)
    } finally {
      setImporting(false)
      event.target.value = ''
    }
  }

  async function handleReset() {
    if (confirmText !== 'RESET') {
      toast.warning('Escribe "RESET" para confirmar')
      return
    }

    if (!confirm('⚠️ ¿Estás SEGURO de que quieres resetear TODO el sistema? Esta acción NO se puede deshacer.')) {
      return
    }

    try {
      setResetting(true)

      // 1. Eliminar order_items
      const { error: error1 } = await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error1) throw error1

      // 2. Eliminar orders
      const { error: error2 } = await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error2) throw error2

      // 3. Eliminar reservation_items
      const { error: error3 } = await supabase.from('reservation_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error3) throw error3

      // 4. Eliminar reservations
      const { error: error4 } = await supabase.from('reservations').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error4) throw error4

      // 5. Resetear mesas
      const { error: error5 } = await supabase.from('tables').update({ status: 'available' }).neq('id', '00000000-0000-0000-0000-000000000000')
      if (error5) throw error5

      toast.success('✅ Sistema reseteado correctamente')
      setConfirmText('')
      loadStats()
      
      setTimeout(() => {
        window.location.reload()
      }, 2000)

    } catch (error) {
      console.error('Error en reset:', error)
      toast.error('Error al resetear: ' + error.message)
    } finally {
      setResetting(false)
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
          <h2>⚙️ Administración del Sistema</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Herramientas de administración, backup y mantenimiento
          </p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="label">🪑 Mesas</div>
          <div className="value">{stats.mesas}</div>
        </div>
        <div className="stat-card">
          <div className="label">📅 Reservas</div>
          <div className="value">{stats.reservas}</div>
        </div>
        <div className="stat-card">
          <div className="label">📄 Pedidos</div>
          <div className="value">{stats.pedidos}</div>
        </div>
        <div className="stat-card">
          <div className="label">🍽️ Productos</div>
          <div className="value">{stats.productos}</div>
        </div>
        <div className="stat-card">
          <div className="label">👥 Usuarios</div>
          <div className="value">{stats.usuarios}</div>
        </div>
      </div>

      {/* Exportar/Importar */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Exportar */}
        <div className="card" style={{ border: '2px solid var(--info)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <Download size={32} style={{ color: 'var(--info)' }} />
            <div>
              <h3 style={{ margin: 0 }}>📥 Exportar Datos</h3>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Descarga una copia de seguridad de todos los datos
              </p>
            </div>
          </div>

          <div style={{ padding: '1rem', background: 'var(--background)', borderRadius: '0.5rem', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Se exportará:</h4>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <li>Mesas</li>
              <li>Reservas</li>
              <li>Pedidos</li>
              <li>Items de pedidos</li>
              <li>Productos</li>
              <li>Categorías</li>
            </ul>
          </div>

          <button
            className="btn btn-info"
            onClick={handleExport}
            disabled={exporting}
            style={{ width: '100%' }}
          >
            {exporting ? (
              <>
                <span className="spinner-small" style={{ marginRight: '0.5rem' }}></span>
                Exportando...
              </>
            ) : (
              <>
                <Download size={18} style={{ marginRight: '0.5rem' }} />
                Exportar Datos
              </>
            )}
          </button>
        </div>

        {/* Importar */}
        <div className="card" style={{ border: '2px solid var(--warning)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <Upload size={32} style={{ color: 'var(--warning)' }} />
            <div>
              <h3 style={{ margin: 0 }}>📤 Importar Datos</h3>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Restaura datos desde un archivo de backup
              </p>
            </div>
          </div>

          <div style={{ padding: '1rem', background: 'var(--background)', borderRadius: '0.5rem', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Instrucciones:</h4>
            <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <li>Selecciona un archivo .json de backup</li>
              <li>Los datos se actualizarán automáticamente</li>
              <li>Los datos existentes se mantendrán</li>
            </ol>
          </div>

          <label className="btn btn-warning" style={{ width: '100%', cursor: 'pointer' }}>
            <Upload size={18} style={{ marginRight: '0.5rem' }} />
            {importing ? 'Importando...' : 'Seleccionar Archivo'}
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              disabled={importing}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {/* Reset del Sistema */}
      <div className="card" style={{ 
        border: '2px solid var(--danger)',
        background: 'var(--danger-light)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <AlertTriangle size={32} style={{ color: 'var(--danger)' }} />
          <div>
            <h3 style={{ margin: 0, color: 'var(--danger)' }}>🗑️ Reset Completo del Sistema</h3>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Elimina TODOS los datos: pedidos, reservas, mesas. Esta acción NO se puede deshacer.
            </p>
          </div>
        </div>

        <div style={{ 
          padding: '1rem', 
          background: 'var(--surface)', 
          borderRadius: '0.5rem',
          marginBottom: '1rem'
        }}>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem' }}>¿Qué se eliminará?</h4>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <li>✅ Todos los pedidos (órdenes)</li>
            <li>✅ Todos los items de pedidos</li>
            <li>✅ Todas las reservas</li>
            <li>✅ Todos los items de pre-orden</li>
            <li>✅ Estado de las mesas (se resetean a "available")</li>
          </ul>
          <ul style={{ margin: '0.75rem 0 0', paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--success)' }}>
            <li>✅ Productos y categorías (se mantienen)</li>
            <li>✅ Usuarios (se mantienen)</li>
            <li>✅ Mesas (se mantienen, solo se resetea el estado)</li>
          </ul>
        </div>

        <div className="form-group">
          <label style={{ fontWeight: 600 }}>
            Escribe <strong style={{ color: 'var(--danger)' }}>RESET</strong> para confirmar:
          </label>
          <input
            type="text"
            className="form-control"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            placeholder="Escribe RESET aquí"
            style={{ 
              maxWidth: '200px',
              borderColor: confirmText === 'RESET' ? 'var(--success)' : 'var(--border)'
            }}
          />
        </div>

        <button
          className="btn btn-danger"
          onClick={handleReset}
          disabled={resetting || confirmText !== 'RESET'}
          style={{ minWidth: '200px' }}
        >
          {resetting ? (
            <>
              <span className="spinner-small" style={{ marginRight: '0.5rem' }}></span>
              Reseteando...
            </>
          ) : (
            <>
              <Trash2 size={18} style={{ marginRight: '0.5rem' }} />
              Resetear Sistema
            </>
          )}
        </button>
      </div>

      {/* Información del Sistema */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Database size={24} /> Información del Sistema
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'var(--background)', borderRadius: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Usuario</div>
            <div style={{ fontWeight: 600 }}>{profile?.full_name || profile?.email}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{profile?.role}</div>
          </div>
          
          <div style={{ padding: '1rem', background: 'var(--background)', borderRadius: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Versión</div>
            <div style={{ fontWeight: 600 }}>v2.0.0</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>POS Restaurante</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sistema
