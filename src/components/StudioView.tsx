import { useStudio } from '../hooks/useStudio';
import { STUDIO_MODULES } from '../types';
import StudioTabs from './StudioTabs';
import StudioPromptBar from './StudioPromptBar';
import StudioOutput from './StudioOutput';
import StudioHistory from './StudioHistory';
import { convertFileSrc } from '@tauri-apps/api/core';
import '../styles-studio.css';

function getDisplayUrl(gen: { output_url: string | null; output_path: string | null }): string | null {
  // Prefer remote URL (images from Replicate)
  if (gen.output_url?.startsWith('http')) return gen.output_url;
  // For local files (voice), use Tauri's asset protocol
  if (gen.output_path) return convertFileSrc(gen.output_path);
  // Fallback file:// URL
  if (gen.output_url?.startsWith('file://')) return gen.output_url.replace('file://', '');
  return null;
}

export default function StudioView() {
  const {
    activeModule, setActiveModule,
    prompt, setPrompt,
    isGenerating,
    generations,
    selectedGeneration,
    generate,
    saveToVault,
    remix,
    selectGeneration,
  } = useStudio();

  return (
    <div className="studio-container">
      {/* Header */}
      <div className="studio-header">
        <h2 className="studio-title">✨ Studio</h2>
        <p className="studio-subtitle">Describe it. Generate it. Ship it.</p>
      </div>

      {/* Tab Navigation */}
      <div className="studio-tabs">
        {Object.entries(STUDIO_MODULES).map(([id, mod]) => (
          <button
            key={id}
            className={`studio-tab ${activeModule === id ? 'active' : ''}`}
            onClick={() => setActiveModule(id as any)}
          >
            <span className="studio-tab-icon">{mod.icon}</span>
            <span className="studio-tab-label">{mod.label}</span>
          </button>
        ))}
      </div>

      {/* Output Area */}
      <div className="studio-output">
        <div className="studio-output-preview">
          {isGenerating ? (
            <div className="studio-output-shimmer">
              <div className="studio-output-shimmer-bar" />
              <div className="studio-output-shimmer-text">Generating...</div>
            </div>
          ) : selectedGeneration ? (
            <div className="studio-output-content">
              {selectedGeneration.module === 'image' && getDisplayUrl(selectedGeneration) && (
                <img src={getDisplayUrl(selectedGeneration)!} alt="Generated" className="studio-output-preview-img" />
              )}
              {selectedGeneration.module === 'voice' && getDisplayUrl(selectedGeneration) && (
                <div className="studio-output-preview-audio">
                  <div className="studio-output-waveform">
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className="studio-output-waveform-bar"
                        style={{ animationDelay: `${i * 0.1}s` }}
                      />
                    ))}
                  </div>
                  <audio controls src={getDisplayUrl(selectedGeneration)!} className="studio-output-audio-player" />
                </div>
              )}
            </div>
          ) : (
            <div className="studio-output-empty">
              <div className="studio-output-empty-icon">🎨</div>
              <div className="studio-output-empty-title">Ready to create</div>
              <div className="studio-output-empty-desc">Enter a prompt above to generate your first creation</div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="studio-output-actions">
        {selectedGeneration && (
          <>
            <button className="studio-output-btn studio-output-btn-save" onClick={() => selectedGeneration && saveToVault(selectedGeneration)}>
              💾 Save to Vault
            </button>
            <button className="studio-output-btn" onClick={() => selectedGeneration && remix(selectedGeneration)}>
              🔄 Remix
            </button>
          </>
        )}
      </div>

      {/* Generation History */}
      <div className="studio-history">
        <div className="studio-history-title">History</div>
        <div className="studio-history-scroll">
          {generations.map(gen => (
            <div
              key={gen.id}
              className={`studio-history-thumb ${selectedGeneration?.id === gen.id ? 'active' : ''}`}
              onClick={() => selectGeneration(gen)}
            >
              <span className="studio-history-thumb-placeholder">🎨</span>
              <span className="studio-history-module-badge">{gen.module}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
