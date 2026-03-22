import { useState } from 'react';
import { AgentTemplate } from '../types';

const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'legal-advisor',
    name: 'Lex',
    emoji: '⚖️',
    category: 'expert',
    role: 'Legal Advisor',
    description: 'Reviews contracts, explains legal concepts, flags compliance issues. Not a replacement for a lawyer, but your first line of defense.',
    personality: 'Precise, cautious, thorough. Explains things in plain language. Always recommends consulting a licensed attorney for binding decisions.',
    skills: ['Contract review', 'Compliance checks', 'Legal research', 'Risk assessment'],
    modelRecommendation: 'claude-sonnet',
    installed: false,
  },
  {
    id: 'mental-health',
    name: 'Sage',
    emoji: '🧠',
    category: 'life',
    role: 'Mental Health Companion',
    description: 'A trained listener who helps you process thoughts, manage stress, and build healthy habits. Available 24/7, no judgment.',
    personality: 'Warm, empathetic, patient. Asks thoughtful questions. Never diagnoses. Encourages professional help when needed.',
    skills: ['Active listening', 'Stress management', 'Mindfulness guidance', 'Journal prompts'],
    modelRecommendation: 'claude-sonnet',
    installed: false,
  },
  {
    id: 'game-companion',
    name: 'Ace',
    emoji: '🎮',
    category: 'fun',
    role: 'Game Companion',
    description: 'Play chess, trivia, word games, 20 questions, and more. Adapts to your skill level and keeps it fun.',
    personality: 'Competitive but encouraging. Celebrates your wins. Teaches strategy without being condescending.',
    skills: ['Chess', 'Trivia', 'Word games', 'Storytelling RPG', 'Puzzles'],
    modelRecommendation: 'gemini-flash',
    installed: false,
  },
  {
    id: 'fitness-coach',
    name: 'Bolt',
    emoji: '💪',
    category: 'life',
    role: 'Fitness Coach',
    description: 'Personalized workout plans, nutrition guidance, and progress tracking. Adapts to your schedule and goals.',
    personality: 'Motivating but realistic. Celebrates consistency over perfection. Adjusts plans based on your feedback.',
    skills: ['Workout planning', 'Nutrition tracking', 'Progress monitoring', 'Goal setting'],
    modelRecommendation: 'gemini-flash',
    installed: false,
  },
  {
    id: 'developer',
    name: 'Forge',
    emoji: '🔨',
    category: 'work',
    role: 'Developer',
    description: 'Writes code, debugs issues, reviews PRs, and explains technical concepts. Works across multiple languages.',
    personality: 'Methodical, detail-oriented. Explains the WHY behind code decisions. Prefers clean, maintainable solutions.',
    skills: ['Code generation', 'Debugging', 'Code review', 'Architecture design', 'Documentation'],
    modelRecommendation: 'claude-sonnet',
    installed: false,
  },
  {
    id: 'financial-advisor',
    name: 'Ledger',
    emoji: '💰',
    category: 'expert',
    role: 'Financial Advisor',
    description: 'Budget tracking, investment research, debt strategies, and financial goal planning. Data-driven, not emotional.',
    personality: 'Analytical, conservative. Presents options with pros/cons. Never pushes specific investments. Reminds you this is education, not advice.',
    skills: ['Budget analysis', 'Investment research', 'Debt strategies', 'Tax planning basics'],
    modelRecommendation: 'claude-sonnet',
    installed: false,
  },
  {
    id: 'creative-muse',
    name: 'Nova',
    emoji: '✨',
    category: 'creative',
    role: 'Creative Muse',
    description: 'Brainstorming partner, writing assistant, and idea generator. Helps you break through creative blocks.',
    personality: 'Enthusiastic, imaginative, unconventional. Suggests unexpected angles. Never judges rough ideas.',
    skills: ['Brainstorming', 'Writing assistance', 'Story development', 'Concept generation', 'Creative challenges'],
    modelRecommendation: 'claude-sonnet',
    installed: false,
  },
  {
    id: 'music-producer',
    name: 'Mix',
    emoji: '🎵',
    category: 'creative',
    role: 'Music Producer',
    description: 'Composition assistance, mixing tips, arrangement ideas, and production guidance. Built on real studio knowledge.',
    personality: 'Passionate about sound. Explains techniques using real studio language. Encourages experimentation.',
    skills: ['Composition', 'Mixing guidance', 'Arrangement', 'Sound design', 'Mastering tips'],
    modelRecommendation: 'gemini-flash',
    installed: false,
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All Agents', emoji: '🌟' },
  { id: 'work', label: 'Work', emoji: '💼' },
  { id: 'life', label: 'Life', emoji: '🏥' },
  { id: 'creative', label: 'Creative', emoji: '🎨' },
  { id: 'fun', label: 'Fun', emoji: '🎮' },
  { id: 'expert', label: 'Expert', emoji: '🎓' },
];

export default function Marketplace() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [installed, setInstalled] = useState<Set<string>>(new Set());

  const filtered = selectedCategory === 'all'
    ? AGENT_TEMPLATES
    : AGENT_TEMPLATES.filter(a => a.category === selectedCategory);

  const handleInstall = (id: string) => {
    setInstalled(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>
          Agent Marketplace
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Click to install. Each agent joins your AI family with their own personality and skills.
        </p>
      </div>

      {/* Category Filter */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 24,
        overflowX: 'auto',
        paddingBottom: 8,
      }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              border: `1px solid ${selectedCategory === cat.id ? 'var(--accent-secondary)' : 'var(--border)'}`,
              background: selectedCategory === cat.id ? 'rgba(123, 47, 255, 0.1)' : 'transparent',
              color: selectedCategory === cat.id ? 'var(--accent-secondary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 12,
              whiteSpace: 'nowrap',
            }}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Agent Grid */}
      <div className="marketplace-grid">
        {filtered.map((template) => (
          <div key={template.id} className="marketplace-card">
            <div className="category-badge">{template.category}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 28 }}>{template.emoji}</span>
              <div>
                <h3>{template.name}</h3>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{template.role}</div>
              </div>
            </div>
            <p className="description">{template.description}</p>
            <div className="skills">
              {template.skills.map((skill) => (
                <span key={skill} className="skill-tag">{skill}</span>
              ))}
            </div>
            <button
              className={`install-btn ${installed.has(template.id) ? 'installed' : ''}`}
              onClick={() => handleInstall(template.id)}
            >
              {installed.has(template.id) ? '✓ Installed — Click to Remove' : '+ Install Agent'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
