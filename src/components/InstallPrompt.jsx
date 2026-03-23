import { useState, useEffect } from 'react'
import { Download, X, Smartphone } from 'lucide-react'

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Detectar iOS
    const isAppleDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    setIsIOS(isAppleDevice)

    // Escuchar evento de instalación (Android/Chrome)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      
      // Mostrar después de 3 segundos si el usuario no ha instalado
      const hasInstalled = localStorage.getItem('pwaInstalled')
      if (!hasInstalled) {
        setTimeout(() => setShowPrompt(true), 3000)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Verificar si ya está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      localStorage.setItem('pwaInstalled', 'true')
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      console.log('[PWA] Resultado de instalación:', outcome)
      setDeferredPrompt(null)
      setShowPrompt(false)
      
      if (outcome === 'accepted') {
        localStorage.setItem('pwaInstalled', 'true')
      }
    }
  }

  const handleClose = () => {
    setShowPrompt(false)
    // No mostrar de nuevo por 7 días
    localStorage.setItem('pwaPromptDismissed', Date.now() + (7 * 24 * 60 * 60 * 1000))
  }

  // Verificar si el usuario descartó el prompt recientemente
  useEffect(() => {
    const dismissed = localStorage.getItem('pwaPromptDismissed')
    if (dismissed && Date.now() < parseInt(dismissed)) {
      setShowPrompt(false)
    }
  }, [])

  // No mostrar si ya está instalado o no hay prompt
  if (!showPrompt && !isIOS) return null

  return (
    <>
      {/* Banner para Android/Chrome */}
      {!isIOS && showPrompt && deferredPrompt && (
        <div style={{
          position: 'fixed',
          bottom: '1rem',
          left: '1rem',
          right: '1rem',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: 'white',
          padding: '1rem 1.25rem',
          borderRadius: '0.75rem',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)',
          animation: 'slideUp 0.3s ease-out'
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
          }}>
            <Smartphone size={24} style={{color: 'white'}} />
          </div>
          
          <div style={{flex: 1}}>
            <div style={{fontWeight: 700, fontSize: '0.925rem', marginBottom: '0.25rem'}}>
              📲 Instala la App
            </div>
            <div style={{fontSize: '0.75rem', color: '#94a3b8'}}>
              Acceso rápido desde tu pantalla de inicio
            </div>
          </div>
          
          <div style={{display: 'flex', gap: '0.5rem'}}>
            <button
              onClick={handleClose}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#94a3b8',
                padding: '0.5rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
            <button
              onClick={handleInstallClick}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                padding: '0.625rem 1rem',
                fontWeight: 600
              }}
            >
              <Download size={18} />
              Instalar
            </button>
          </div>
        </div>
      )}

      {/* Banner para iOS */}
      {isIOS && (
        <div style={{
          position: 'fixed',
          bottom: '1rem',
          left: '1rem',
          right: '1rem',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: 'white',
          padding: '1rem 1.25rem',
          borderRadius: '0.75rem',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)',
          animation: 'slideUp 0.3s ease-out'
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
          }}>
            <Smartphone size={24} style={{color: 'white'}} />
          </div>
          
          <div style={{flex: 1}}>
            <div style={{fontWeight: 700, fontSize: '0.925rem', marginBottom: '0.25rem'}}>
              🍎 Instala en iPhone
            </div>
            <div style={{fontSize: '0.75rem', color: '#94a3b8'}}>
              Toca Compartir → "Agregar a inicio"
            </div>
          </div>
          
          <button
            onClick={handleClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#94a3b8',
              padding: '0.5rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </>
  )
}

export default InstallPrompt
