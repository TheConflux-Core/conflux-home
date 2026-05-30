import { motion, AnimatePresence } from 'framer-motion';
import '../styles-studio-upgrade.css';

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
        >
          <motion.div
            className="studio-upgrade-modal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="studio-upgrade-icon">⚡</div>

            {/* Title */}
            <h2 className="studio-upgrade-title">
              {feature}
            </h2>

            {/* Subtitle */}
            <p className="studio-upgrade-subtitle">
              This is a Pro feature. Upgrade to unlock higher limits, premium models, and creative tools.
            </p>

            {/* Features comparison */}
            <div className="studio-upgrade-compare">
              <div className="studio-upgrade-tier studio-upgrade-tier-free">
                <div className="studio-upgrade-tier-label">
                  Free
                </div>
                <div className="studio-upgrade-tier-features">
                  ✕ {feature}<br/>
                  ✓ 5 images/day<br/>
                  ✓ 10 songs/day<br/>
                  ✓ Basic TTS
                </div>
              </div>
              <div className="studio-upgrade-tier studio-upgrade-tier-pro">
                <div className="studio-upgrade-tier-label studio-upgrade-tier-label-pro">
                  Pro
                </div>
                <div className="studio-upgrade-tier-features studio-upgrade-tier-features-pro">
                  ✓ {feature}<br/>
                  ✓ 50 images/day<br/>
                  ✓ 100 songs/day<br/>
                  ✓ ElevenLabs voices
                </div>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="studio-upgrade-actions">
              <button
                onClick={onClose}
                className="studio-upgrade-btn studio-upgrade-btn-secondary"
              >
                Maybe Later
              </button>
              <button
                onClick={onClose}
                className="studio-upgrade-btn studio-upgrade-btn-primary"
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
