// BeatNarrator — heartbeat event detail modal
// Shows the firing agent's summary with auto-TTS and recent beat history.

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import { type BeatEvent, AGENTS } from '../lib/beatBus';
import { useBeatTimeline } from '../lib/beatBus';
import './BeatNarrator.css';

// Agent voice IDs (ElevenLabs) — matches commands.rs tts_speak and AdjustmentPanel
// These are the canonical IDs used throughout the app
const AGENT_VOICE_IDS: Record<string, string> = {
  conflux: 'TvxTBL9RtGW6tVhl4NoI', // Rachel (default)
  helix:   'USEXQnsXRJlw2k9LUzG4',
  pulse:   'auq43ws1oslv0tO4BDa7',
  hearth:  'W7iR5kTNHozpIl2Jqq15',
  echo:    'EST9Ui6982FZPSi7gCHi',
  aegis:   'WtA85syCrJwasGeHGH2p',
  viper:   'Mtmp3KhFIjYpWYRycDe3',
  forge:   'WLKp2jV6nrS8aMkPPDRO',
  orbit:   'QzTKubutNn9TjrB7Xb2Q',
  horizon: 'USEXQnsXRJlw2k9LUzG4',   // no dedicated voice — borrow helix's
  quanta:  'TvxTBL9RtGW6tVhl4NoI',
  prism:   'TvxTBL9RtGW6tVhl4NoI',
  vector:  'TvxTBL9RtGW6tVhl4NoI',
  spectra: 'TvxTBL9RtGW6tVhl4NoI',
  luma:    'TvxTBL9RtGW6tVhl4NoI',
  catalyst:'TvxTBL9RtGW6tVhl4NoI',
};

interface BeatNarratorProps {
  event: BeatEvent;
  onClose: () => void;
}

