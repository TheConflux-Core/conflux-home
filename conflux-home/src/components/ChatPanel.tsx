import { useState, useEffect, useRef, useCallback } from 'react';
import Avatar from './Avatar';
import { Agent, AgentMessage } from '../types';

interface ChatPanelProps {
  agent: Agent | null;
  isOpen: boolean;
  onClose: () => void;
}

// Demo messages per agent — placeholder until gateway integration (S2-T008)
const DEMO_CONVERSATIONS: Record<string, AgentMessage[]> = {
  zigbot: [
    { id: 'z1', agentId: 'system', content: 'Connected to ZigBot — Strategic Partner', timestamp: '12:00 AM', type: 'system' },
    { id: 'z2', agentId: 'zigbot', content: "Hey Don. I've been analyzing our position. We're sitting on something bigger than prompt packs. Let me walk you through what I found...", timestamp: '12:01 AM', type: 'agent' },
    { id: 'z3', agentId: 'user', content: "Let's do it. What are we looking at?", timestamp: '12:02 AM', type: 'user' },
    { id: 'z4', agentId: 'zigbot', content: "15 billion-dollar companies researched. The pattern is clear: they all started with a trojan horse product, then became platforms. Our trojan horse might be the autonomous studio itself.", timestamp: '12:03 AM', type: 'agent' },
  ],
  helix: [
    { id: 'h1', agentId: 'system', content: 'Connected to Helix — Research & Intelligence', timestamp: '11:30 PM', type: 'system' },
    { id: 'h2', agentId: 'helix', content: "I've compiled research on 47 micro-SaaS companies that hit $1M ARR. Key insight: 80% started with a single painful problem, not a platform vision.", timestamp: '11:32 PM', type: 'agent' },
    { id: 'h3', agentId: 'user', content: "What's the fastest path you see?", timestamp: '11:35 PM', type: 'user' },
    { id: 'h4', agentId: 'helix', content: "Chrome extensions with AI features. Average time to $10K MRR: 4 months. Low build cost, high distribution leverage. I'm mapping the top 10 opportunities now.", timestamp: '11:36 PM', type: 'agent' },
  ],
  forge: [
    { id: 'f1', agentId: 'system', content: 'Connected to Forge — Builder', timestamp: '10:00 PM', type: 'system' },
    { id: 'f2', agentId: 'forge', content: "Ready to build. I've got the Conflux Home UI at 78% completion. What's next on the list?", timestamp: '10:01 PM', type: 'agent' },
  ],
  quanta: [
    { id: 'q1', agentId: 'system', content: 'Connected to Quanta — Quality Control', timestamp: '9:45 PM', type: 'system' },
    { id: 'q2', agentId: 'quanta', content: "Last verification run: 3 issues found in mission-0600 deliverables. All resolved. Standing by for next review.", timestamp: '9:47 PM', type: 'agent' },
  ],
  prism: [
    { id: 'p1', agentId: 'system', content: 'Connected to Prism — System Orchestrator', timestamp: '11:00 PM', type: 'system' },
    { id: 'p2', agentId: 'prism', content: "Pipeline status: 2 missions active, 1 queued. mission-1223 (Conflux Home) is at sprint 2, 4/10 tasks complete. mission-0600 awaiting Quanta verification.", timestamp: '11:02 PM', type: 'agent' },
  ],
  pulse: [
    { id: 'pu1', agentId: 'system', content: 'Connected to Pulse — Growth & Marketing', timestamp: '8:00 PM', type: 'system' },
    { id: 'pu2', agentId: 'pulse', content: "Launch packet for Prompt Pack Alpha is ready. SEO keywords mapped, 3 creative variants drafted. Waiting on product finalization.", timestamp: '8:05 PM', type: 'agent' },
  ],
  vector: [
    { id: 'v1', agentId: 'system', content: 'Connected to Vector — CEO / Gatekeeper', timestamp: '10:30 PM', type: 'system' },
    { id: 'v2', agentId: 'vector', content: "Portfolio review: 2 opportunities pending evaluation. The Chrome extension play scores highest on speed-to-revenue. I want to see the Helix research before approving.", timestamp: '10:32 PM', type: 'agent' },
  ],
};

