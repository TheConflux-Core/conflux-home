import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useStudio } from '../context/StudioContext';
import { STUDIO_MODULES, StudioModule } from '../types';

interface AdjustmentPanelProps {
  userTier?: string;
  onGateFeature?: (feature: string) => void;
}

export default function AdjustmentPanel({ userTier = 'free', onGateFeature }: AdjustmentPanelProps) {
  const { activeModule, adjustments, updateAdjustment, setPrompt } = useStudio();
  const [dailyCount, setDailyCount] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(-1); // -1 = unlimited

  const currentAdjustments = adjustments[activeModule] || {};

  // Fetch daily usage when module changes
  const loadDailyUsage = useCallback(async () => {
    try {
      const [count, limit] = await Promise.all([
        invoke<number>('studio_get_daily_count', { module: activeModule }),
        invoke<number>('studio_get_daily_limit', { module: activeModule }),
      ]);
      setDailyCount(count);
      setDailyLimit(limit);
    } catch {
      // Daily usage tracking unavailable — that's OK
      setDailyCount(0);
      setDailyLimit(-1);
    }
  }, [activeModule]);

  useEffect(() => {
    loadDailyUsage();
  }, [loadDailyUsage]);

  // Refresh daily count after generation (listen for changes)
  useEffect(() => {
    const interval = setInterval(loadDailyUsage, 5000);
    return () => clearInterval(interval);
  }, [loadDailyUsage]);

  const isAtLimit = dailyLimit > 0 && dailyCount >= dailyLimit;
  const usagePct = dailyLimit > 0 ? Math.min((dailyCount / dailyLimit) * 100, 100) : 0;

  const renderDailyUsage = () => {
    // Only show for modules with limits (image, music)
    if (dailyLimit < 0) return null;

    return (
      <div className="adjustment-group" style={{ marginBottom: 12 }}>
        <label className="adjustment-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Daily Usage</span>
          <span style={{
            fontSize: 11,
            color: isAtLimit ? '#ef4444' : 'var(--text-muted, #888)',
            fontWeight: isAtLimit ? 600 : 400,
          }}>
            {dailyCount} / {dailyLimit}
          </span>
        </label>
        <div style={{
          width: '100%',
          height: 6,
          borderRadius: 3,
          background: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${usagePct}%`,
            height: '100%',
            borderRadius: 3,
            background: isAtLimit
              ? '#ef4444'
              : usagePct > 70
                ? '#f59e0b'
                : '#8b5cf6',
            transition: 'width 0.3s ease',
          }} />
        </div>
        {isAtLimit && (
          <div style={{
            fontSize: 11,
            color: '#ef4444',
            marginTop: 4,
            lineHeight: 1.4,
          }}>
            Daily limit reached. Upgrade to Pro for more.
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => {
    switch (activeModule) {
      case 'image':
        return (
          <>
            {renderDailyUsage()}
            <div className="adjustment-group">
              <label className="adjustment-label">Template</label>
              <div className="adjustment-buttons">
                {[
                  { label: 'Portrait', prompt: 'A portrait of a person, detailed face, studio lighting' },
                  { label: 'Landscape', prompt: 'A wide landscape scene, epic vista, natural lighting' },
                  { label: 'Product', prompt: 'A professional product photo, clean background, commercial' },
                  { label: 'Thumbnail', prompt: 'YouTube thumbnail style, eye-catching, bold composition' },
                  { label: 'Abstract', prompt: 'Abstract digital art, surreal, colorful gradients' },
                ].map((t) => (
                  <button
                    key={t.label}
                    className="adjustment-btn"
                    onClick={() => setPrompt(t.prompt)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="adjustment-group">
              <label className="adjustment-label">Size</label>
              <div className="adjustment-buttons">
                {['512x512', '1024x1024', '1792x1024', '1024x1792'].map((size) => (
                  <button
                    key={size}
                    className={`adjustment-btn ${currentAdjustments.size === size ? 'active' : ''}`}
                    onClick={() => updateAdjustment('image', 'size', size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
            <div className="adjustment-group">
              <label className="adjustment-label">Style</label>
              <div className="adjustment-buttons">
                {['vivid', 'natural', 'dramatic'].map((style) => (
                  <button
                    key={style}
                    className={`adjustment-btn ${currentAdjustments.style === style ? 'active' : ''}`}
                    onClick={() => updateAdjustment('image', 'style', style)}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>
            <div className="adjustment-group">
              <label className="adjustment-label">Quality</label>
              <div className="adjustment-buttons">
                {['standard', 'high', 'ultra'].map((quality) => (
                  <button
                    key={quality}
                    className={`adjustment-btn ${currentAdjustments.quality === quality ? 'active' : ''}`}
                    onClick={() => updateAdjustment('image', 'quality', quality)}
                  >
                    {quality}
                  </button>
                ))}
              </div>
            </div>
          </>
        );

      case 'voice':
        return (
          <>
            <div className="adjustment-group">
              <label className="adjustment-label">Voice</label>
              {userTier === 'free' ? (
                <>
                  <div style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.5)',
                    marginBottom: 8,
                    lineHeight: 1.5,
                  }}>
                    Basic TTS with MiniMax. Upgrade for ElevenLabs voice cloning and 30+ premium voices.
                  </div>
                  <button
                    className="adjustment-btn"
                    onClick={() => onGateFeature?.('Voice Cloning')}
                    style={{
                      width: '100%',
                      borderColor: 'rgba(139, 92, 246, 0.4)',
                      color: '#8b5cf6',
                    }}
                  >
                    🔒 Unlock Voice Cloning
                  </button>
                </>
              ) : (
                <div className="adjustment-buttons">
                  {[
                    { id: 'conflux', label: 'Conflux', voiceId: 'TvxTBL9RtGW6tVhl4NoI' },
                    { id: 'helix', label: 'Helix', voiceId: 'USEXQnsXRJlw2k9LUzG4' },
                    { id: 'pulse', label: 'Pulse', voiceId: 'auq43ws1oslv0tO4BDa7' },
                    { id: 'hearth', label: 'Hearth', voiceId: 'W7iR5kTNHozpIl2Jqq15' },
                    { id: 'echo', label: 'Echo', voiceId: 'EST9Ui6982FZPSi7gCHi' },
                    { id: 'rachel', label: 'Rachel (default)', voiceId: 'JBFqnCBsd6RMkjVDRZzb' },
                  ].map((v) => (
                    <button
                      key={v.id}
                      className={`adjustment-btn ${currentAdjustments.voiceId === v.voiceId ? 'active' : ''}`}
                      onClick={() => updateAdjustment('voice', 'voiceId', v.voiceId)}
                      title={v.id}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="adjustment-group">
              <label className="adjustment-label">Speed</label>
              <div className="adjustment-slider">
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={currentAdjustments.speed || 1.0}
                  onChange={(e) => updateAdjustment('voice', 'speed', parseFloat(e.target.value))}
                />
                <span className="adjustment-value">{(currentAdjustments.speed || 1.0).toFixed(1)}x</span>
              </div>
            </div>
            <div className="adjustment-group">
              <label className="adjustment-label">Stability</label>
              <div className="adjustment-slider">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={currentAdjustments.stability || 0.5}
                  onChange={(e) => updateAdjustment('voice', 'stability', parseFloat(e.target.value))}
                />
                <span className="adjustment-value">{((currentAdjustments.stability || 0.5) * 100).toFixed(0)}%</span>
              </div>
            </div>
          </>
        );

      case 'video':
        return (
          <>
            <div className="adjustment-group">
              <label className="adjustment-label">Duration (seconds)</label>
              <div className="adjustment-number">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={currentAdjustments.duration || 5}
                  onChange={(e) => updateAdjustment('video', 'duration', parseInt(e.target.value))}
                />
              </div>
            </div>
            <div className="adjustment-group">
              <label className="adjustment-label">Frame Rate</label>
              <div className="adjustment-buttons">
                {[24, 30, 60].map((fps) => (
                  <button
                    key={fps}
                    className={`adjustment-btn ${currentAdjustments.fps === fps ? 'active' : ''}`}
                    onClick={() => updateAdjustment('video', 'fps', fps)}
                  >
                    {fps} fps
                  </button>
                ))}
              </div>
            </div>
            <div className="adjustment-group">
              <label className="adjustment-label">Style</label>
              <div className="adjustment-buttons">
                {['cinematic', 'animated', 'realistic'].map((style) => (
                  <button
                    key={style}
                    className={`adjustment-btn ${currentAdjustments.style === style ? 'active' : ''}`}
                    onClick={() => updateAdjustment('video', 'style', style)}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>
          </>
        );

      case 'music':
        return (
          <>
            {renderDailyUsage()}
            <div className="adjustment-group">
              <label className="adjustment-label">Mode</label>
              <div className="adjustment-buttons">
                <button
                  className={`adjustment-btn ${!currentAdjustments.instrumental ? 'active' : ''}`}
                  onClick={() => updateAdjustment('music', 'instrumental', false)}
                >
                  🎤 With Vocals
                </button>
                <button
                  className={`adjustment-btn ${currentAdjustments.instrumental ? 'active' : ''}`}
                  onClick={() => updateAdjustment('music', 'instrumental', true)}
                >
                  🎹 Instrumental
                </button>
              </div>
            </div>
            {!currentAdjustments.instrumental && (
              <div className="adjustment-group">
                <label className="adjustment-label">Lyrics <span style={{ opacity: 0.5, fontSize: 11 }}>(optional — auto-generated if empty)</span></label>
                <textarea
                  className="adjustment-textarea"
                  placeholder="[Verse]\nYour lyrics here...\n[Chorus]\nOr leave empty for auto-generation"
                  value={currentAdjustments.lyrics || ''}
                  onChange={(e) => updateAdjustment('music', 'lyrics', e.target.value)}
                  rows={4}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6,
                    color: 'inherit',
                    fontSize: 12,
                    padding: '8px 10px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            )}
            <div className="adjustment-group">
              <label className="adjustment-label">Genre</label>
              <div className="adjustment-buttons">
                {['ambient', 'electronic', 'classical', 'jazz', 'rock', 'hip-hop'].map((genre) => (
                  <button
                    key={genre}
                    className={`adjustment-btn ${currentAdjustments.genre === genre ? 'active' : ''}`}
                    onClick={() => updateAdjustment('music', 'genre', genre)}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
            <div className="adjustment-group">
              <label className="adjustment-label">Duration</label>
              <div className="adjustment-buttons">
                {[15, 30, 60].map((duration) => (
                  <button
                    key={duration}
                    className={`adjustment-btn ${currentAdjustments.duration === duration ? 'active' : ''}`}
                    onClick={() => updateAdjustment('music', 'duration', duration)}
                  >
                    {duration}s
                  </button>
                ))}
              </div>
            </div>
            <div className="adjustment-group">
              <label className="adjustment-label">Mood</label>
              <div className="adjustment-buttons">
                {['calm', 'energetic', 'melancholic', 'joyful', 'mysterious'].map((mood) => (
                  <button
                    key={mood}
                    className={`adjustment-btn ${currentAdjustments.mood === mood ? 'active' : ''}`}
                    onClick={() => updateAdjustment('music', 'mood', mood)}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>
          </>
        );

      case 'code':
        return (
          <>
            {renderDailyUsage()}
            <div className="adjustment-group">
              <label className="adjustment-label">Framework</label>
              <div className="adjustment-buttons">
                {[
                  { key: 'html', label: 'HTML/CSS/JS' },
                  { key: 'react', label: 'React + Tailwind' },
                  { key: 'tailwind', label: 'HTML + Tailwind' },
                ].map((fw) => (
                  <button
                    key={fw.key}
                    className={`adjustment-btn ${currentAdjustments.framework === fw.key ? 'active' : ''}`}
                    onClick={() => updateAdjustment('code', 'framework', fw.key)}
                  >
                    {fw.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="adjustment-group">
              <label className="adjustment-label">Complexity</label>
              <div className="adjustment-buttons">
                {['simple', 'medium', 'complex'].map((level) => (
                  <button
                    key={level}
                    className={`adjustment-btn ${currentAdjustments.complexity === level ? 'active' : ''}`}
                    onClick={() => updateAdjustment('code', 'complexity', level)}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            <div className="adjustment-group">
              <label className="adjustment-label">Templates</label>
              <div className="adjustment-buttons">
                {[
                  { label: '🎯 Component', prompt: 'A reusable UI component with hover states and clean styling' },
                  { label: '📄 Landing Page', prompt: 'A full landing page with hero section, features, and call-to-action' },
                  { label: '📊 Dashboard', prompt: 'A dashboard layout with cards, stats, and data visualization' },
                  { label: '📝 Form', prompt: 'A styled form with inputs, validation states, and submit button' },
                  { label: '✨ Animation', prompt: 'A CSS animation showcase with smooth transitions and effects' },
                  { label: '🎮 Interactive', prompt: 'An interactive UI element with click handlers and state changes' },
                ].map((t) => (
                  <button
                    key={t.label}
                    className="adjustment-btn"
                    onClick={() => setPrompt(t.prompt)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        );

      case 'writing':
        return (
          <>
            <div className="adjustment-group">
              <label className="adjustment-label">Format</label>
              <div className="adjustment-buttons">
                {['story', 'poem', 'essay', 'script', 'song'].map((format) => (
                  <button
                    key={format}
                    className={`adjustment-btn ${currentAdjustments.format === format ? 'active' : ''}`}
                    onClick={() => updateAdjustment('writing', 'format', format)}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>
            <div className="adjustment-group">
              <label className="adjustment-label">Tone</label>
              <div className="adjustment-buttons">
                {['lyrical', 'noir', 'whimsical', 'epic', 'intimate'].map((style) => (
                  <button
                    key={style}
                    className={`adjustment-btn ${currentAdjustments.style === style ? 'active' : ''}`}
                    onClick={() => updateAdjustment('writing', 'style', style)}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>
            <div className="adjustment-group">
              <label className="adjustment-label">Colors</label>
              <div className="adjustment-number">
                <input
                  type="range"
                  min="1"
                  max="6"
                  step="1"
                  value={currentAdjustments.colorCount || 3}
                  onChange={(e) => updateAdjustment('design', 'colorCount', parseInt(e.target.value))}
                />
                <span className="adjustment-value">{currentAdjustments.colorCount || 3} colors</span>
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="studio-adjustment-panel">
      <div className="adjustment-header">
        <span className="adjustment-title">Adjustments</span>
        <span className="adjustment-module">{STUDIO_MODULES[activeModule]?.icon}</span>
      </div>
      <div className="adjustment-content">
        {renderControls()}
      </div>
    </div>
  );
}
