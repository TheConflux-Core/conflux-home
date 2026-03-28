import { useState, useEffect, useCallback, useRef } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { trackEvent, registerDevice } from '../lib/telemetry'

const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? '0.1.0'

function getOsInfo(): string {
  const ua = navigator.userAgent
  if (ua.includes('Windows')) return 'Windows'
  if (ua.includes('Mac')) return 'macOS'
  if (ua.includes('Linux')) return 'Linux'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('iOS') || ua.includes('iPhone')) return 'iOS'
  return 'Unknown'
}

export interface UseAuthReturn {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithEmail: (email: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const hasTrackedOpen = useRef(false)
  const hasTrackedSignup = useRef(false)

  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s)
        setUser(s?.user ?? null)
        setLoading(false)
      },
    )

    return () => subscription.unsubscribe()
  }, [])

  // Fire telemetry on confirmed session
  useEffect(() => {
    if (!user || hasTrackedOpen.current) return
    hasTrackedOpen.current = true

    const osInfo = getOsInfo()
    const deviceId = crypto.randomUUID()

    // Register device then track events (fire-and-forget)
    registerDevice(user.id, 'desktop', 'Conflux Home', osInfo, APP_VERSION).then((id) => {
      const devId = id ?? deviceId
      trackEvent(user.id, devId, 'app_opened', { os: osInfo, version: APP_VERSION })

      // Track signup_completed only on first session (check created_at)
      const createdAt = new Date(user.created_at).getTime()
      const now = Date.now()
      const isNewUser = now - createdAt < 60_000 // created within last minute
      if (isNewUser && !hasTrackedSignup.current) {
        hasTrackedSignup.current = true
        trackEvent(user.id, devId, 'signup_completed', {})
      }
    })
  }, [user])

  const signInWithEmail = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) return { error: error.message }
    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return { user, session, loading, signInWithEmail, signOut }
}
