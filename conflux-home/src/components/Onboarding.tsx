import { useState, useEffect, useCallback } from 'react';
import Avatar from './Avatar';

// ── Types ──

interface OnboardingProps {
  onComplete: (goals: string[], selectedAgents: string[]) => void;
}

// ── Constants ──

interface GoalOption {
  id: string;
  slug: string;
  emoji: string;
  title: string;
  description: string;
}

const GOALS: GoalOption[] = [
  { id: 'business', slug: 'building-a-business', emoji: '🚀', title: 'Building a business', description: 'Strategy, research, content, and growth' },
  { id: 'learn', slug: 'learning-research', emoji: '📚', title: 'Learning & research', description: 'Deep dives, analysis, and knowledge building' },
  { id: 'work', slug: 'work-productivity', emoji: '💼', title: 'Work productivity', description: 'Task management, writing, and automation' },
  { id: 'creative', slug: 'creative-projects', emoji: '🎨', title: 'Creative projects', description: 'Writing, design, and brainstorming' },
  { id: 'life', slug: 'everyday-life', emoji: '🏠', title: 'Everyday life', description: 'Planning, organizing, and daily help' },
];

const GOAL_AGENT_MAP: Record<string, string[]> = {
  'building-a-business': ['zigbot', 'helix', 'forge', 'vector', 'pulse'],
  'learning-research': ['helix', 'quanta', 'zigbot'],
  'work-productivity': ['prism', 'forge', 'spectra', 'quanta'],
  'creative-projects': ['forge', 'pulse', 'helix'],
  'everyday-life': ['zigbot', 'helix', 'catalyst'],
};

interface AgentInfo {
  id: string;
  name: string;
  emoji: string;
  role: string;
  why: string;
}

const ALL_AGENTS: Record<string, AgentInfo> = {
  zigbot: { id: 'zigbot', name: 'ZigBot', emoji: '🤖', role: 'Strategic Partner', why: 'Guides your strategy and helps you think clearly about opportunities' },
  helix: { id: 'helix', name: 'Helix', emoji: '🔬', role: 'Market Researcher', why: 'Finds market data, competitor intel, and validates ideas' },
  forge: { id: 'forge', name: 'Forge', emoji: '🔨', role: 'Execution Builder', why: 'Builds products, writes code, and creates deliverables' },
  vector: { id: 'vector', name: 'Vector', emoji: '🧭', role: 'Business Strategist', why: 'Evaluates opportunities and keeps your portfolio on track' },
  pulse: { id: 'pulse', name: 'Pulse', emoji: '📣', role: 'Growth Engine', why: 'Handles marketing, launch strategy, and audience building' },
  quanta: { id: 'quanta', name: 'Quanta', emoji: '✅', role: 'Quality Control', why: 'Verifies outputs, checks facts, and ensures quality' },
  prism: { id: 'prism', name: 'Prism', emoji: '💎', role: 'System Orchestrator', why: 'Coordinates missions and manages the agent pipeline' },
  spectra: { id: 'spectra', name: 'Spectra', emoji: '🧩', role: 'Task Decomposer', why: 'Breaks complex goals into clear, actionable tasks' },
  luma: { id: 'luma', name: 'Luma', emoji: '🚀', role: 'Run Launcher', why: 'Launches and monitors agent runs across the system' },
  catalyst: { id: 'catalyst', name: 'Catalyst', emoji: '⚡', role: 'Everyday Assistant', why: 'Helps with daily planning, organization, and quick tasks' },
};

// ── Gateway Detection ──

const DEFAULT_GATEWAY_URL = 'http://localhost:18789';