export default function ChatPanel({ agent, isOpen, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load demo conversation when agent changes
  useEffect(() => {
    if (agent) {
      const convo = DEMO_CONVERSATIONS[agent.id] ?? [
        { id: 'default-1', agentId: 'system', content: `Connected to ${agent.name} — ${agent.role}`, timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), type: 'system' },
      ];
      setMessages(convo);
      setInput('');
      setIsThinking(false);
    }
  }, [agent?.id]);

  // Auto-scroll to bottom when messages change or panel opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to let the animation start and DOM render
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, isOpen]);

  const handleSend = useCallback(() => {
    if (!input.trim() || !agent) return;

    const userMsg: AgentMessage = {
      id: Date.now().toString(),
      agentId: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      type: 'user',
    };

    setMessages(prev => [...prev, userMsg]);
    const userInput = input;
    setInput('');
    setIsThinking(true);

    // Simulate agent response (placeholder — real gateway in S2-T008)
    setTimeout(() => {
      setIsThinking(false);
      const agentMsg: AgentMessage = {
        id: (Date.now() + 1).toString(),
        agentId: agent.id,
        content: `Processing "${userInput.slice(0, 40)}${userInput.length > 40 ? '...' : ''}" — let me analyze that and get back to you.`,
        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        type: 'agent',
      };
      setMessages(prev => [...prev, agentMsg]);
    }, 1500);
  }, [input, agent]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!agent) return null;

  return (
    <div className={`chat-panel ${isOpen ? 'open' : ''}`}>
      {/* Header */}
      <div className="chat-panel-header">
        <Avatar
          agentId={agent.id}
          name={agent.name}
          emoji={agent.emoji}
          status={agent.status}
          size="sm"
          showStatus={true}
        />
        <div className="chat-panel-header-info">
          <div className="chat-panel-header-name">{agent.name}</div>
          <div className="chat-panel-header-role">{agent.role}</div>
        </div>
        <button className="chat-panel-close" onClick={onClose} aria-label="Close chat">
          ✕
        </button>
      </div>

      {/* Messages or empty state */}
      {messages.length === 0 ? (
        <div className="chat-panel-empty">
          <Avatar
            agentId={agent.id}
            name={agent.name}
            emoji={agent.emoji}
            status={agent.status}
            size="hero"
            showStatus={true}
          />
          <div className="chat-panel-empty-text">
            Start a conversation with {agent.name}
          </div>
          <div className="chat-panel-empty-sub">
            {agent.description}
          </div>
        </div>
      ) : (
        <div className="chat-panel-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-message ${msg.type}`}>
              {msg.type === 'agent' && (
                <div style={{
                  fontSize: 11,
                  color: 'var(--accent-primary)',
                  marginBottom: 4,
                  fontWeight: 600,
                }}>
                  {agent.emoji} {agent.name}
                </div>
              )}
              {msg.content}
              <div style={{
                fontSize: 10,
                color: msg.type === 'user' ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)',
                marginTop: 4,
                textAlign: msg.type === 'user' ? 'right' : 'left',
              }}>
                {msg.timestamp}
              </div>
            </div>
          ))}

          {/* Thinking indicator */}
          {isThinking && (
            <div className="thinking-indicator">
              <div className="thinking-dot" />
              <div className="thinking-dot" />
              <div className="thinking-dot" />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input */}
      <div className="chat-panel-input-area">
        <input
          className="chat-panel-input"
          placeholder={`Message ${agent.name}...`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button className="chat-panel-send" onClick={handleSend}>
          Send
        </button>
      </div>
    </div>
  );
}
