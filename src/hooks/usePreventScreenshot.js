import { useEffect } from 'react'

/**
 * Hook para prevenir capturas de pantalla en dispositivos móviles
 * Nota: Esto es una medida disuasoria, no 100% infalible
 */
export function usePreventScreenshot() {
  useEffect(() => {
    // Prevenir tecla PrintScreen en desktop
    const handleKeyDown = (e) => {
      if (e.key === 'PrintScreen') {
        e.preventDefault()
        alert('📸 Las capturas de pantalla están deshabilitadas por seguridad')
      }
    }

    // Prevenir cuando la página pierde visibilidad (algunas apps de screenshot)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.warn('⚠️ La aplicación perdió visibilidad')
      }
    }

    // Prevenir contexto de clic derecho (desktop)
    const handleContextMenu = (e) => {
      e.preventDefault()
      return false
    }

    // Agregar listeners
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('contextmenu', handleContextMenu)

    // Meta tag para prevenir screenshots en Android (Chrome)
    const metaScreenCapture = document.createElement('meta')
    metaScreenCapture.name = 'screen-orientation'
    metaScreenCapture.content = 'portrait'
    document.head.appendChild(metaScreenCapture)

    // Limpieza
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.head.removeChild(metaScreenCapture)
    }
  }, [])
}

export default usePreventScreenshot
