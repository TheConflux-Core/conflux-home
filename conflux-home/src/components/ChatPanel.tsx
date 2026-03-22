import { useState } from 'react';
import { Agent, AgentMessage } from '../types';

interface ChatPanelProps {
  agent: Agent | null;
  agents: Agent[];
  onSelectAgent: (agent: Agent) => void;
}

const DEMO_MESSAGES: AgentMessage[] = [
  {
    id: '1',
    agentId: 'system',
    content: 'Welcome to Conflux Home. Your AI family is online.',
    timestamp: '12:00 AM',
    type: 'system',
  },
  {
    id: '2',
    agentId: 'zigbot',
    content: "Hey Don. I've been analyzing our position. We're sitting on something bigger than prompt packs. Let me walk you through what I found...",
    timestamp: '12:01 AM',
    type: 'agent',
  },
  {
    id: '3',
    agentId: 'user',
    content: "Let's do it. What are we looking at?",
    timestamp: '12:02 AM',
    type: 'user',
  },
  {
    id: '4',
    agentId: 'zigbot',
    content: "15 billion-dollar companies researched. The pattern is clear: they all started with a trojan horse product, then became platforms. Our trojan horse might be the autonomous studio itself. We're already living the product we'd sell.",
    timestamp: '12:03 AM',
    type: 'agent',
  },
];

export default function ChatPanel({ agent, agents, onSelectAgent }: ChatPanelProps) {
  const [messages, setMessages] = useState<AgentMessage[]>(DEMO_MESSAGES);
  const [input, setInput] = useState('');

  const currentAgent = agent || agents[0];

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: AgentMessage = {
      id: Date.now().toString(),
      agentId: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      type: 'user',
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Simulate agent response
    setTimeout(() => {
      const agentMsg: AgentMessage = {
        id: (Date.now() + 1).toString(),
        agentId: currentAgent.id,
        content: `Thinking about "${input.slice(0, 30)}..." — let me process that and get back to you with a strategic analysis.`,
        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        type: 'agent',
      };
      setMessages(prev => [...prev, agentMsg]);
    }, 1500);
  };

  return (
    <div className="chat-container">
      {/* Agent Selector */}
      <div style={{
        display: 'flex',
        gap: 8,
        paddingBottom: 12,
        borderBottom: '1px solid var(--border)',
        marginBottom: 12,
        overflowX: 'auto',
      }}>
        {agents.map((a) => (
          <button
            key={a.id}
            onClick={() => onSelectAgent(a)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 20,
              border: `1px solid ${a.id === currentAgent.id ? 'var(--accent-primary)' : 'var(--border)'}`,
              background: a.id === currentAgent.id ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
              color: a.id === currentAgent.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 12,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <span>{a.emoji}</span>
            <span>{a.name}</span>
            <div className={`status-dot ${a.status}`} style={{ width: 6, height: 6 }} />
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message ${msg.type}`}>
            {msg.type === 'agent' && (
              <div style={{
                fontSize: 11,
                color: 'var(--accent-primary)',
                marginBottom: 4,
                fontWeight: 600,
              }}>
                {agents.find(a => a.id === msg.agentId)?.emoji}{' '}
                {agents.find(a => a.id === msg.agentId)?.name || 'Agent'}
              </div>
            )}
            {msg.content}
            <div style={{
              fontSize: 10,
              color: msg.type === 'user' ? 'rgba(0,0,0,0.5)' : 'var(--text-muted)',
              marginTop: 4,
              textAlign: msg.type === 'user' ? 'right' : 'left',
            }}>
              {msg.timestamp}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <input
          className="chat-input"
          placeholder={`Message ${currentAgent.name}...`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button className="chat-send" onClick={handleSend}>
          Send
        </button>
      </div>
    </div>
  );
}
