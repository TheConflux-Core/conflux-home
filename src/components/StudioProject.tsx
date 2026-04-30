import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { convertFileSrc } from '@tauri-apps/api/core';
import { invoke } from '@tauri-apps/api/core';
import { useStudio } from '../hooks/useStudio';
import { STUDIO_MODULES, StudioModule } from '../types';
import '../styles-studio.css';

export default function StudioProject() {
  const {
    generations,
    selectedGeneration,
    selectGeneration,
    setEnterGallery,
    saveToVault,
    remix,
    deleteGeneration,
    loadHistory,
    currentProject,
  } = useStudio();

  // Filter generations for this project (future: when DB has project_id, use that)
  const projectGenerations = generations; // TODO: filter by project_id when available

  const handleBranch = async () => {
    if (!selectedGeneration) return;
    remix(selectedGeneration);
    setEnterGallery(false); // return to dashboard to edit remix
  };

  const handleExport = async () => {
    if (!selectedGeneration?.output_url) return;
    // TODO: download file via Tauri: invoke('download_file', { url: ... })
    console.log('Export not yet implemented');
  };

  if (!setEnterGallery) {
    // Standalone mode not supported — render nothing
    return null;
  }

  return (
    <div className="studio-project-container">
      {/* Header */}
      <div className="project-header">
        <button className="project-back-btn" onClick={() => selectGeneration(null)}>
          ← Back to Gallery
        </button>
        <div className="project-title">
          <span className="project-name">
            {currentProject ? 'Default' : 'My Project'}
          </span>
          <span className="project-count">
            {projectGenerations.length} item{projectGenerations.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="project-actions">
          {/* Future: project rename, delete, export all */}
        </div>
      </div>

      {/* Main layout: left list, center preview, right details */}
      <div className="project-main">
        {/* Left: Version list */}
        <div className="project-versions-panel">
          <div className="panel-header">
            <span className="panel-title">Versions</span>
          </div>
          <div className="versions-list">
            <AnimatePresence>
              {projectGenerations.map((gen) => {
                const isSelected = selectedGeneration?.id === gen.id;
                const displayUrl = gen.output_url?.startsWith('http')
                  ? gen.output_url
                  : gen.output_path
                  ? convertFileSrc(gen.output_path)
                  : null;
                return (
                  <motion.div
                    key={gen.id}
                    className={`version-item ${isSelected ? 'selected' : ''} ${gen.status}`}
                    onClick={() => selectGeneration(gen)}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="version-thumb">
                      {displayUrl ? (
                        gen.module === 'image' ? (
                          <img src={displayUrl} alt="" className="version-thumb-img" />
                        ) : gen.module === 'voice' ? (
                          <div className="version-thumb-voice">🗣️</div>
                        ) : (
                          <div className="version-thumb-mock">
                            {STUDIO_MODULES[gen.module]?.icon}
                          </div>
                        )
                      ) : (
                        <div className="version-thumb-mock">
                          {STUDIO_MODULES[gen.module]?.icon}
                        </div>
                      )}
                      {gen.status === 'pending' && <div className="version-status-pill">Pending</div>}
                      {gen.status === 'generating' && <div className="version-status-pill generating">Generating…</div>}
                    </div>
                    <div className="version-meta">
                      <div className="version-module">{STUDIO_MODULES[gen.module]?.icon}</div>
                      <div className="version-prompt" title={gen.prompt}>
                        {gen.prompt.length > 40 ? gen.prompt.slice(0, 40) + '…' : gen.prompt}
                      </div>
                      <div className="version-time">
                        {new Date(gen.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {projectGenerations.length === 0 && (
              <div className="versions-empty">
                <div className="empty-icon">📁</div>
                <div className="empty-text">No generations yet</div>
                <div className="empty-hint">Switch back to the dashboard to create</div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Preview canvas */}
        <div className="project-preview-area">
          {selectedGeneration ? (
            <div className="project-preview-content">
              {selectedGeneration.module === 'image' &&
                selectedGeneration.output_url && (
                  <motion.img
                    src={
                      selectedGeneration.output_url.startsWith('http')
                        ? selectedGeneration.output_url
                        : selectedGeneration.output_path
                        ? convertFileSrc(selectedGeneration.output_path)
                        : ''
                    }
                    alt={selectedGeneration.prompt}
                    className="project-preview-image"
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              {selectedGeneration.module === 'voice' &&
                selectedGeneration.output_url && (
                  <div className="project-preview-voice">
                    <div className="project-waveform">
                      {[...Array(24)].map((_, i) => (
                        <div
                          key={i}
                          className="project-waveform-bar"
                          style={{ animationDelay: `${i * 0.08}s` }}
                        />
                      ))}
                    </div>
                    <audio
                      controls
                      src={
                        selectedGeneration.output_url?.startsWith('http')
                          ? selectedGeneration.output_url
                          : selectedGeneration.output_path
                          ? convertFileSrc(selectedGeneration.output_path)
                          : ''
                      }
                      className="project-audio"
                    />
                  </div>
                )}
              {!selectedGeneration.output_url && !selectedGeneration.output_path && (
                <div className="project-preview-empty">
                  <div className="empty-icon">{STUDIO_MODULES[selectedGeneration.module]?.icon}</div>
                  <div className="empty-title">Generation is processing</div>
                  <div className="empty-desc">{selectedGeneration.prompt}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="project-preview-placeholder">
              <div className="placeholder-icon">🖼️</div>
              <div className="placeholder-title">Select a version</div>
              <div className="placeholder-desc">
                Choose a generation from the list to preview
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions panel */}
        <div className="project-actions-panel">
          <div className="panel-header">
            <span className="panel-title">Actions</span>
          </div>
          {selectedGeneration ? (
            <div className="actions-list">
              <button
                className="project-action-btn save"
                onClick={() => saveToVault(selectedGeneration)}
              >
                💾 Save to Vault
              </button>
              <button
                className="project-action-btn remix"
                onClick={() => {
                  remix(selectedGeneration);
                  setEnterGallery(false); // return to dashboard to remix
                }}
              >
                🔄 Remix
              </button>
              <button
                className="project-action-btn branch"
                onClick={handleBranch}
              >
                🌿 Branch (New Variant)
              </button>
              <button
                className="project-action-btn export"
                onClick={handleExport}
              >
                📤 Export
              </button>
              <button
                className="project-action-btn delete"
                onClick={async () => {
                  if (confirm('Delete this generation?')) {
                    await deleteGeneration(selectedGeneration.id);
                    selectGeneration(null);
                  }
                }}
              >
                🗑️ Delete
              </button>

              {/* Remix lineage */}
              {selectedGeneration.remix_of && (
                <div className="remix-lineage">
                  <span className="lineage-label">Remix of:</span>
                  <span className="lineage-id">{selectedGeneration.remix_of}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="actions-empty">
              <div className="empty-hint">Select a generation to enable actions</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

