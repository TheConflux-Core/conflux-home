import { useState } from 'react';

interface OnboardingProps {
  onComplete: () => void;
}

const GOALS = [
  { id: 'business', emoji: '🚀', label: 'Grow my business' },
  { id: 'life', emoji: '🧠', label: 'Organize my life' },
  { id: 'learn', emoji: '📚', label: 'Learn new things' },
  { id: 'create', emoji: '🎨', label: 'Creative projects' },
  { id: 'health', emoji: '💪', label: 'Health & fitness' },
  { id: 'fun', emoji: '🎮', label: 'Just have fun' },
];

const STARTER_AGENTS: Record<string, { name: string; emoji: string; role: string }[]> = {
  business: [
    { name: 'ZigBot', emoji: '🤖', role: 'Strategic Partner' },
    { name: 'Helix', emoji: '🔬', role: 'Market Researcher' },
    { name: 'Forge', emoji: '🔨', role: 'Content Builder' },
    { name: 'Pulse', emoji: '📣', role: 'Marketing Specialist' },
  ],
  life: [
    { name: 'Atlas', emoji: '📋', role: 'Life Organizer' },
    { name: 'Sage', emoji: '🧠', role: 'Wellness Companion' },
    { name: 'Ledger', emoji: '💰', role: 'Financial Advisor' },
    { name: 'Echo', emoji: '📝', role: 'Journal Keeper' },
  ],
  learn: [
    { name: 'Curio', emoji: '🔭', role: 'Knowledge Guide' },
    { name: 'Byte', emoji: '💻', role: 'Tech Tutor' },
    { name: 'Lex', emoji: '📖', role: 'Reading Companion' },
    { name: 'Quiz', emoji: '❓', role: 'Study Partner' },
  ],
  create: [
    { name: 'Nova', emoji: '✨', role: 'Creative Muse' },
    { name: 'Mix', emoji: '🎵', role: 'Music Producer' },
    { name: 'Pixel', emoji: '🎨', role: 'Visual Artist' },
    { name: 'Verse', emoji: '✍️', role: 'Writing Partner' },
  ],
  health: [
    { name: 'Bolt', emoji: '💪', role: 'Fitness Coach' },
    { name: 'Nourish', emoji: '🥗', role: 'Nutrition Guide' },
    { name: 'Sage', emoji: '🧠', role: 'Mental Health Companion' },
    { name: 'Rest', emoji: '😴', role: 'Sleep Optimizer' },
  ],
  fun: [
    { name: 'Ace', emoji: '🎮', role: 'Game Companion' },
    { name: 'DJ', emoji: '🎧', role: 'Music Curator' },
    { name: 'Critic', emoji: '🎬', role: 'Movie & Show Expert' },
    { name: 'Chef', emoji: '👨‍🍳', role: 'Recipe Creator' },
  ],
};

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set());

  const toggleGoal = (id: string) => {
    setSelectedGoals(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getStarterAgents = () => {
    const primaryGoal = Array.from(selectedGoals)[0] || 'business';
    return STARTER_AGENTS[primaryGoal] || STARTER_AGENTS.business;
  };

  if (step === 0) {
    return (
      <div className="onboarding">
        <h1>⚡ Welcome to Conflux Home</h1>
        <p>A home for your AI family</p>
        <div className="onboarding-step">
          <h2>What's your name?</h2>
          <input
            placeholder="Enter your name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && setStep(1)}
            autoFocus
          />
          <button
            className="next-btn"
            onClick={() => name.trim() && setStep(1)}
            disabled={!name.trim()}
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="onboarding">
        <h1>Nice to meet you, {name}!</h1>
        <p>What do you want your AI family to help with?</p>
        <div className="onboarding-step">
          <h2>Select your goals (pick 1-3)</h2>
          <div className="goal-options">
            {GOALS.map((goal) => (
              <div
                key={goal.id}
                className={`goal-option ${selectedGoals.has(goal.id) ? 'selected' : ''}`}
                onClick={() => toggleGoal(goal.id)}
              >
                <div style={{ fontSize: 24, marginBottom: 6 }}>{goal.emoji}</div>
                {goal.label}
              </div>
            ))}
          </div>
          <button
            className="next-btn"
            onClick={() => selectedGoals.size > 0 && setStep(2)}
            disabled={selectedGoals.size === 0}
          >
            Meet Your Team →
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Show starter agents
  const agents = getStarterAgents();
  return (
    <div className="onboarding">
      <h1>Your AI family is ready!</h1>
      <p>Here's your starter team, {name}</p>
      <div className="onboarding-step">
        <h2>Meet your agents</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {agents.map((agent) => (
            <div key={agent.name} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: 16,
              background: 'var(--bg-hover)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: 32 }}>{agent.emoji}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{agent.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{agent.role}</div>
              </div>
              <div style={{
                marginLeft: 'auto',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--accent-success)',
                boxShadow: 'var(--glow-green)',
              }} />
            </div>
          ))}
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, textAlign: 'center' }}>
          They're already online and getting to know you. Click any agent to start chatting.
        </p>
        <button className="next-btn" onClick={onComplete}>
          Enter Conflux Home →
        </button>
      </div>
    </div>
  );
}
