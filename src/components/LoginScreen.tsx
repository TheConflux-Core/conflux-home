import { useState, useCallback, useEffect, useRef } from 'react'
import { onOpenUrl, getCurrent } from '@tauri-apps/plugin-deep-link'

interface LoginScreenProps {
  onAuthSuccess: () => void
}

/** Parse a conflux://auth/callback URL into tokens.
 *  Format: conflux://auth/callback#access_token=xxx&refresh_token=yyy
 *  Also handles: conflux://auth/callback?access_token=xxx&refresh_token=yyy  */
function parseAuthTokens(url: string): { access_token: string; refresh_token: string } | null {
  try {
    const hashIdx = url.indexOf('#')
    const queryIdx = url.indexOf('?')
    const sepIdx = hashIdx !== -1 ? hashIdx : queryIdx
    if (sepIdx === -1) return null

    const fragment = url.slice(sepIdx + 1)
    const params = new URLSearchParams(fragment)
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')
    if (!access_token || !refresh_token) return null
    return { access_token, refresh_token }
  } catch {
    return null
  }
}

export default function LoginScreen({ onAuthSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const processedUrls = useRef<Set<string>>(new Set())

  /** Handle a deep link URL: extract tokens and set the Supabase session. */
  const handleDeepLink = useCallback(async (url: string) => {
    if (!url.includes('conflux://')) return
    if (processedUrls.current.has(url)) return
    processedUrls.current.add(url)

    const tokens = parseAuthTokens(url)
    if (!tokens) return

    try {
      const { supabase } = await import('../lib/supabase')
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      })
      if (sessionError) {
        console.error('Deep link auth error:', sessionError.message)
        setError(sessionError.message)
      }
      // onAuthStateChange in useAuth will trigger onAuthSuccess automatically
    } catch (err: any) {
      console.error('Deep link session error:', err)
      setError(err?.message ?? 'Failed to complete sign-in.')
    }
  }, [])

  // ── Listen for deep link URLs ──
  // 1. onOpenUrl — works on macOS, iOS, Android (emitted when app is already running).
  //    On Windows/Linux with single-instance plugin, second instances forward via this event.
  useEffect(() => {
    const unlistenPromise = onOpenUrl((urls) => {
      if (urls && urls.length > 0) {
        handleDeepLink(urls[0])
      }
    })
    return () => { unlistenPromise.then(fn => fn()) }
  }, [handleDeepLink])

  // 2. getCurrent — checks if the app was LAUNCHED by a deep link (all platforms).
  //    On Windows/Linux, the OS passes the URL as a CLI argument when spawning.
  useEffect(() => {
    getCurrent().then((urls) => {
      if (urls && urls.length > 0) {
        handleDeepLink(urls[0])
      }
    }).catch((err) => {
      // getCurrent may fail in web dev mode (no Tauri runtime)
      console.debug('getCurrent deep link check:', err)
    })
  }, [handleDeepLink])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmed = email.trim()
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)
    try {
      const { supabase } = await import('../lib/supabase')
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: 'conflux://auth/callback',
        },
      })
      if (authError) {
        setError(authError.message)
      } else {
        setSent(true)
      }
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [email])

  // Listen for auth state change while on login screen — once session appears, call onAuthSuccess
  if (typeof window !== 'undefined') {
    const w = window as any
    if (!w.__confluxAuthListener) {
      w.__confluxAuthListener = true
      import('../lib/supabase').then(({ supabase }) => {
        supabase.auth.onAuthStateChange((_event: string, session: any) => {
          if (session) {
            onAuthSuccess()
          }
        })
      })
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Logo / Title */}
        <div style={styles.logoArea}>
          <div style={styles.logoEmoji}>🤖</div>
          <h1 style={styles.title}>Conflux Home</h1>
          <p style={styles.subtitle}>A home for your AI family</p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} style={styles.form}>
            <label style={styles.label}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null) }}
              placeholder="you@example.com"
              style={styles.input}
              autoFocus
              disabled={loading}
            />
            {error && <p style={styles.error}>{error}</p>}
            <button
              type="submit"
              disabled={loading || !email.trim()}
              style={{
                ...styles.button,
                opacity: loading || !email.trim() ? 0.5 : 1,
              }}
            >
              {loading ? (
                <span style={styles.spinner}>⏳</span>
              ) : (
                'Send Magic Link'
              )}
            </button>
          </form>
        ) : (
          <div style={styles.checkEmail}>
            <div style={styles.checkEmoji}>✉️</div>
            <h2 style={styles.checkTitle}>Check your email</h2>
            <p style={styles.checkText}>
              We sent a magic link to <strong>{email}</strong>.<br />
              Click the link to sign in.
            </p>
            <button
              onClick={() => { setSent(false); setError(null) }}
              style={styles.resendButton}
            >
              Use a different email
            </button>
          </div>
        )}

        <p style={styles.footer}>
          No password required — we use magic links for secure, passwordless sign-in.
        </p>
      </div>
    </div>
  )
}

// ── Styles (dark theme, matches Conflux Home aesthetic) ──

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#0a0a1a',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: 20,
  },
  card: {
    background: '#12122a',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: '48px 40px',
    maxWidth: 420,
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  },
  logoArea: {
    marginBottom: 36,
  },
  logoEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#ffffff',
    margin: '0 0 6px',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: 14,
    color: '#8888aa',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    textAlign: 'left',
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#aaaacc',
    letterSpacing: '0.3px',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.1)',
    background: '#0d0d22',
    color: '#ffffff',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s',
  },
  error: {
    color: '#ff6b6b',
    fontSize: 13,
    margin: 0,
  },
  button: {
    padding: '14px 24px',
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 4,
    transition: 'opacity 0.2s',
  },
  spinner: {
    fontSize: 16,
  },
  checkEmail: {
    textAlign: 'center',
    padding: '20px 0',
  },
  checkEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  checkTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#ffffff',
    margin: '0 0 10px',
  },
  checkText: {
    fontSize: 14,
    color: '#aaaacc',
    lineHeight: 1.6,
    margin: '0 0 20px',
  },
  resendButton: {
    padding: '10px 20px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'transparent',
    color: '#8888aa',
    fontSize: 13,
    cursor: 'pointer',
  },
  footer: {
    fontSize: 12,
    color: '#555577',
    marginTop: 28,
    lineHeight: 1.5,
  },
}