function timeAgoMs(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Web Audio playback (module-level so refs persist across calls) ──
let _audioCtx: AudioContext | null = null;
let _activeSource: AudioBufferSourceNode | null = null;

function getAudioCtx(): AudioContext {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  const ctx = _audioCtx;
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function stopAudio() {
  try { _activeSource?.stop(); } catch (_) { /* already stopped */ }
  _activeSource = null;
}

// ── TTS via ElevenLabs (tts_speak command) ─────────────────────────────────────
async function speakText(text: string, voiceId: string): Promise<void> {
  stopAudio();
  const result = await invoke<{ audio_base64: string }>('tts_speak', {
    text,
    voice: voiceId,
  });
  const ctx = getAudioCtx();
  const binaryString = atob(result.audio_base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  const buffer = await ctx.decodeAudioData(bytes.buffer);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  _activeSource = source;
  source.onended = () => { _activeSource = null; };
  source.start(0);
  await new Promise(resolve => { source.onended = resolve; });
}

export default function BeatNarrator({ event, onClose }: BeatNarratorProps) {
  const [speaking, setSpeaking] = useState(false);
  const [briefing, setBriefing] = useState(false);
  const allEvents = useBeatTimeline();
  const stopRef = useRef<(() => void) | null>(null);

  const agent = AGENTS.find(a => a.id === event.agentId);
  const agentColor = agent?.color ?? '#8b5cf6';
  const voiceId = AGENT_VOICE_IDS[event.agentId] ?? AGENT_VOICE_IDS.conflux;

  // Build the spoken summary — first person, the agent's own voice
  const summaryText = event.detail
    ? `${event.action} — ${event.detail}`
    : event.action;

  // Auto-TTS on mount
  useEffect(() => {
    let cancelled = false;
    setSpeaking(true);

    speakText(summaryText, voiceId)
      .catch(err => { console.warn('[BeatNarrator] TTS failed:', err); })
      .finally(() => { if (!cancelled) setSpeaking(false); });

    return () => {
      cancelled = true;
    };
  }, []);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleFullBriefing = async () => {
    if (briefing) return;
    setBriefing(true);
    setSpeaking(true);

    const recent = allEvents.slice(0, 5);
    const narrative = recent
      .map(e => {
        const a = AGENTS.find(a => a.id === e.agentId);
        return `${a?.label ?? e.agentLabel}: ${e.action}. ${e.detail ?? ''}`;
      })
      .join(' Next. ');

    try {
      await speakText(narrative || 'No recent activity to report.', voiceId);
    } catch (err) {
      console.warn('[BeatNarrator] Briefing TTS failed:', err);
    } finally {
      setBriefing(false);
      setSpeaking(false);
    }
  };

  const agentBgColor = `${agentColor}18`;

  return (
    <div className="beat-narrator-backdrop" onClick={onClose}>
      <motion.div
        className="beat-narrator"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 8 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        style={{ '--agent-color': agentColor, '--agent-bg': agentBgColor } as React.CSSProperties}
      >
        {/* Glow border top */}
        <div className="beat-narrator-glow" style={{ background: agentColor }} />

        {/* Header */}
        <div className="beat-narrator-header">
          <div className="beat-narrator-agent">
            <span
              className="beat-narrator-emoji"
              style={{ filter: `drop-shadow(0 0 12px ${agentColor})` }}
            >
              {agent?.emoji ?? '⚡'}
            </span>
            <div>
              <div className="beat-narrator-agent-name" style={{ color: agentColor }}>
                {event.agentLabel}
              </div>
              <div className="beat-narrator-agent-role">
                {event.type === 'success' ? '✓ Completed' : event.type === 'warn' ? '⚠ Attention' : 'Live Update'}
              </div>
            </div>
          </div>
          <div className="beat-narrator-header-right">
            {speaking && (
              <div className="beat-narrator-speaking">
                <span className="beat-speaking-dot" style={{ background: agentColor }} />
                <span className="beat-speaking-dot" style={{ background: agentColor }} />
                <span className="beat-speaking-dot" style={{ background: agentColor }} />
                Speaking
              </div>
            )}
            <button className="beat-narrator-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Hero: main action */}
        <div className="beat-narrator-hero">
          <div className="beat-narrator-action">{event.action}</div>
          {event.detail && (
            <div className="beat-narrator-detail">{event.detail}</div>
          )}
          <div className="beat-narrator-time">{timeAgoMs(event.timestamp)}</div>
        </div>

        {/* TTS button */}
        <div className="beat-narrator-controls">
          <button
            className={`beat-narrator-btn beat-narrator-btn-primary ${speaking ? 'speaking' : ''}`}
            onClick={handleFullBriefing}
            disabled={speaking}
            style={{ '--agent-color': agentColor } as React.CSSProperties}
          >
            {speaking ? (
              <>
                <span className="beat-speaking-dots">
                  <span style={{ background: agentColor }} />
                  <span style={{ background: agentColor }} />
                  <span style={{ background: agentColor }} />
                </span>
                Narrating...
              </>
            ) : (
              <>🔊 Hear full briefing</>
            )}
          </button>
        </div>

        {/* Recent beats history */}
        {allEvents.length > 1 && (
          <div className="beat-narrator-history">
            <div className="beat-narrator-history-label">Recent Activity</div>
            <div className="beat-narrator-history-list">
              {allEvents.slice(0, 8).map((e, i) => {
                const a = AGENTS.find(a => a.id === e.agentId);
                return (
                  <div
                    key={e.id}
                    className={`beat-narrator-history-row beat-narrator-history-row-${e.type}`}
                    style={{ opacity: i === 0 ? 1 : 0.65 - i * 0.05 }}
                  >
                    <span className="beat-history-emoji" style={{ color: a?.color }}>
                      {a?.emoji ?? '⚡'}
                    </span>
                    <span className="beat-history-action">{e.action}</span>
                    <span className="beat-history-time">{timeAgoMs(e.timestamp)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}