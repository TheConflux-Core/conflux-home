import { useState, useCallback } from 'react'

interface LoginScreenProps {
  onAuthSuccess: () => void
}

export default function LoginScreen({ onAuthSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // We need the signInWithEmail from useAuth — but LoginScreen doesn't own the hook.
  // Instead we import supabase directly for this one-off call.
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
      const { error: authError } = await supabase.auth.signInWithOtp({ email: trimmed })
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
  // We do a lightweight poll via supabase.auth.onAuthStateChange
  if (typeof window !== 'undefined') {
    // Register once globally — the listener is idempotent across renders
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
