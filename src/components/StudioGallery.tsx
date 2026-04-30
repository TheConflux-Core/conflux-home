import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useStudio } from '../hooks/useStudio';
import { STUDIO_MODULES, StudioModule } from '../types';
import '../styles-studio.css';

type FilterModule = StudioModule | 'all';
type FilterVault = 'all' | 'vaulted' | 'unvaulted';

export default function StudioGallery() {
  const { generations, selectedGeneration, selectGeneration, setEnterGallery } = useStudio();

  // Filters
  const [moduleFilter, setModuleFilter] = useState<FilterModule>('all');
  const [vaultFilter, setVaultFilter] = useState<FilterVault>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    return generations.filter((gen) => {
      // Module filter
      if (moduleFilter !== 'all' && gen.module !== moduleFilter) return false;
      // Vault filter
      if (vaultFilter === 'vaulted' && !gen.vault_file_id) return false;
      if (vaultFilter === 'unvaulted' && gen.vault_file_id) return false;
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!gen.prompt.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [generations, moduleFilter, vaultFilter, searchQuery]);

  const handleGenerationClick = (gen: typeof generations[0]) => {
    selectGeneration(gen);
    // Stay in gallery mode — when a generation is selected, we could show the project panel
    // For now, just select. We'll open a separate overlay? According to flow: clicking opens Project view.
    // We'll replace the whole gallery with Project component in render below.
    // Actually easier: we handle via conditional render: if selectedGeneration, show Project (via separate component)
    // But to avoid circular deps, we can navigate back to Dashboard to show Project? Simpler:
    // Closing gallery to reveal Dashboard will show selectedGeneration in preview
    setEnterGallery(false);
  };

  return (
    <div className="studio-gallery-container">
      {/* Header with filters */}
      <div className="gallery-header">
        <div className="gallery-title-row">
          <button className="gallery-back-btn" onClick={() => setEnterGallery(false)}>
            ← Back
          </button>
          <h2 className="gallery-title">📂 Gallery</h2>
          <span className="gallery-count">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="gallery-filters">
          {/* Module quick filters */}
          <div className="filter-group">
            <button
              className={`filter-chip ${moduleFilter === 'all' ? 'active' : ''}`}
              onClick={() => setModuleFilter('all')}
            >
              All
            </button>
            {(Object.keys(STUDIO_MODULES) as StudioModule[]).map((mod) => (
              <button
                key={mod}
                className={`filter-chip ${moduleFilter === mod ? 'active' : ''}`}
                onClick={() => setModuleFilter(mod)}
                title={STUDIO_MODULES[mod].description}
              >
                {STUDIO_MODULES[mod].icon}
              </button>
            ))}
          </div>

          {/* Vault filter */}
          <div className="filter-group">
            <button
              className={`filter-chip ${vaultFilter === 'all' ? 'active' : ''}`}
              onClick={() => setVaultFilter('all')}
            >
              All Status
            </button>
            <button
              className={`filter-chip ${vaultFilter === 'vaulted' ? 'active' : ''}`}
              onClick={() => setVaultFilter('vaulted')}
            >
              ✅ Vaulted
            </button>
            <button
              className={`filter-chip ${vaultFilter === 'unvaulted' ? 'active' : ''}`}
              onClick={() => setVaultFilter('unvaulted')}
            >
              📁 Unvaulted
            </button>
          </div>

          {/* Search */}
          <div className="filter-search">
            <input
              type="text"
              placeholder="Search prompt…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="gallery-grid">
        <AnimatePresence>
          {filtered.map((gen, idx) => {
            const displayUrl = gen.output_url?.startsWith('http')
              ? gen.output_url
              : gen.output_path
              ? convertFileSrc(gen.output_path)
              : null;
            return (
              <motion.div
                key={gen.id}
                className="gallery-item"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, delay: (idx % 12) * 0.03 }}
                onClick={() => handleGenerationClick(gen)}
                layout
              >
                <div className="gallery-item-thumb">
                  {displayUrl ? (
                    gen.module === 'image' ? (
                      <img src={displayUrl} alt="" className="gallery-thumb-img" loading="lazy" />
                    ) : gen.module === 'voice' ? (
                      <div className="gallery-thumb-voice">🗣️</div>
                    ) : (
                      <div className="gallery-thumb-mock">
                        {STUDIO_MODULES[gen.module]?.icon}
                      </div>
                    )
                  ) : (
                    <div className="gallery-thumb-placeholder">
                      {STUDIO_MODULES[gen.module]?.icon}
                    </div>
                  )}
                  {gen.vault_file_id && (
                    <div className="gallery-vault-badge">🔒</div>
                  )}
                  {gen.status === 'generating' && (
                    <div className="gallery-generating-overlay">Generating…</div>
                  )}
                </div>
                <div className="gallery-item-info">
                  <div className="gallery-item-module">{STUDIO_MODULES[gen.module]?.icon}</div>
                  <div className="gallery-item-prompt" title={gen.prompt}>
                    {gen.prompt.length > 60 ? gen.prompt.slice(0, 60) + '…' : gen.prompt}
                  </div>
                  <div className="gallery-item-date">
                    {new Date(gen.created_at).toLocaleDateString()}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="gallery-empty">
            <div className="empty-icon">🎨</div>
            <div className="empty-text">No generations match your filters</div>
            <button className="empty-cta" onClick={() => setEnterGallery(false)}>
              Go create something
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

