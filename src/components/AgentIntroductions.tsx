import { useState, useEffect, useCallback, useRef } from 'react';
import { getAgentIntroConfig, AgentIntroConfig } from '../data/agent-intro-data';
import { useIntroductions } from '../hooks/useIntroductions';
import { playAgentWake } from '../lib/sound';
import '../styles-agent-introductions.css';

// Map app view IDs to agent intro config IDs
const VIEW_TO_AGENT: Record<string, string> = {
  kitchen: 'hearth',
  budget: 'pulse',
  dreams: 'horizon',
  life: 'orbit',
  feed: 'current',
  home: 'foundation',
  games: 'games',
  marketplace: 'marketplace',
  agents: 'agents',
  studio: 'studio',
  vault: 'vault',
  echo: 'echo',
  settings: 'settings',
};

interface AgentIntroductionsProps {
  userName: string;
  selectedAgentIds: string[];
  userId: string;
  familyMemberId?: string;
  onComplete: () => void;
}

export default function AgentIntroductions({
  userName,
  selectedAgentIds,
  userId,
  familyMemberId,
  onComplete,
}: AgentIntroductionsProps) {
  const [entering, setEntering] = useState(true);
  const [exiting, setExiting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine agent order: selected agents first, then Conflux last
  const orderedAgentIds = useCallback(() => {
    // Map view IDs to agent intro config IDs
    const agentIds = selectedAgentIds
      .map(id => VIEW_TO_AGENT[id] ?? id)
      .filter(id => id !== 'conflux');
    // Ensure only known intro configs are included
    const validIds = agentIds.filter(id => getAgentIntroConfig(id));
    if (!validIds.includes('conflux')) validIds.push('conflux');
    return validIds;
  }, [selectedAgentIds]);

  const agentIds = orderedAgentIds();

  // If no agents to introduce, complete immediately
  if (agentIds.length === 0) {
    onComplete();
    return null;
  }

  const {
    currentStep,
    inputs,
    completed,
    nextStep,
    skipRemaining,
    setInput,
    saveInputs,
  } = useIntroductions(userId, familyMemberId, agentIds, onComplete);

  // Current agent config
  const currentAgentId = agentIds[currentStep];
  const currentConfig = getAgentIntroConfig(currentAgentId);

  // Play agent wake sound when agent changes
  useEffect(() => {
    if (currentAgentId) {
      playAgentWake(currentAgentId);
    }
  }, [currentAgentId]);

  // Handle entering/exiting animations
  useEffect(() => {
    const timer = setTimeout(() => setEntering(false), 100);
    return () => clearTimeout(timer);
  }, []);

  // Handle skip button
  const handleSkip = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      skipRemaining();
    }, 200);
  }, [skipRemaining]);

  // Handle next button
  const handleNext = useCallback(() => {
    if (!currentConfig) return;
    // If current agent is Conflux (last), complete ceremony
    if (currentConfig.id === 'conflux') {
      setExiting(true);
      setTimeout(() => {
        saveInputs();
        onComplete();
      }, 200);
    } else {
      nextStep();
    }
  }, [currentConfig, nextStep, saveInputs, onComplete]);

  // If no current config (shouldn't happen), skip
  if (!currentConfig) {
    return null;
  }

  // Determine card theme class
  const themeClass = currentConfig.id === 'conflux' ? 'conflux' :
                     currentConfig.id === 'hearth' ? 'hearth' :
                     currentConfig.id === 'pulse' ? 'pulse' :
                     currentConfig.id === 'horizon' ? 'horizon' :
                     currentConfig.id === 'orbit' ? 'orbit' : '';

  // Progress dots
  const progressDots = agentIds.map((_, index) => (
    <div
      key={index}
      className={`progress-dot ${index === currentStep ? 'active' : ''}`}
    />
  ));

  return (
    <div
      className={`agent-introductions-overlay ${entering ? 'entering' : ''} ${exiting ? 'exiting' : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Skip button */}
      <button className="skip-button" onClick={handleSkip}>
        Skip
      </button>

      <div className="agent-card-container" ref={containerRef}>
        {agentIds.map((agentId, index) => {
          const config = getAgentIntroConfig(agentId);
          if (!config) return null;
          const isActive = index === currentStep;
          const isPast = index < currentStep;
          const isFuture = index > currentStep;

          // Determine animation class
          let animClass = '';
          if (isActive) animClass = 'active';
          else if (isPast) animClass = 'slide-out';
          else if (isFuture) animClass = 'slide-in';

          return (
            <div
              key={agentId}
              className={`agent-card ${config.id} ${animClass}`}
              style={{
                background: `linear-gradient(135deg, ${config.appColor}, ${adjustColor(config.appColor, -30)})`,
              }}
            >
              <div className="agent-emoji">{config.emoji}</div>
              <div className="agent-name">{config.name}</div>
              <div className="agent-intro-text">{config.introText}</div>

              {/* Starter preview (optional) */}
              {config.starterConfig.defaultPantryItems && (
                <div className="starter-preview">
                  Pantry pre-loaded with {config.starterConfig.defaultPantryItems.length} common items.
                </div>
              )}
              {config.starterConfig.defaultBudgetCategories && (
                <div className="starter-preview">
                  Budget categories ready: {config.starterConfig.defaultBudgetCategories.join(', ')}.
                </div>
              )}
              {config.starterConfig.dreamTemplates && (
                <div className="starter-preview">
                  Dream templates available.
                </div>
              )}
              {config.starterConfig.focusAreas && (
                <div className="starter-preview">
                  Focus areas: {config.starterConfig.focusAreas.join(', ')}.
                </div>
              )}

              {/* Input field (except Conflux) */}
              {config.id !== 'conflux' && (
                <div className="agent-input-wrapper">
                  <div className="agent-input-label">{config.inputLabel}</div>
                  <input
                    type="text"
                    className="agent-input"
                    placeholder={config.placeholder}
                    value={inputs[config.id] || ''}
                    onChange={(e) => setInput(config.id, e.target.value)}
                    autoFocus={isActive}
                  />
                </div>
              )}

              {/* Buttons */}
              <div className="agent-buttons">
                <button className="agent-button primary" onClick={handleNext}>
                  {config.id === 'conflux' ? 'Let’s go!' : 'Next'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress dots */}
      <div className="progress-dots">{progressDots}</div>
    </div>
  );
}

// Helper to adjust color brightness (simple version)
function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}