import { useState, useEffect } from 'react'
import { Download, X, Smartphone } from 'lucide-react'
import { useLocation } from 'react-router-dom'

function InstallPrompt() {
  const location = useLocation()
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Solo mostrar en la página de login
    if (location.pathname !== '/login') {
      setShowPrompt(false)
      return
    }

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
  }, [location.pathname])

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
          top: '1rem',
          left: '1rem',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: 'white',
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          border: '1px solid rgba(255,255,255,0.1)',
          animation: 'slideInLeft 0.4s ease-out',
          maxWidth: '380px'
        }}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1}}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Smartphone size={18} style={{color: 'white'}} />
            </div>
            <div style={{flex: 1, minWidth: 0}}>
              <div style={{fontWeight: 600, fontSize: '0.8125rem', whiteSpace: 'nowrap'}}>
                Instala la App
              </div>
            </div>
          </div>
          
          <div style={{display: 'flex', gap: '0.5rem', flexShrink: 0}}>
            <button
              onClick={handleClose}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: 'white',
                padding: '0.5rem',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '36px',
                height: '36px',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.25)'}
              onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'}
            >
              <X size={18} />
            </button>
            <button
              onClick={handleInstallClick}
              className="btn btn-primary"
              style={{
                fontSize: '0.8125rem',
                padding: '0.5rem 0.875rem',
                fontWeight: 600,
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Download size={16} />
              Instalar
            </button>
          </div>
        </div>
      )}

      {/* Banner para iOS */}
      {isIOS && (
        <div style={{
          position: 'fixed',
          top: '1rem',
          left: '1rem',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: 'white',
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          border: '1px solid rgba(255,255,255,0.1)',
          animation: 'slideInLeft 0.4s ease-out',
          maxWidth: '380px'
        }}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1}}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Smartphone size={18} style={{color: 'white'}} />
            </div>
            <div style={{flex: 1, minWidth: 0}}>
              <div style={{fontWeight: 600, fontSize: '0.8125rem', whiteSpace: 'nowrap'}}>
                Instala la App
              </div>
            </div>
          </div>

          <div style={{display: 'flex', gap: '0.5rem', flexShrink: 0}}>
            <button
              onClick={handleClose}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: 'white',
                padding: '0.5rem',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '36px',
                height: '36px',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.25)'}
              onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'}
            >
              <X size={18} />
            </button>
            <button
              onClick={handleInstallClick}
              className="btn btn-primary"
              style={{
                fontSize: '0.8125rem',
                padding: '0.5rem 0.875rem',
                fontWeight: 600,
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Download size={16} />
              Instalar
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default InstallPrompt
