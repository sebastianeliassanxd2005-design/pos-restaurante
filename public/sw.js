// Service Worker para POS Restaurante
// Funcionalidad offline y caché de recursos

const CACHE_NAME = 'pos-restaurante-v1'
const OFFLINE_URL = '/offline.html'

// Recursos para cachear inmediatamente
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
  '/logo.svg',
  '/logo-large.svg'
]

// Instalar Service Worker y cachear recursos estáticos
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...')
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cacheando recursos estáticos')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log('[SW] Instalación completada')
        return self.skipWaiting()
      })
  )
})

// Activar Service Worker y limpiar cachés viejos
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...')
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Eliminando caché vieja:', name)
              return caches.delete(name)
            })
        )
      })
      .then(() => {
        console.log('[SW] Activación completada')
        return self.clients.claim()
      })
  )
})

// Interceptar peticiones de red
self.addEventListener('fetch', (event) => {
  // Solo manejar peticiones GET
  if (event.request.method !== 'GET') return

  // No cachear peticiones a Supabase o APIs externas
  const url = new URL(event.request.url)
  if (url.hostname.includes('supabase.co')) {
    return
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Devolver desde caché y actualizar en segundo plano
          event.waitUntil(updateCache(event.request))
          return cachedResponse
        }

        // No está en caché, intentar red
        return fetchAndCache(event.request)
      })
      .catch(() => {
        // Sin conexión y no está en caché
        if (event.request.destination === 'document') {
          return caches.match(OFFLINE_URL)
        }
        return new Response('Offline', { status: 503 })
      })
  )
})

// Fetch y cachear
async function fetchAndCache(request) {
  const response = await fetch(request)
  
  // Solo cachear respuestas exitosas
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME)
    cache.put(request, response.clone())
  }
  
  return response
}

// Actualizar caché en segundo plano
async function updateCache(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      await cache.put(request, response)
    }
  } catch (error) {
    // Sin conexión, ignorar
  }
}

// Escuchar mensajes de la app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  // Sync de datos en segundo plano
  if (event.data && event.data.type === 'SYNC_DATA') {
    console.log('[SW] Datos para sincronizar:', event.data.payload)
    // Aquí se podría implementar Background Sync
  }
})

console.log('[SW] Service Worker cargado')
