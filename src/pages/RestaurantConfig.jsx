import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useRestaurant } from '../context/RestaurantContext'
import { useToast } from '../context/ToastContext'
import { Save, Upload, Palette, Type, Image } from 'lucide-react'

function RestaurantConfig() {
  const { profile } = useAuth()
  const { restaurant, updateRestaurantConfig } = useRestaurant()
  const toast = useToast()

  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState({
    name: '',
    logo_url: '',
    primary_color: '#dc2626'
  })

  useEffect(() => {
    if (restaurant) {
      setConfig({
        name: restaurant.name || '',
        logo_url: restaurant.logo_url || '',
        primary_color: restaurant.primary_color || '#dc2626'
      })
    }
  }, [restaurant])

  async function handleSave(e) {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await updateRestaurantConfig(config)
      
      if (result.success) {
        toast.success('✅ Configuración guardada correctamente')
      } else {
        toast.error('Error al guardar: ' + result.error)
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al guardar configuración')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogoUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    // Validar que sea imagen
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor sube un archivo de imagen')
      return
    }

    // Validar tamaño (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen debe pesar menos de 2MB')
      return
    }

    try {
      setLoading(true)

      // Crear nombre único para el archivo
      const fileExt = file.name.split('.').pop()
      const fileName = `${restaurant.id}-${Date.now()}.${fileExt}`
      const filePath = `logos/${fileName}`

      // Subir a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Obtener URL pública del logo
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath)

      // Actualizar configuración con la URL del logo
      const updatedConfig = { ...config, logo_url: publicUrl }
      setConfig(updatedConfig)

      // Guardar en la base de datos
      const result = await updateRestaurantConfig(updatedConfig)
      
      if (result.success) {
        toast.success('✅ Logo subido y guardado correctamente')
      } else {
        toast.error('Error al guardar: ' + result.error)
      }
    } catch (error) {
      console.error('Error al subir logo:', error)
      toast.error('Error al subir logo: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Colores predefinidos
  const presetColors = [
    { value: '#dc2626', label: 'Rojo', bg: '#fef2f2' },
    { value: '#2563eb', label: 'Azul', bg: '#eff6ff' },
    { value: '#16a34a', label: 'Verde', bg: '#f0fdf4' },
    { value: '#d97706', label: 'Ámbar', bg: '#fffbeb' },
    { value: '#9333ea', label: 'Violeta', bg: '#faf5ff' },
    { value: '#db2777', label: 'Rosado', bg: '#fdf2f8' },
    { value: '#0891b2', label: 'Cian', bg: '#ecfeff' },
    { value: '#475569', label: 'Gris', bg: '#f8fafc' }
  ]

  if (!restaurant) {
    return (
      <div className="fade-in">
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">⏳</div>
            <h3>Cargando configuración...</h3>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2>🎨 Configuración del Restaurante</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Personaliza el nombre, logo y colores de tu restaurante
          </p>
        </div>
      </div>

      {/* Vista previa */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>👁️ Vista Previa</h3>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1.5rem',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '0.75rem',
          color: 'white'
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '8px',
            background: `linear-gradient(135deg, ${config.primary_color} 0%, ${config.primary_color}dd 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            overflow: 'hidden'
          }}>
            {config.logo_url ? (
              <div style={{
                width: '100%',
                height: '100%',
                background: 'white',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px'
              }}>
                <img 
                  src={config.logo_url} 
                  alt="Logo" 
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain'
                  }} 
                />
              </div>
            ) : (
              <span style={{fontSize:24}}>🍽️</span>
            )}
          </div>
          <div>
            <div style={{fontWeight:700,fontSize:'0.9rem'}}>{config.name || 'Nombre del Restaurante'}</div>
            <div style={{fontSize:'0.65rem',opacity:0.7,textTransform:'uppercase'}}>Restaurante</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave}>
        {/* Nombre del Restaurante */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>
            <Type size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
            Nombre del Restaurante
          </h3>
          <input
            type="text"
            className="form-control"
            value={config.name}
            onChange={(e) => setConfig({ ...config, name: e.target.value })}
            placeholder="Ej: Sabor Latino, El Rincón del Sabor..."
            required
            style={{ fontSize: '1rem', padding: '0.75rem' }}
          />
        </div>

        {/* Logo */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>
            <Image size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
            Logo del Restaurante
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
            alignItems: 'center'
          }}>
            {/* Vista previa del logo */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
              background: 'var(--background)',
              borderRadius: '0.75rem',
              border: '2px dashed var(--border)'
            }}>
              {config.logo_url ? (
                <img 
                  src={config.logo_url} 
                  alt="Logo" 
                  style={{ maxWidth: '150px', maxHeight: '150px', objectFit: 'contain' }} 
                />
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <div style={{ fontSize: 48, marginBottom: '0.5rem' }}>🍽️</div>
                  <div style={{ fontSize: '0.875rem' }}>Sin logo</div>
                </div>
              )}
            </div>

            {/* Upload */}
            <div>
              <label 
                htmlFor="logo-upload"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '1rem',
                  background: 'var(--primary)',
                  color: 'white',
                  borderRadius: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'var(--primary-dark)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'var(--primary)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <Upload size={20} />
                <span>Subir Logo</span>
              </label>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                style={{ display: 'none' }}
              />
              
              <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <div>✅ Formatos: PNG, JPG, SVG</div>
                <div>✅ Tamaño máximo: 2MB</div>
                <div>✅ Recomendado: 200x200px</div>
              </div>

              {config.logo_url && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setConfig({ ...config, logo_url: '' })}
                  style={{ marginTop: '1rem', width: '100%' }}
                >
                  🗑️ Quitar Logo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Colores */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>
            <Palette size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
            Colores de Marca
          </h3>

          {/* Color Primario */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
              Color Primario
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
              {presetColors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setConfig({ ...config, primary_color: color.value })}
                  style={{
                    padding: '0.75rem',
                    background: color.bg,
                    border: config.primary_color === color.value 
                      ? `3px solid ${color.value}` 
                      : '2px solid transparent',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    transform: config.primary_color === color.value ? 'scale(1.05)' : 'scale(1)'
                  }}
                >
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: color.value,
                    margin: '0 auto 0.25rem'
                  }} />
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)' }}>
                    {color.label}
                  </div>
                </button>
              ))}
            </div>
            <input
              type="color"
              value={config.primary_color}
              onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
              style={{ marginTop: '0.75rem', width: '100%', height: '40px', cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Botón Guardar */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setConfig({
                name: restaurant.name || '',
                logo_url: restaurant.logo_url || '',
                primary_color: restaurant.primary_color || '#dc2626'
              })
              toast.info('Cambios descartados')
            }}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 2rem'
            }}
          >
            <Save size={20} />
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default RestaurantConfig
