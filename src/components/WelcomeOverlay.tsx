import { useEffect, useState, useRef } from 'react';
import Avatar from './Avatar';
import { AGENT_PROFILE_MAP } from '../data/agent-descriptions';

interface WelcomeOverlayProps {
  userName: string;
  selectedAgentIds: string[];
  onComplete: () => void;
}

export default function WelcomeOverlay({
  userName,
  selectedAgentIds,
  onComplete,
}: WelcomeOverlayProps) {
  const [dismissed, setDismissed] = useState(false);
  const dismissRef = useRef(false);

  const handleDismiss = () => {
    if (dismissRef.current) return;
    dismissRef.current = true;
    setDismissed(true);
    localStorage.setItem('conflux-welcomed', 'true');
    setTimeout(onComplete, 200); // wait for fade-out
  };

  // Auto-dismiss after 10s
  useEffect(() => {
    const timer = setTimeout(handleDismiss, 10000);
    return () => clearTimeout(timer);
  }, []);

  // Resolve agents from IDs
  const agents = selectedAgentIds
    .map((id) => AGENT_PROFILE_MAP[id])
    .filter(Boolean);

  const displayName = userName?.trim() || 'there';

  return (
    <>
      <style>{`
        /* ===== Overlay ===== */
        .welcome-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          pointer-events: auto;
        }

        .welcome-overlay.entering {
          animation: welcome-overlay-fadein 300ms ease-out forwards;
        }
        .welcome-overlay.dismissing {
          animation: welcome-overlay-fadeout 200ms ease-in forwards;
          pointer-events: none;
        }

        @keyframes welcome-overlay-fadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes welcome-overlay-fadeout {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        /* ===== Card ===== */
        .welcome-card {
          background: var(--bg-card, #ffffff);
          border-radius: 20px;
          padding: 48px 40px 40px;
          max-width: 520px;
          width: 90vw;
          text-align: center;
          box-shadow: var(--shadow-lg, 0 8px 32px rgba(0,0,0,0.12));
          animation: welcome-card-scalein 400ms ease-out 300ms both;
        }

        @keyframes welcome-card-scalein {
          from {
            opacity: 0;
            transform: scale(0.92);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* ===== Conflux avatar ===== */
        .welcome-conflux-avatar {
          display: flex;
          justify-content: center;
          margin-bottom: 24px;
          animation: welcome-avatar-pop 400ms ease-out 300ms both;
        }

        @keyframes welcome-avatar-pop {
          from {
            opacity: 0;
            transform: scale(0.7);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* ===== Text ===== */
        .welcome-greeting {
          font-size: 22px;
          font-weight: 600;
          color: var(--text-primary, #1d1d1f);
          margin-bottom: 8px;
          line-height: 1.4;
          animation: welcome-text-fadein 300ms ease-out 700ms both;
        }

        .welcome-subtext {
          font-size: 15px;
          color: var(--text-secondary, #6e6e73);
          margin-bottom: 32px;
          line-height: 1.5;
          animation: welcome-text-fadein 300ms ease-out 900ms both;
        }

        @keyframes welcome-text-fadein {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ===== Agent row ===== */
        .welcome-agents-row {
          display: flex;
          justify-content: center;
          gap: 20px;
          flex-wrap: wrap;
          margin-bottom: 32px;
          min-height: 64px;
        }

        .welcome-agent-slot {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          opacity: 0;
          animation: welcome-agent-fadein 350ms ease-out forwards;
        }

        @keyframes welcome-agent-fadein {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .welcome-agent-name {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-secondary, #6e6e73);
          max-width: 72px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* ===== Button ===== */
        .welcome-cta {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 12px 32px;
          border-radius: 12px;
          border: none;
          background: var(--accent-primary, #0071e3);
          color: #fff;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
          box-shadow: 0 2px 12px rgba(0, 113, 227, 0.25);
          opacity: 0;
          animation: welcome-btn-fadein 200ms ease-out forwards;
        }

        .welcome-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(0, 113, 227, 0.35);
        }

        .welcome-cta:active {
          transform: translateY(0);
        }

        @keyframes welcome-btn-fadein {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Click-outside overlay to dismiss */}
      <div
        className={`welcome-overlay ${dismissed ? 'dismissing' : 'entering'}`}
        onClick={handleDismiss}
      >
        <div
          className="welcome-card"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Conflux avatar */}
          <div className="welcome-conflux-avatar">
            <Avatar
              agentId="conflux"
              name="Conflux"
              emoji="🤖"
              status="idle"
              size="lg"
              showStatus={false}
            />
          </div>

          {/* Greeting text */}
          <div className="welcome-greeting">
            Hey {displayName}! I'm Conflux, your strategic partner.
          </div>
          <div className="welcome-subtext">
            Your team is ready. Let's build something incredible.
          </div>

          {/* Agent avatars staggered */}
          <div className="welcome-agents-row">
            {agents.map((agent, i) => (
              <div
                key={agent.id}
                className="welcome-agent-slot"
                style={{
                  animationDelay: `${1100 + i * 200}ms`,
                }}
              >
                <Avatar
                  agentId={agent.id}
                  name={agent.name}
                  emoji={agent.emoji}
                  status="idle"
                  size="sm"
                  showStatus={false}
                />
                <span className="welcome-agent-name">{agent.name}</span>
              </div>
            ))}
          </div>

          {/* CTA button — delay after all agents */}
          <button
            className="welcome-cta"
            style={{
              animationDelay: `${1100 + agents.length * 200}ms`,
            }}
            onClick={handleDismiss}
          >
            Let's go! →
          </button>
        </div>
      </div>
    </>
  );
}