async function checkGateway(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Component ──

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [animating, setAnimating] = useState(false);

  // Step 2 — Connection
  const [gatewayUrl, setGatewayUrl] = useState(DEFAULT_GATEWAY_URL);
  const [gatewayToken, setGatewayToken] = useState('');
  const [detecting, setDetecting] = useState(true);
  const [gatewayFound, setGatewayFound] = useState(false);
  const [connectError, setConnectError] = useState('');

  // Step 3 — Goals
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set());

  // Step 4 — Agents
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());

  // Step 5 — Alive
  const [alivePhase, setAlivePhase] = useState<'loading' | 'ready'>('loading');

  // Step 1 — Name
  const [userName, setUserName] = useState('');

  // ── Auto-detect gateway on mount ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const found = await checkGateway(DEFAULT_GATEWAY_URL);
      if (cancelled) return;
      if (found) {
        setGatewayFound(true);
        setDetecting(false);
        // Auto-advance after 1.5s
        setTimeout(() => {
          if (!cancelled) goToStep(2);
        }, 1500);
      } else {
        setDetecting(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Step 4: derive recommended agents when goals change ──
  useEffect(() => {
    const agentSet = new Set<string>();
    selectedGoals.forEach(goalId => {
      const goal = GOALS.find(g => g.id === goalId);
      if (goal) {
        (GOAL_AGENT_MAP[goal.slug] || []).forEach(a => agentSet.add(a));
      }
    });
    setSelectedAgents(agentSet);
  }, [selectedGoals]);

  // ── Navigation ──
  const goToStep = useCallback((nextStep: number) => {
    setDirection(nextStep > step ? 'forward' : 'back');
    setAnimating(true);
    setTimeout(() => {
      setStep(nextStep);
      setAnimating(false);
    }, 50); // small delay so the exit animation fires
  }, [step]);

  const nextStep = () => goToStep(step + 1);
  const prevStep = () => goToStep(step - 1);

  // ── Step 2: manual connect ──
  const handleConnect = async () => {
    setConnectError('');
    setDetecting(true);
    const ok = await checkGateway(gatewayUrl);
    setDetecting(false);
    if (ok) {
      setGatewayFound(true);
      localStorage.setItem('conflux-gateway-url', gatewayUrl);
      if (gatewayToken) {
        localStorage.setItem('conflux-gateway-token', gatewayToken);
      }
      setTimeout(() => goToStep(2), 1500);
    } else {
      setConnectError('Could not reach gateway. Check the URL and try again.');
    }
  };

  // ── Step 3: toggle goal ──
  const toggleGoal = (id: string) => {
    setSelectedGoals(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 3) {
        next.add(id);
      }
      return next;
    });
  };

  // ── Step 4: toggle agent ──
  const toggleAgent = (id: string) => {
    setSelectedAgents(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id); // must keep ≥1
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ── Step 5: enter home ──
  const handleEnter = () => {
    const goalsArr = Array.from(selectedGoals);
    const agentsArr = Array.from(selectedAgents);
    localStorage.setItem('conflux-onboarded', 'true');
    localStorage.setItem('conflux-goals', JSON.stringify(goalsArr));
    localStorage.setItem('conflux-selected-agents', JSON.stringify(agentsArr));
    localStorage.setItem('conflux-name', userName.trim() || 'there');
    onComplete(goalsArr, agentsArr);
  };

  // ── Step 5: alive animation ──
  useEffect(() => {
    if (step === 4) {
      const timer = setTimeout(() => setAlivePhase('ready'), 2000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // ── Skip ──
  const handleSkip = () => {
    const allAgentIds = Object.keys(ALL_AGENTS);
    localStorage.setItem('conflux-onboarded', 'true');
    localStorage.setItem('conflux-goals', JSON.stringify([]));
    localStorage.setItem('conflux-selected-agents', JSON.stringify(allAgentIds));
    localStorage.setItem('conflux-name', userName.trim() || 'there');
    onComplete([], allAgentIds);
  };

  // ── Derived ──
  const canNext = step === 0
    || (step === 1 && (gatewayFound || !detecting))
    || (step === 2 && selectedGoals.size >= 2)
    || (step === 3 && selectedAgents.size >= 1);

  const slideClass = animating
    ? (direction === 'forward' ? 'animating-slide-right' : 'animating-slide-left')
    : '';

  // ── Render Steps ──

  const renderStep = () => {
    switch (step) {
      case 0: return renderWelcome();
      case 1: return renderConnection();
      case 2: return renderGoals();
      case 3: return renderTeam();
      case 4: return renderAlive();
      default: return null;
    }
  };

  const renderWelcome = () => (
    <div style={{ textAlign: 'center', maxWidth: 420 }}>
      <img
        src="/logo.png"
        alt="Conflux Home"
        style={{ width: 96, height: 96, marginBottom: 24, objectFit: 'contain' }}
      />
      <h1 style={{
        fontSize: 32,
        fontWeight: 700,
        letterSpacing: '-0.5px',
        color: 'var(--text-primary)',
        marginBottom: 12,
      }}>
        Welcome to Conflux Home
      </h1>
      <p style={{
        fontSize: 17,
        color: 'var(--text-secondary)',
        marginBottom: 32,
        lineHeight: 1.5,
      }}>
        Your AI family is about to come alive.
      </p>
      <input
        type="text"
        placeholder="What's your name?"
        value={userName}
        onChange={e => setUserName(e.target.value)}
        style={{
          width: '100%',
          maxWidth: 280,
          padding: '12px 16px',
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          fontSize: 16,
          textAlign: 'center',
          outline: 'none',
          marginBottom: 20,
          boxSizing: 'border-box',
        }}
        autoFocus
      />
      <br />
      <button className="next-btn" onClick={nextStep} style={{ maxWidth: 280, margin: '0 auto' }}>
        Get Started
      </button>
    </div>
  );

  const renderConnection = () => (
    <div style={{ textAlign: 'center', maxWidth: 420 }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
        Connect to Gateway
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32 }}>
        We need to talk to your Conflux gateway.
      </p>

      {detecting && !gatewayFound && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            width: 48, height: 48, margin: '0 auto 16px',
            border: '3px solid var(--border)',
            borderTopColor: 'var(--accent-primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Looking for gateway at localhost:18789…
          </p>
        </div>
      )}

      {gatewayFound && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '16px 24px', background: 'rgba(52,199,89,0.1)',
          borderRadius: 12, marginBottom: 24,
        }}>
          <span style={{ fontSize: 24, color: 'var(--accent-success)' }}>✓</span>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent-success)' }}>
            Gateway detected!
          </span>
        </div>
      )}

      {!detecting && !gatewayFound && (
        <>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 28, textAlign: 'left',
          }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Gateway URL
            </label>
            <input
              type="text"
              value={gatewayUrl}
              onChange={e => setGatewayUrl(e.target.value)}
              placeholder={DEFAULT_GATEWAY_URL}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-primary)',
                color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                marginTop: 6, marginBottom: 16, boxSizing: 'border-box',
              }}
            />

            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Gateway Token
            </label>
            <input
              type="password"
              value={gatewayToken}
              onChange={e => setGatewayToken(e.target.value)}
              placeholder="Paste your gateway token…"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-primary)',
                color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                marginTop: 6, marginBottom: 16, boxSizing: 'border-box',
              }}
            />

            {connectError && (
              <p style={{ fontSize: 13, color: 'var(--accent-error)', marginBottom: 12 }}>
                {connectError}
              </p>
            )}

            <button
              className="next-btn"
              onClick={handleConnect}
              disabled={detecting}
            >
              {detecting ? 'Connecting…' : 'Connect'}
            </button>
          </div>

          {/* Skip link for manual mode */}
          <button
            onClick={handleSkip}
            style={{
              marginTop: 16, background: 'none', border: 'none',
              color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Skip setup
          </button>
        </>
      )}
    </div>
  );

  const renderGoals = () => (
    <div style={{ textAlign: 'center', maxWidth: 520 }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
        What do you want help with?
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32 }}>
        Select 2–3 goals. This helps us pick the right agents for you.
      </p>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 12, marginBottom: 12, textAlign: 'left',
      }}>
        {GOALS.map(goal => {
          const isSelected = selectedGoals.has(goal.id);
          return (
            <div
              key={goal.id}
              onClick={() => toggleGoal(goal.id)}
              style={{
                padding: '18px 16px',
                background: 'var(--bg-card)',
                border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border)'}`,
                borderRadius: 14,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                position: 'relative',
                boxShadow: isSelected ? '0 0 0 1px var(--accent-primary)' : 'var(--shadow)',
              }}
            >
              {isSelected && (
                <div style={{
                  position: 'absolute', top: 10, right: 12,
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'var(--accent-primary)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                }}>✓</div>
              )}
              <div style={{ fontSize: 28, marginBottom: 8 }}>{goal.emoji}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                {goal.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {goal.description}
              </div>
            </div>
          );
        })}
      </div>

      <p style={{
        fontSize: 12, color: selectedGoals.size >= 2 ? 'var(--accent-success)' : 'var(--text-muted)',
        marginBottom: 8,
      }}>
        {selectedGoals.size < 2 ? `Select at least 2 (${selectedGoals.size}/2)` : `${selectedGoals.size} selected ✓`}
      </p>
    </div>
  );

  const renderTeam = () => {
    const agentIds = Array.from(selectedAgents);
    const agentList = agentIds.map(id => ALL_AGENTS[id]).filter(Boolean);

    return (
      <div style={{ textAlign: 'center', maxWidth: 520 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
          Your personalized AI team
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28 }}>
          Based on your goals, we recommend these agents. Toggle any on or off.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', marginBottom: 20 }}>
          {agentList.map(agent => {
            const isOn = selectedAgents.has(agent.id);
            return (
              <div
                key={agent.id}
                onClick={() => toggleAgent(agent.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px',
                  background: 'var(--bg-card)',
                  border: `2px solid ${isOn ? 'var(--accent-primary)' : 'var(--border)'}`,
                  borderRadius: 14,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  opacity: isOn ? 1 : 0.5,
                }}
              >
                <Avatar
                  agentId={agent.id}
                  name={agent.name}
                  emoji={agent.emoji}
                  status={isOn ? 'idle' : 'offline'}
                  size="md"
                  showStatus={false}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {agent.name}
                    <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                      {agent.role}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                    Why this agent: {agent.why}
                  </div>
                </div>
                <div style={{
                  width: 44, height: 26, borderRadius: 13,
                  background: isOn ? 'var(--accent-primary)' : 'var(--border)',
                  position: 'relative', flexShrink: 0,
                  transition: 'background 0.2s ease',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: '#fff',
                    position: 'absolute', top: 2,
                    left: isOn ? 20 : 2,
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          You can add more agents anytime from the Marketplace.
        </p>
      </div>
    );
  };

  const renderAlive = () => {
    const agentIds = Array.from(selectedAgents);
    const agentList = agentIds.map(id => ALL_AGENTS[id]).filter(Boolean);

    return (
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <h2 style={{
          fontSize: 24, fontWeight: 700, marginBottom: 24,
          color: 'var(--text-primary)',
        }}>
          {alivePhase === 'loading' ? 'Your team is coming alive…' : 'Your team is ready!'}
        </h2>

        {alivePhase === 'loading' ? (
          <div style={{ marginBottom: 40 }}>
            {/* Pulsing circles */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 32 }}>
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  style={{
                    width: 16, height: 16, borderRadius: '50%',
                    background: 'var(--accent-primary)',
                    animation: `alive-pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
            {/* Agents fading in */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
              {agentList.map((agent, i) => (
                <div
                  key={agent.id}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    opacity: 0,
                    animation: `fade-in-up 0.4s ease ${0.3 + i * 0.2}s forwards`,
                  }}
                >
                  <Avatar
                    agentId={agent.id}
                    name={agent.name}
                    emoji={agent.emoji}
                    status="working"
                    size="md"
                  />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {agent.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginBottom: 24 }}>
              {agentList.map(agent => (
                <div
                  key={agent.id}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  }}
                >
                  <Avatar
                    agentId={agent.id}
                    name={agent.name}
                    emoji={agent.emoji}
                    status="idle"
                    size="md"
                  />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {agent.name}
                  </span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              {agentList.length} agent{agentList.length !== 1 ? 's' : ''} ready to go.
            </p>
          </div>
        )}

        {alivePhase === 'ready' && (
          <button className="next-btn" onClick={handleEnter} style={{ maxWidth: 280, margin: '0 auto' }}>
            Enter Conflux Home
          </button>
        )}
      </div>
    );
  };

  // ── Main Render ──

  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes alive-pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div style={{
        display: 'flex', flexDirection: 'column',
        height: '100vh', width: '100%',
        background: 'var(--bg-primary)',
      }}>
        {/* Progress bar */}
        {step < 4 && (
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            gap: 10, padding: '20px 0 0', flexShrink: 0,
          }}>
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  width: i === step ? 28 : 10,
                  height: 10,
                  borderRadius: 5,
                  background: i < step
                    ? 'var(--accent-primary)'
                    : i === step
                      ? 'var(--accent-primary)'
                      : 'var(--border)',
                  opacity: i <= step ? 1 : 0.4,
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
        )}

        {/* Content area */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
          overflow: 'auto',
        }}>
          <div className={slideClass} key={step} style={{ width: '100%' }}>
            {renderStep()}
          </div>
        </div>

        {/* Bottom navigation */}
        {step < 4 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 24px 28px', flexShrink: 0,
          }}>
            <div>
              {step > 0 && (
                <button
                  onClick={prevStep}
                  style={{
                    background: 'none', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '10px 20px',
                    color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500,
                    cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                >
                  ← Back
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {step >= 2 && (
                <button
                  onClick={handleSkip}
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--text-muted)', fontSize: 13,
                    cursor: 'pointer', textDecoration: 'underline',
                  }}
                >
                  Skip setup
                </button>
              )}
              {step < 3 && step > 0 && (
                <button
                  className="next-btn"
                  onClick={nextStep}
                  disabled={!canNext}
                  style={{ width: 'auto', padding: '10px 28px' }}
                >
                  Next →
                </button>
              )}
              {step === 3 && (
                <button
                  className="next-btn"
                  onClick={nextStep}
                  disabled={selectedAgents.size < 1}
                  style={{ width: 'auto', padding: '10px 28px' }}
                >
                  Bring to Life →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
