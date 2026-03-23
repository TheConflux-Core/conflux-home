// Conflux Home — Agent Template Browser
// Browse and install age-appropriate agent templates.

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { AgentTemplateDB, AgeGroup, FamilyMember } from '../types';
import { AGE_GROUP_CONFIG } from '../types';

interface AgentTemplateBrowserProps {
  member: FamilyMember | null;
  onClose: () => void;
  onInstalled: () => void;  // refresh agent list after install
}

const CATEGORY_CONFIG: Record<string, { label: string; emoji: string }> = {
  education:    { label: 'Education',    emoji: '📚' },
  productivity: { label: 'Productivity', emoji: '💼' },
  creative:     { label: 'Creative',     emoji: '🎨' },
  wellness:     { label: 'Wellness',     emoji: '🧘' },
  companion:    { label: 'Companion',    emoji: '🤝' },
  fun:          { label: 'Fun',          emoji: '🎮' },
};

export default function AgentTemplateBrowser({ member, onClose, onInstalled }: AgentTemplateBrowserProps) {
  const [templates, setTemplates] = useState<AgentTemplateDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());

  const ageGroup = member?.age_group;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await invoke<AgentTemplateDB[]>('agent_templates_list', {
          ageGroup: ageGroup ?? null,
        });
        setTemplates(data);
      } catch (e) {
        console.error('Failed to load templates:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [ageGroup]);

  const handleInstall = useCallback(async (templateId: string) => {
    setInstalling(templateId);
    try {
      await invoke('agent_template_install', {
        templateId,
        memberId: member?.id ?? null,
      });
      setInstalledIds(prev => new Set(prev).add(templateId));
      onInstalled();
    } catch (e) {
      console.error('Failed to install template:', e);
    } finally {
      setInstalling(null);
    }
  }, [member, onInstalled]);

  // Get unique categories from templates
  const categories = ['all', ...new Set(templates.map(t => t.category))];

  const filtered = filter === 'all'
    ? templates
    : templates.filter(t => t.category === filter);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content agent-browser" onClick={e => e.stopPropagation()}>
        <div className="browser-header">
          <div>
            <h2>🧩 Agent Library</h2>
            {member && (
              <p className="browser-subtitle">
                Showing agents for <strong>{member.name}</strong> ({AGE_GROUP_CONFIG[member.age_group].emoji} {AGE_GROUP_CONFIG[member.age_group].label})
              </p>
            )}
            {!member && (
              <p className="browser-subtitle">All available agent templates</p>
            )}
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Category Filter */}
        <div className="category-filter">
          {categories.map(cat => (
            <button
              key={cat}
              className={`genre-btn ${filter === cat ? 'active' : ''}`}
              onClick={() => setFilter(cat)}
            >
              {cat === 'all' ? 'All' : `${CATEGORY_CONFIG[cat]?.emoji ?? ''} ${CATEGORY_CONFIG[cat]?.label ?? cat}`}
            </button>
          ))}
        </div>

        {/* Template Grid */}
        {loading ? (
          <div className="browser-loading">Loading agents...</div>
        ) : filtered.length === 0 ? (
          <div className="browser-empty">
            <p>No agents found for this selection.</p>
          </div>
        ) : (
          <div className="template-grid">
            {filtered.map(tpl => {
              const isInstalled = installedIds.has(tpl.id);
              const isInstalling = installing === tpl.id;
              const ageConfig = AGE_GROUP_CONFIG[tpl.age_group as AgeGroup];
              return (
                <div key={tpl.id} className={`template-card ${isInstalled ? 'installed' : ''}`}>
                  <div className="template-header">
                    <span className="template-emoji">{tpl.emoji}</span>
                    <span className="template-age-badge" title={ageConfig?.label}>
                      {ageConfig?.emoji} {ageConfig?.ageRange}
                    </span>
                  </div>
                  <h3>{tpl.name}</h3>
                  <p className="template-desc">{tpl.description}</p>
                  <div className="template-meta">
                    <span className="template-category">
                      {CATEGORY_CONFIG[tpl.category]?.emoji} {CATEGORY_CONFIG[tpl.category]?.label ?? tpl.category}
                    </span>
                  </div>
                  <button
                    className={`btn-primary template-install-btn ${isInstalled ? 'installed' : ''}`}
                    onClick={() => handleInstall(tpl.id)}
                    disabled={isInstalling || isInstalled}
                  >
                    {isInstalled ? '✅ Installed' : isInstalling ? 'Installing...' : 'Install Agent'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
