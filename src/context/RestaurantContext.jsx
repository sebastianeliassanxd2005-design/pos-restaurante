import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const RestaurantContext = createContext({})

export function useRestaurant() {
  return useContext(RestaurantContext)
}

export function RestaurantProvider({ children }) {
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)

  // Cargar configuración del restaurante
  useEffect(() => {
    loadRestaurantConfig()
  }, [])

  async function loadRestaurantConfig() {
    try {
      // Intentar obtener restaurant_id del usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        // Si no hay usuario, usar restaurante por defecto
        await loadDefaultRestaurant()
        return
      }

      // Obtener restaurant_id del perfil del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('restaurant_id')
        .eq('id', user.id)
        .single()

      if (profile?.restaurant_id) {
        // Cargar configuración del restaurante
        await loadRestaurantById(profile.restaurant_id)
      } else {
        // Si no tiene restaurant_id, usar por defecto
        await loadDefaultRestaurant()
      }
    } catch (error) {
      console.error('Error loading restaurant config:', error)
      await loadDefaultRestaurant()
    } finally {
      setLoading(false)
    }
  }

  async function loadDefaultRestaurant() {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', 'default')
        .single()

      if (error) throw error
      setRestaurant(data)
      
      // Guardar en localStorage para acceso rápido
      localStorage.setItem('current_restaurant', JSON.stringify(data))
    } catch (error) {
      console.error('Error loading default restaurant:', error)
      // Usar configuración por defecto hardcodeada
      setRestaurant({
        id: 'default',
        name: 'POS Restaurante',
        slug: 'default',
        logo_url: '/logo.svg',
        primary_color: '#dc2626',
        secondary_color: '#1e293b'
      })
    }
  }

  async function loadRestaurantById(restaurantId) {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single()

      if (error) throw error
      setRestaurant(data)
      
      // Guardar en localStorage para acceso rápido
      localStorage.setItem('current_restaurant', JSON.stringify(data))
    } catch (error) {
      console.error('Error loading restaurant by ID:', error)
      await loadDefaultRestaurant()
    }
  }

  async function updateRestaurantConfig(updates) {
    try {
      if (!restaurant?.id) throw new Error('No restaurant loaded')

      const { data, error } = await supabase
        .from('restaurants')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', restaurant.id)
        .select()
        .single()

      if (error) throw error

      setRestaurant(data)
      localStorage.setItem('current_restaurant', JSON.stringify(data))
      
      return { success: true }
    } catch (error) {
      console.error('Error updating restaurant:', error)
      return { success: false, error: error.message }
    }
  }

  const value = {
    restaurant,
    loading,
    name: restaurant?.name || 'POS Restaurante',
    logo: restaurant?.logo_url || '/logo.svg',
    primaryColor: restaurant?.primary_color || '#dc2626',
    updateRestaurantConfig
  }

  // Actualizar variables CSS con los colores del restaurante
  useEffect(() => {
    if (restaurant) {
      document.documentElement.style.setProperty('--primary', restaurant.primary_color || '#dc2626')
      document.documentElement.style.setProperty('--primary-dark', adjustColor(restaurant.primary_color || '#dc2626', -20))
      document.documentElement.style.setProperty('--primary-light', adjustColor(restaurant.primary_color || '#dc2626', 80))
    }
  }, [restaurant])

  // Función para aclarar/oscurecer colores hex
  function adjustColor(color, amount) {
    const num = parseInt(color.replace('#', ''), 16)
    const r = Math.max(0, Math.min(255, (num >> 16) + amount))
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount))
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount))
    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`
  }

  return (
    <RestaurantContext.Provider value={value}>
      {!loading && children}
    </RestaurantContext.Provider>
  )
}
