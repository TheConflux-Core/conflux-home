import { useState, useRef, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface HearthChatProps {
  className?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'hearth';
  content: string;
}

interface HearthResponse {
  content: string;
  suggestions: string[];
}

export default function HearthChat({ className = '' }: HearthChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isFirstRender = useRef(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    scrollToBottom();
  }, [messages, suggestions]);

  // Boot greeting
  useEffect(() => {
    const greeting: ChatMessage = {
      id: 'greeting',
      role: 'hearth',
      content: "Hey, I'm Hearth — your kitchen companion. I know your meals, your pantry, and what's about to expire. I can suggest what to cook, help you plan your week, add items to your inventory, or just chat about food. What's on your mind?",
    };
    setMessages([greeting]);
    setSuggestions([
      'What should I cook tonight?',
      "What's about to expire?",
      'Plan my week',
      'Add chicken to my pantry',
    ]);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setSuggestions([]);

    try {
      const resp = await invoke<HearthResponse>('hearth_chat', {
        req: { message: text.trim() },
      });

      const hearthMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'hearth',
        content: resp.content,
      };

      setMessages(prev => [...prev, hearthMsg]);
      setSuggestions(resp.suggestions || []);
    } catch (err) {
      console.error('[HearthChat] invoke error:', err);
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'hearth',
        content: "I'm having trouble thinking right now — try again in a moment.",
      };
      setMessages(prev => [...prev, errMsg]);
      setSuggestions(['What should I cook tonight?', "What's about to expire?"]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [loading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className={`hearth-chat ${className}`}>
      {/* Messages */}
      <div className="hearth-chat-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`hearth-chat-msg hearth-chat-${msg.role}`}>
            {msg.role === 'hearth' && (
              <span className="hearth-chat-avatar">🍳</span>
            )}
            <div className="hearth-chat-bubble">{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div className="hearth-chat-msg hearth-chat-hearth">
            <span className="hearth-chat-avatar">🍳</span>
            <div className="hearth-chat-bubble hearth-chat-loading">
              <span className="hearth-dot" />
              <span className="hearth-dot" />
              <span className="hearth-dot" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && !loading && (
        <div className="hearth-chat-suggestions">
          {suggestions.map((s, i) => (
            <button
              key={i}
              className="hearth-suggestion-chip"
              onClick={() => sendMessage(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="hearth-chat-input-row">
        <div className="hearth-chat-input-wrap">
          <textarea
            ref={inputRef}
            className="hearth-chat-input"
            placeholder="Ask Hearth anything about your kitchen…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={loading}
          />
          <button
            className="hearth-chat-send"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
          >
            ↵
          </button>
        </div>
      </div>
    </div>
  );
}
