import { useState, useEffect } from 'react'

export function useServiceWorker() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [serviceWorker, setServiceWorker] = useState(null)

  useEffect(() => {
    // Solo registrar en producción y si el navegador lo soporta
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      registerServiceWorker()
    }

    // Escuchar eventos de conexión
    const handleOnline = () => {
      setIsOnline(true)
      console.log('🟢 Conexión restaurada')
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      console.log('🔴 Sin conexión')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  async function registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      console.log('[PWA] Service Worker registrado:', registration.scope)
      setServiceWorker(registration)

      // Escuchar actualizaciones
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        console.log('[PWA] Actualización disponible')

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateAvailable(true)
            console.log('[PWA] Nueva versión lista para instalar')
          }
        })
      })

      // Escuchar mensajes del SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'UPDATE_READY') {
          setUpdateAvailable(true)
        }
      })

    } catch (error) {
      console.error('[PWA] Error al registrar Service Worker:', error)
    }
  }

  function updateServiceWorker() {
    if (serviceWorker) {
      serviceWorker.waiting?.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }

  return {
    isOnline,
    updateAvailable,
    updateServiceWorker
  }
}

export default useServiceWorker
