import { useState, useEffect, useCallback, useRef } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { invoke } from '@tauri-apps/api/core'
import { supabase } from '../lib/supabase'
import { trackEvent, registerDevice } from '../lib/telemetry'

const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? '0.1.0'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

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
    // Check existing session and refresh if needed
    const checkSession = async () => {
      console.log('[useAuth] ═══ checkSession START ═══')
      try {
        // Try to get the current stored session first
        const { data: { session: storedSession } } = await supabase.auth.getSession()
        console.log('[useAuth] Stored session:', storedSession ? { user_id: storedSession.user?.id, expires_at: storedSession.expires_at, has_token: !!storedSession.access_token } : null)

        if (storedSession?.access_token) {
          // We have a stored token — check if it's expired or expiring soon
          const expiresAtMs = (storedSession.expires_at ?? 0) * 1000
          const remainingMs = expiresAtMs - Date.now()

          if (remainingMs > 60_000) {
            // Token is still valid — use it, no refresh needed yet
            console.log('[useAuth] Stored session valid, expires in', Math.round(remainingMs / 1000), 's')
            setSession(storedSession)
            setUser(storedSession.user ?? null)
            setLoading(false)
            return
          }

          // Token is expiring soon — try to refresh
          console.log('[useAuth] Token expiring soon, refreshing...')
          const { data: { session: freshSession }, error: refreshError } = await supabase.auth.refreshSession()

          if (!refreshError && freshSession) {
            console.log('[useAuth] Session refreshed successfully')
            setSession(freshSession)
            setUser(freshSession?.user ?? null)
            setLoading(false)
            return
          }

          // Refresh failed but we still have a stored token — keep using it
          // Don't sign out on transient failures; the token may still be valid
          console.warn('[useAuth] Refresh failed, keeping stored session:', refreshError?.message)
          setSession(storedSession)
          setUser(storedSession.user ?? null)
          setLoading(false)
          return
        }

        // No stored session at all
        console.log('[useAuth] No stored session found — user is not authenticated')
        setSession(null)
        setUser(null)
        setLoading(false)
      } catch (err) {
        console.error('[useAuth] ❌ Session check error:', err)
        // On error, don't clear session — try to keep whatever we had
        setLoading(false)
      }
      console.log('[useAuth] ═══ checkSession END ═══')
    }

    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        console.log('[useAuth] ══════════════════════════════════════════');
        console.log('[useAuth] 🚀 Auth state changed:', _event);
        console.log('[useAuth] Has session:', !!s);
        if (s) {
          console.log('[useAuth] User ID:', s.user?.id);
          console.log('[useAuth] Token preview:', s.access_token?.substring(0, 10));
        }
        setSession(s)
        setUser(s?.user ?? null)
        setLoading(false)
        console.log('[useAuth] ✅ Session state updated');
      },
    )

    return () => subscription.unsubscribe()
  }, [])

  // Pass Supabase credentials to Rust backend when session changes.
  // Use a ref to skip redundant syncs when values haven't actually changed.
  const lastSyncedRef = useRef<{token?: string; userId?: string}>({});
  useEffect(() => {
    const token = session?.access_token;
    const userId = session?.user?.id;
    if (!token || !userId) return;
    // Skip if nothing changed since last successful sync
    if (lastSyncedRef.current.token === token && lastSyncedRef.current.userId === userId) return;
    lastSyncedRef.current = { token, userId };
    invoke('set_supabase_session', {
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: SUPABASE_ANON_KEY,
      accessToken: token,
      userId,
    }).then(() => {
      // After auth syncs, pull Studio API keys from Supabase to local SQLite.
      // This ensures mobile/新 devices get the same keys as desktop.
      return invoke('sync_studio_keys');
    }).then((synced: unknown) => {
      const keys = synced as string[];
      if (keys && keys.length > 0) {
        console.log('[useAuth] ✅ Synced Studio keys from cloud:', keys);
      }
    }).catch((err) => console.warn('[useAuth] ❌ Failed to sync Supabase session/keys:', err))
  }, [session?.access_token, session?.user?.id, SUPABASE_URL, SUPABASE_ANON_KEY])

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
