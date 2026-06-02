import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { convertFileSrc } from '@tauri-apps/api/core';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useStudio } from '../context/StudioContext';
import { STUDIO_MODULES, StudioModule } from '../types';
import ToolPalette from './ToolPalette';
import AdjustmentPanel from './AdjustmentPanel';
import HistoryStrip from './HistoryStrip';
import StudioBackground from './StudioBackground';
import StudioGallery from './StudioGallery';
import StudioProject from './StudioProject';
import StudioAnalytics from './StudioAnalytics';
import StudioUpgradeModal from './StudioUpgradeModal';
import WebPreview from './WebPreview';
import '../styles-studio.css';

function getDisplayUrl(gen: { output_url: string | null; output_path: string | null }): string | null {
  if (gen.output_url?.startsWith('http')) return gen.output_url;
  if (gen.output_path) return convertFileSrc(gen.output_path);
  if (gen.output_url?.startsWith('file://')) return gen.output_url.replace('file://', '');
  return null;
}

function getThumbnailUrl(gen: { output_url: string | null; output_path: string | null }): string | null {
  if (gen.output_url?.startsWith('http')) return gen.output_url;
  if (gen.output_path) return convertFileSrc(gen.output_path);
  return null;
}

export default function StudioDashboard({ initialModule }: { initialModule?: StudioModule }) {
  const {
    activeModule,
    setActiveModule,
    prompt,
    setPrompt,
    isGenerating,
    generations,
    selectedGeneration,
    selectGeneration,
    generate,
    generateBatch,
    saveToVault,
    remix,
    loadHistory,
    adjustments,
    updateAdjustment,
    isFullscreen,
    toggleFullscreen,
    currentProject,
    projects,
    setProjects,
    setCurrentProject,
    batchGenerations,
    setBatchGenerations,
    enterGallery,
    setEnterGallery,
    referenceImage,
    setReferenceImage,
    referenceAudio,
    setReferenceAudio,
  } = useStudio();

  // All hooks (must be called unconditionally)
  const [credits, setCredits] = useState<number | null>(null);
  const [toolPaletteCollapsed, setToolPaletteCollapsed] = useState(false);

  // Analytics panel state
  const [showAnalytics, setShowAnalytics] = useState(false);

  // User tier + upgrade modal
  const [userTier, setUserTier] = useState('free');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState('');

  // Daily usage tracking (for prompt bar limit indicator)
  const [dailyCount, setDailyCount] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(-1);

  const loadDailyUsage = useCallback(async () => {
    try {
      const [count, limit] = await Promise.all([
        invoke<number>('studio_get_daily_count', { module: activeModule }),
        invoke<number>('studio_get_daily_limit', { module: activeModule }),
      ]);
      setDailyCount(count);
      setDailyLimit(limit);
    } catch {
      setDailyCount(0);
      setDailyLimit(-1);
    }
  }, [activeModule]);

  useEffect(() => { loadDailyUsage(); }, [loadDailyUsage]);

  // Load credit balance
  const loadCredits = useCallback(async () => {
    try {
      const userId = await invoke<string>('get_studio_user_id');
      if (!userId) return;
      const result = await invoke<{ balance: number; has_active_subscription: boolean }>(
        'get_credit_balance',
        { user_id: userId }
      );
      setCredits(result.balance);
    } catch {
      // Credit system unavailable — that's OK
    }
  }, []);

  // Load projects
  const loadProjects = useCallback(async () => {
    try {
      const result = await invoke<Array<{ id: string; name: string; path: string }>>('studio_get_projects');
      if (result.length > 0) {
        setProjects(result);
      }
    } catch {
      // Projects not implemented yet
    }
  }, []);

  useEffect(() => {
    loadCredits();
    loadProjects();
    // Load user tier
    invoke<string>('studio_get_user_tier').then(setUserTier).catch(() => {});
  }, [loadCredits, loadProjects]);

  // Apply initial module from parent (e.g. when launched from Creator category)
  useEffect(() => {
    if (initialModule) {
      setActiveModule(initialModule);
    }
  }, [initialModule, setActiveModule]);

  // Handle reference image upload
  const handleReferenceUpload = useCallback(async () => {
    try {
      const selected = await open({
        title: 'Select Reference Image',
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
        multiple: false,
      });
      if (selected) {
        setReferenceImage(Array.isArray(selected) ? selected[0] : selected);
      }
    } catch (e) {
      console.error('Failed to open file dialog:', e);
    }
  }, [setReferenceImage]);

  // Handle reference audio upload (for music cover generation)
  const handleReferenceAudioUpload = useCallback(async () => {
    try {
      const selected = await open({
        title: 'Select Reference Audio',
        filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac'] }],
        multiple: false,
      });
      if (selected) {
        setReferenceAudio(Array.isArray(selected) ? selected[0] : selected);
      }
    } catch (e) {
      console.error('Failed to open audio file dialog:', e);
    }
  }, [setReferenceAudio]);

  // Wrap generate to also pass reference image and refresh credits
  const handleGenerate = useCallback(async () => {
    await generate();
    // Refresh credits and daily usage after generation
    setTimeout(() => { loadCredits(); loadDailyUsage(); }, 2000);
  }, [generate, loadCredits, loadDailyUsage]);

  // Wrap save to refresh after
  const handleSaveToVault = useCallback(async (gen: any) => {
    await saveToVault(gen);
    await loadHistory();
  }, [saveToVault, loadHistory]);

  const moduleInfo = STUDIO_MODULES[activeModule];

  // Gallery / Project overlay modes
  if (enterGallery) {
    return selectedGeneration ? <StudioProject /> : <StudioGallery />;
  }

  return (
    <div className="studio-dashboard-container">
      {/* Background particle canvas — z-index: 0, pointer-events: none */}
      <StudioBackground className="studio-background" />

      {/* Header */}
      <div className="studio-dashboard-header">
        <div className="dashboard-header-left">
          <div className="dashboard-header-title">
            <h2 className="studio-title">✨ Studio</h2>
            {projects.length > 1 && (
              <select
                className="dashboard-project-select"
                value={currentProject}
                onChange={(e) => setCurrentProject(e.target.value)}
              >
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>{proj.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="dashboard-header-center">
          <div className="dashboard-breadcrumb">
            <span className="dashboard-module-icon">{moduleInfo.icon}</span>
            <span className="dashboard-module-label">{moduleInfo.label}</span>
            <span className="dashboard-breadcrumb-sep">/</span>
            <span className="dashboard-project-name">{projects.find(p => p.id === currentProject)?.name || 'Default'}</span>
          </div>
        </div>
        <div className="dashboard-header-right">
          {credits !== null && (
            <div className="studio-credits-badge">
              <span className="studio-credits-icon">⚡</span>
              <span className="studio-credits-amount">{credits.toLocaleString()}</span>
              <span className="studio-credits-label">credits</span>
            </div>
          )}
          <div style={{
            fontSize: 11,
            padding: '3px 8px',
            borderRadius: 6,
            background: userTier === 'free' ? 'rgba(255,255,255,0.06)' : 'rgba(139, 92, 246, 0.15)',
            color: userTier === 'free' ? 'rgba(255,255,255,0.4)' : '#8b5cf6',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}>
            {userTier === 'free' ? 'Free' : userTier === 'pro' ? 'Pro' : 'BYOK'}
          </div>
          <button
            className="dashboard-gallery-btn"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('conflux:navigate', { detail: { viewId: 'vault' } }));
            }}
            title="Open Vault"
          >
            🛡️
          </button>
          <button
            className={`dashboard-fullscreen-btn ${isFullscreen ? 'active' : ''}`}
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? '⛶' : '⛶'}
          </button>
          <button
            className={`dashboard-analytics-btn ${showAnalytics ? 'active' : ''}`}
            onClick={() => setShowAnalytics(!showAnalytics)}
            title="Analytics"
          >
            📊
          </button>
        </div>
      </div>

      {/* Analytics Panel */}
      {showAnalytics && (
        <div className="studio-analytics-panel">
          <StudioAnalytics
            generations={generations}
            onClose={() => setShowAnalytics(false)}
          />
        </div>
      )}

      {/* Main Dashboard Layout */}
      <div className="studio-dashboard-main">
        {/* Tool Palette */}
        <ToolPalette
          activeModule={activeModule}
          onSelect={setActiveModule}
          isCollapsed={toolPaletteCollapsed}
          onToggleCollapse={() => setToolPaletteCollapsed(!toolPaletteCollapsed)}
          userTier={userTier}
          onGateModule={(mod) => {
            const featureNames: Record<string, string> = {
              video: 'Video Generation',
              voice: 'Voice Cloning',
            };
            setUpgradeFeature(featureNames[mod] || 'Premium Module');
            setShowUpgradeModal(true);
          }}
        />

        {/* Preview Canvas */}
        <div className={`studio-preview-canvas ${isFullscreen ? 'fullscreen' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeModule}-${selectedGeneration?.id || 'empty'}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="preview-canvas-content"
            >
              {isGenerating ? (
                <div className="preview-generating">
                  <div className="preview-shimmer">
                    <div className="preview-shimmer-bar" />
                    <div className="preview-shimmer-text">Generating...</div>
                  </div>
                </div>
              ) : selectedGeneration ? (
                <div className="preview-generation">
                  {selectedGeneration.status === 'failed' && (
                    <div className="preview-error">
                      <div className="preview-error-icon">❌</div>
                      <div className="preview-error-title">Generation Failed</div>
                      <div className="preview-error-message">
                        {(() => {
                          try {
                            const meta = selectedGeneration.metadata_json ? JSON.parse(selectedGeneration.metadata_json) : {};
                            return meta.message || meta.body || meta.error || 'Unknown error';
                          } catch { return 'Unknown error'; }
                        })()}
                      </div>
                      <div className="preview-error-prompt">{selectedGeneration.prompt}</div>
                    </div>
                  )}
                  {selectedGeneration.status !== 'failed' && selectedGeneration.module === 'image' && getDisplayUrl(selectedGeneration) && (
                    <motion.img
                      src={getDisplayUrl(selectedGeneration)!}
                      alt={selectedGeneration.prompt}
                      className="preview-image"
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                  {selectedGeneration.status !== 'failed' && selectedGeneration.module === 'voice' && getDisplayUrl(selectedGeneration) && (
                    <div className="preview-voice">
                      <div className="preview-waveform">
                        {[...Array(20)].map((_, i) => (
                          <div
                            key={i}
                            className="preview-waveform-bar"
                            style={{ animationDelay: `${i * 0.1}s` }}
                          />
                        ))}
                      </div>
                      <audio controls src={getDisplayUrl(selectedGeneration)!} className="preview-audio" />
                    </div>
                  )}
                  {selectedGeneration.status !== 'failed' && selectedGeneration.module === 'music' && getDisplayUrl(selectedGeneration) && (
                    <div className="preview-music">
                      <div className="preview-music-icon">🎵</div>
                      <div className="preview-music-info">
                        <div className="preview-music-title">
                          {selectedGeneration.prompt.length > 60
                            ? selectedGeneration.prompt.slice(0, 60) + '...'
                            : selectedGeneration.prompt}
                        </div>
                        <div className="preview-music-meta">
                          {(() => {
                            try {
                              const meta = selectedGeneration.metadata_json ? JSON.parse(selectedGeneration.metadata_json) : {};
                              return [
                                meta.is_cover ? 'Cover' : null,
                                meta.is_instrumental ? 'Instrumental' : null,
                                meta.model || 'music-2.6',
                              ].filter(Boolean).join(' · ');
                            } catch { return 'music-2.6'; }
                          })()}
                        </div>
                      </div>
                      <div className="preview-music-waveform">
                        {[...Array(32)].map((_, i) => (
                          <div
                            key={i}
                            className="preview-music-bar"
                            style={{ animationDelay: `${i * 0.08}s` }}
                          />
                        ))}
                      </div>
                      <audio controls src={getDisplayUrl(selectedGeneration)!} className="preview-audio" />
                    </div>
                  )}
                  {selectedGeneration.status !== 'failed' && selectedGeneration.module === 'code' && selectedGeneration.metadata_json && (() => {
                    try {
                      const meta = JSON.parse(selectedGeneration.metadata_json);
                      if (meta.code) return true;
                    } catch {}
                    return false;
                  })() && (
                    <WebPreview
                      generation={selectedGeneration}
                      onRemix={(newGen) => {
                        loadHistory();
                        selectGeneration(newGen);
                      }}
                      onSaveToVault={handleSaveToVault}
                      onExport={async (gen) => {
                        try {
                          const path = await invoke<string>('studio_export_generations_zip', { generationIds: [gen.id] });
                          console.log('Exported to:', path);
                        } catch (e) {
                          console.error('Export failed:', e);
                        }
                      }}
                    />
                  )}
                  {/* Writing: render text content from metadata */}
                  {selectedGeneration.status !== 'failed' && selectedGeneration.module === 'writing' && selectedGeneration.metadata_json && (() => {
                    try {
                      const meta = JSON.parse(selectedGeneration.metadata_json);
                      if (meta.text) return true;
                    } catch {}
                    return false;
                  })() && (
                    <div className="preview-writing">
                      <div className="preview-writing-header">
                        <span className="preview-writing-format">{(() => {
                          try { return JSON.parse(selectedGeneration.metadata_json).format || 'writing'; } catch { return 'writing'; }
                        })()}</span>
                        <span className="preview-writing-tone">{(() => {
                          try { return JSON.parse(selectedGeneration.metadata_json).tone || ''; } catch { return ''; }
                        })()}</span>
                        <span className="preview-writing-words">{(() => {
                          try { return `${JSON.parse(selectedGeneration.metadata_json).word_count || 0} words`; } catch { return ''; }
                        })()}</span>
                      </div>
                      <div className="preview-writing-content">
                        {(() => {
                          try {
                            return JSON.parse(selectedGeneration.metadata_json).text;
                          } catch { return 'Unable to load content.'; }
                        })()}
                      </div>
                    </div>
                  )}
                  {!getDisplayUrl(selectedGeneration) && selectedGeneration.status !== 'failed' && selectedGeneration.module !== 'code' && selectedGeneration.module !== 'writing' && (
                    <div className="preview-empty">
                      <div className="preview-empty-icon">
                        {selectedGeneration.module === 'voice' ? '🗣️' : selectedGeneration.module === 'music' ? '🎵' : '🎨'}
                      </div>
                      <div className="preview-empty-title">Generation complete</div>
                      <div className="preview-empty-desc">{selectedGeneration.prompt}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="preview-placeholder">
                  <div className="preview-placeholder-icon">
                    {moduleInfo.icon}
                  </div>
                  <div className="preview-placeholder-title">Ready to create</div>
                  <div className="preview-placeholder-desc">
                    Enter a prompt to generate your first {moduleInfo.label.toLowerCase()}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Adjustment Panel */}
        <AdjustmentPanel
          userTier={userTier}
          onGateFeature={(feature) => {
            setUpgradeFeature(feature);
            setShowUpgradeModal(true);
          }}
        />
      </div>

      {/* Reference Image (for image module) */}
      {activeModule === 'image' && (
        <div className="dashboard-reference-row">
          {referenceImage ? (
            <div className="dashboard-reference-preview">
              <img src={convertFileSrc(referenceImage)} alt="Reference" className="dashboard-reference-img" />
              <button className="dashboard-reference-remove" onClick={() => setReferenceImage(null)}>✕</button>
              <span className="dashboard-reference-label">Reference</span>
            </div>
          ) : (
            <button className="dashboard-reference-btn" onClick={handleReferenceUpload}>
              📎 Add Reference Image
            </button>
          )}
        </div>
      )}

      {/* Reference Audio (for music module) */}
      {activeModule === 'music' && (
        <div className="dashboard-reference-row">
          {referenceAudio ? (
            <div className="dashboard-reference-preview">
              <div className="dashboard-reference-audio-info">
                <span className="dashboard-reference-audio-icon">🎵</span>
                <span className="dashboard-reference-audio-name">
                  {referenceAudio.split('/').pop() || referenceAudio.split('\\').pop() || 'Reference Track'}
                </span>
              </div>
              <button className="dashboard-reference-remove" onClick={() => setReferenceAudio(null)}>✕</button>
              <span className="dashboard-reference-label">Cover Reference</span>
            </div>
          ) : (
            <button className="dashboard-reference-btn" onClick={handleReferenceAudioUpload}>
              🎵 Add Reference Track (Cover Mode)
            </button>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {selectedGeneration && !isGenerating && (
        <div className="dashboard-actions">
          <button className="dashboard-action-btn" onClick={() => remix(selectedGeneration)}>
            🔄 Remix
          </button>
          <button className="dashboard-action-btn dashboard-action-btn-export" onClick={async () => {
            try {
              const path = await invoke<string>('studio_export_generations_zip', { generationIds: [selectedGeneration.id] });
              console.log('Exported to:', path);
            } catch (e) {
              console.error('Export failed:', e);
            }
          }}>
            📤 Export
          </button>
        </div>
      )}

      {/* History Strip */}
      <HistoryStrip />

      {/* Prompt Bar */}
      <div className="dashboard-prompt-bar">
        <div className="dashboard-prompt-header-left">
          <span className="dashboard-prompt-icon">{moduleInfo.icon}</span>
          <span className="dashboard-prompt-label">{moduleInfo.label}</span>
          {dailyLimit > 0 && (
            <span style={{
              fontSize: 11,
              color: dailyCount >= dailyLimit ? '#ef4444' : 'var(--text-muted, #888)',
              marginLeft: 8,
              fontWeight: dailyCount >= dailyLimit ? 600 : 400,
            }}>
              {dailyCount}/{dailyLimit} today
            </span>
          )}
        </div>
        <div className="dashboard-prompt-input-wrapper">
          <textarea
            className="dashboard-prompt-textarea"
            placeholder={dailyCount >= dailyLimit && dailyLimit > 0
              ? `Daily limit reached — upgrade for more ${moduleInfo.label.toLowerCase()}`
              : `Describe your ${moduleInfo.label.toLowerCase()}...`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={1}
            disabled={isGenerating || (dailyCount >= dailyLimit && dailyLimit > 0)}
          />
        </div>
        <div className="dashboard-prompt-right">
          <span className="dashboard-prompt-hint">⌘ + Enter</span>
          <button
            className="dashboard-generate-btn"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim() || (dailyCount >= dailyLimit && dailyLimit > 0)}
          >
            {isGenerating ? 'Generating…' : dailyCount >= dailyLimit && dailyLimit > 0 ? 'Limit Reached' : 'Generate'}
          </button>
          <button
            className="dashboard-generate-btn dashboard-generate-batch"
            onClick={generateBatch}
            disabled={isGenerating || !prompt.trim() || (dailyCount >= dailyLimit && dailyLimit > 0)}
            title="Generate 4 variations"
          >
            4
          </button>
        </div>
      </div>

      {/* Upgrade Modal */}
      <StudioUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature={upgradeFeature}
      />
    </div>
  );
}
