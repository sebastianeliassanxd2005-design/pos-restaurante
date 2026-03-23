import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from './ToastContext'

const AuthContext = createContext({})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()
  
  // Tiempo de expiración de sesión: 8 horas (en milisegundos)
  const SESSION_DURATION = 8 * 60 * 60 * 1000
  const SESSION_KEY = 'pos_session_timestamp'
  
  // Sistema de bloqueo por intentos fallidos
  const MAX_LOGIN_ATTEMPTS = 5  // Máximo 5 intentos
  const LOCKOUT_DURATION = 15 * 60 * 1000  // 15 minutos de bloqueo
  const ATTEMPTS_KEY = 'pos_login_attempts'
  const LOCKOUT_KEY = 'pos_lockout_until'
  
  // Usar sessionStorage en lugar de localStorage para cerrar al cerrar navegador
  const storage = sessionStorage

  useEffect(() => {
    // Verificar sesión activa y su tiempo
    checkSession()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
        // Guardar timestamp de inicio de sesión (se borra al cerrar navegador)
        storage.setItem(SESSION_KEY, Date.now().toString())
      } else {
        setProfile(null)
        storage.removeItem(SESSION_KEY)
      }
    })
    
    // Detectar cierre de pestaña/ventana para limpiar sesión
    const handleBeforeUnload = () => {
      // Opcional: Limpiar sesión al cerrar
      // localStorage.removeItem(SESSION_KEY)
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])
  
  // Verificar expiración de sesión periódicamente
  useEffect(() => {
    const checkExpiration = setInterval(() => {
      const sessionStart = storage.getItem(SESSION_KEY)
      if (sessionStart) {
        const elapsed = Date.now() - parseInt(sessionStart)
        if (elapsed > SESSION_DURATION) {
          console.log('[Auth] Sesión expirada por tiempo')
          signOut()
          toast.info('Tu sesión ha expirado. Por favor inicia sesión nuevamente.')
        }
      }
    }, 60000) // Verificar cada minuto
    
    return () => clearInterval(checkExpiration)
  }, [])

  async function checkSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      // Verificar si la sesión expiró por tiempo
      const sessionStart = storage.getItem(SESSION_KEY)
      if (session && sessionStart) {
        const elapsed = Date.now() - parseInt(sessionStart)
        if (elapsed > SESSION_DURATION) {
          console.log('[Auth] Sesión expirada al verificar')
          await signOut()
          toast.info('Tu sesión ha expirado. Por favor inicia sesión nuevamente.')
          return
        }
      }
      
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id)
      }
    } catch (error) {
      console.error('Error checking session:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // Verificar si el usuario está bloqueado
  function checkLockout() {
    const lockoutUntil = localStorage.getItem(LOCKOUT_KEY)
    if (lockoutUntil) {
      const lockoutTime = parseInt(lockoutUntil)
      if (Date.now() < lockoutTime) {
        // Aún está bloqueado
        const remainingMinutes = Math.ceil((lockoutTime - Date.now()) / 60000)
        return {
          isLocked: true,
          remainingMinutes
        }
      } else {
        // El bloqueo ya expiró, limpiar
        localStorage.removeItem(LOCKOUT_KEY)
        localStorage.removeItem(ATTEMPTS_KEY)
      }
    }
    return { isLocked: false, remainingMinutes: 0 }
  }
  
  // Registrar intento fallido
  function recordFailedAttempt() {
    const attempts = parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0') + 1
    localStorage.setItem(ATTEMPTS_KEY, attempts.toString())
    
    console.log(`[Auth] Intento fallido #${attempts}`)
    
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      // Bloquear usuario
      const lockoutUntil = Date.now() + LOCKOUT_DURATION
      localStorage.setItem(LOCKOUT_KEY, lockoutUntil.toString())
      console.log('[Auth] Usuario bloqueado por 15 minutos')
      return {
        locked: true,
        attempts: attempts,
        lockoutMinutes: 15
      }
    }
    
    return {
      locked: false,
      attempts: attempts,
      remainingAttempts: MAX_LOGIN_ATTEMPTS - attempts
    }
  }
  
  // Resetear intentos después de login exitoso
  function resetLoginAttempts() {
    localStorage.removeItem(ATTEMPTS_KEY)
    localStorage.removeItem(LOCKOUT_KEY)
  }

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('Error fetching profile:', error)
        return
      }
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  async function signIn(email, password) {
    try {
      // Verificar si está bloqueado antes de intentar login
      const lockoutStatus = checkLockout()
      if (lockoutStatus.isLocked) {
        return {
          success: false,
          error: `Cuenta bloqueada por ${lockoutStatus.remainingMinutes} minutos. Intenta más tarde.`,
          locked: true,
          remainingMinutes: lockoutStatus.remainingMinutes
        }
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        // Intento fallido - registrar
        const result = recordFailedAttempt()
        
        if (result.locked) {
          toast.error(`🔒 Cuenta bloqueada por ${result.lockoutMinutes} minutos después de ${result.attempts} intentos fallidos`)
          return {
            success: false,
            error: `Cuenta bloqueada por ${result.lockoutMinutes} minutos. Intenta más tarde.`,
            locked: true,
            attempts: result.attempts
          }
        } else {
          const msg = `⚠️ Credenciales incorrectas. Te quedan ${result.remainingAttempts} intento(s)`
          toast.error(msg)
          return {
            success: false,
            error: msg,
            attempts: result.attempts,
            remainingAttempts: result.remainingAttempts
          }
        }
      }

      // Login exitoso - resetear contadores
      resetLoginAttempts()
      toast.success(`Bienvenido, ${data.user.email}`)
      return { success: true }
    } catch (error) {
      console.error('Error signing in:', error)
      toast.error('Error al iniciar sesión: ' + error.message)
      return { success: false, error: error.message }
    }
  }

  async function signUp(email, password, fullName, role = 'waiter') {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      })

      if (error) throw error

      // Crear perfil del usuario
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: data.user.id,
            email: email,
            full_name: fullName,
            role: role
          }])

        if (profileError) throw profileError
      }

      toast.success('Cuenta creada. Verifica tu email.')
      return { success: true }
    } catch (error) {
      console.error('Error signing up:', error)
      toast.error('Error al crear cuenta: ' + error.message)
      return { success: false, error: error.message }
    }
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      setUser(null)
      setProfile(null)
      toast.success('Sesión cerrada')
    } catch (error) {
      console.error('Error signing out:', error)
      toast.error('Error al cerrar sesión')
    }
  }

  async function resetPassword(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password'
      })

      if (error) throw error

      toast.success('Correo de recuperación enviado')
      return { success: true }
    } catch (error) {
      console.error('Error resetting password:', error)
      toast.error('Error: ' + error.message)
      return { success: false, error: error.message }
    }
  }

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    isAdmin: profile?.role === 'admin',
    isWaiter: profile?.role === 'waiter',
    isKitchen: profile?.role === 'kitchen'
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
