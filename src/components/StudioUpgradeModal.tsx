import { motion, AnimatePresence } from 'framer-motion';

interface StudioUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string; // e.g. "Voice Cloning", "Video Generation"
}

export default function StudioUpgradeModal({ isOpen, onClose, feature }: StudioUpgradeModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="studio-upgrade-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, #1a1033 0%, #0d0a1a 100%)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: 16,
              padding: '32px',
              maxWidth: 420,
              width: '90%',
              textAlign: 'center',
              boxShadow: '0 25px 60px rgba(139, 92, 246, 0.15)',
            }}
          >
            {/* Icon */}
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>

            {/* Title */}
            <h2 style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#fff',
              margin: '0 0 8px',
            }}>
              {feature}
            </h2>

            {/* Subtitle */}
            <p style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.6)',
              margin: '0 0 24px',
              lineHeight: 1.5,
            }}>
              This is a Pro feature. Upgrade to unlock higher limits, premium models, and creative tools.
            </p>

            {/* Features comparison */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              marginBottom: 24,
              textAlign: 'left',
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 10,
                padding: '14px 16px',
              }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                  Free
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                  ✕ {feature}<br/>
                  ✓ 5 images/day<br/>
                  ✓ 10 songs/day<br/>
                  ✓ Basic TTS
                </div>
              </div>
              <div style={{
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: 10,
                padding: '14px 16px',
              }}>
                <div style={{ fontSize: 11, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                  Pro
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 1.6 }}>
                  ✓ {feature}<br/>
                  ✓ 50 images/day<br/>
                  ✓ 100 songs/day<br/>
                  ✓ ElevenLabs voices
                </div>
              </div>
            </div>

            {/* CTA buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 14,
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Maybe Later
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                  color: '#fff',
                  fontSize: 14,
                  cursor: 'pointer',
                  fontWeight: 600,
                  boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                }}
              >
                Upgrade to Pro
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
