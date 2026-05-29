// Conflux Home — Feedback Modal
// In-app bug report / feature request form.
// Submits to Supabase ch_feedback table. Offers GitHub as secondary option.

import { useState } from 'react';
import { submitFeedback, openBugReport, openFeatureRequest } from '../lib/feedback';
import { useAuth } from '../hooks/useAuth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'bug' | 'feature';
}

export default function FeedbackModal({ isOpen, onClose, defaultType = 'bug' }: Props) {
  const { user } = useAuth();
  const [type, setType] = useState<'bug' | 'feature'>(defaultType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setError('');
    setSubmitted(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Please fill in both the title and description.');
      return;
    }

    setSubmitting(true);
    setError('');

    const id = await submitFeedback(
      {
        type,
        title: title.trim(),
        description: description.trim(),
        pageContext: window.location.hash || undefined,
        userEmail: email.trim() || undefined,
      },
      user?.id,
    );

    setSubmitting(false);

    if (id) {
      setSubmitted(true);
    } else {
      setError('Something went wrong. Please try again or use GitHub below.');
    }
  };

  const handleGitHubFallback = () => {
    if (type === 'bug') {
      openBugReport();
    } else {
      openFeatureRequest();
    }
    handleClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520 }}
      >
        <div className="modal-header">
          <h2>{type === 'bug' ? '🐛 Report a Bug' : '💡 Request a Feature'}</h2>
          <button className="close-btn" onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ padding: '24px 28px' }}>
          {submitted ? (
            /* ── Success State ── */
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <h3 style={{ marginBottom: 8, color: 'var(--text-primary)' }}>
                Thanks for your feedback!
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
                We review every submission. Your input helps make Conflux Home better.
              </p>
              <button
                className="settings-button"
                onClick={handleClose}
                style={{ fontSize: 13 }}
              >
                Close
              </button>
            </div>
          ) : (
            /* ── Form ── */
            <form onSubmit={handleSubmit}>
              {/* Type Toggle */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <button
                  type="button"
                  onClick={() => setType('bug')}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: `1px solid ${type === 'bug' ? 'var(--accent-primary)' : 'var(--border)'}`,
                    background: type === 'bug' ? 'rgba(var(--accent-rgb), 0.12)' : 'transparent',
                    color: type === 'bug' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    transition: 'all 0.15s',
                  }}
                >
                  🐛 Bug Report
                </button>
                <button
                  type="button"
                  onClick={() => setType('feature')}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: `1px solid ${type === 'feature' ? 'var(--accent-primary)' : 'var(--border)'}`,
                    background: type === 'feature' ? 'rgba(var(--accent-rgb), 0.12)' : 'transparent',
                    color: type === 'feature' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    transition: 'all 0.15s',
                  }}
                >
                  💡 Feature Request
                </button>
              </div>

              {/* Title */}
              <label style={labelStyle}>
                {type === 'bug' ? 'What went wrong?' : 'What would you like?'}
              </label>
              <input
                className="settings-input"
                type="text"
                placeholder={
                  type === 'bug'
                    ? 'e.g. "App crashes when opening Kitchen"'
                    : 'e.g. "Dark mode for the settings page"'
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: '100%', marginBottom: 16 }}
                maxLength={200}
              />

              {/* Description */}
              <label style={labelStyle}>
                {type === 'bug' ? 'Steps to reproduce / details' : 'Tell us more'}
              </label>
              <textarea
                className="settings-input"
                placeholder={
                  type === 'bug'
                    ? 'What were you doing? What happened? What did you expect?'
                    : 'How would this help you? Any ideas on how it should work?'
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                style={{
                  width: '100%',
                  marginBottom: 16,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  lineHeight: 1.5,
                }}
                maxLength={5000}
              />

              {/* Email (optional, pre-filled if logged in) */}
              <label style={labelStyle}>
                Email <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional — for follow-up)</span>
              </label>
              <input
                className="settings-input"
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', marginBottom: 20 }}
              />

              {/* Error */}
              {error && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    marginBottom: 16,
                    fontSize: 13,
                    background: 'rgba(255,68,68,0.08)',
                    color: '#ff6666',
                  }}
                >
                  {error}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="settings-button"
                  type="submit"
                  disabled={submitting}
                  style={{ flex: 1, fontSize: 13 }}
                >
                  {submitting ? '⏳ Sending...' : 'Submit Feedback'}
                </button>
              </div>

              {/* GitHub fallback */}
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 14,
                  borderTop: '1px solid var(--border)',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Prefer GitHub?{' '}
                </span>
                <button
                  type="button"
                  onClick={handleGitHubFallback}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-primary)',
                    cursor: 'pointer',
                    fontSize: 12,
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  Open as GitHub issue →
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};
