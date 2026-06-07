import { useState, useEffect, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { VaultFile, VaultProject, VaultTag, VaultStats, VaultViewMode } from '../types';
import VaultSidebar from './VaultSidebar';
import VaultFileCard from './VaultFileCard';
import VaultSearchBar from './VaultSearchBar';
import VaultToolbar from './VaultToolbar';
import InputModal from './InputModal';
import '../styles-vault.css';

export default function VaultView() {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [projects, setProjects] = useState<VaultProject[]>([]);
  const [tags, setTags] = useState<VaultTag[]>([]);
  const [stats, setStats] = useState<VaultStats | null>(null);
  const [viewMode, setViewMode] = useState<VaultViewMode>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<'recent' | 'favorites' | 'all' | 'projects' | string>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [renamingProject, setRenamingProject] = useState<VaultProject | null>(null);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [movingFileIds, setMovingFileIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'browse' | 'projects' | 'search' | 'stats'>('browse');
  const [contextMenu, setContextMenu] = useState<VaultFile | null>(null);
  const [drilledProject, setDrilledProject] = useState<VaultProject | null>(null);

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768;
  }, []);

  const loadFiles = useCallback(async (section?: string, query?: string) => {
    const s = section ?? activeSection;
    const q = query ?? searchQuery;
    setLoading(true);
    try {
      if (q) {
        const result = await invoke<VaultFile[]>('vault_search_files', { query: q });
        setFiles(result);
      } else if (s === 'favorites') {
        const result = await invoke<VaultFile[]>('vault_get_favorites');
        setFiles(result);
      } else if (s.startsWith('project:')) {
        const projectId = s.slice('project:'.length);
        const detail = await invoke<{ project: VaultProject; files: VaultFile[] } | null>('vault_get_project_detail', { projectId });
        setFiles(detail?.files ?? []);
      } else if (s.startsWith('tag:')) {
        // Tags not on VaultFile type yet — load all files as fallback
        const result = await invoke<VaultFile[]>('vault_get_files', { limit: 500, offset: 0 });
        setFiles(result);
      } else {
        // Fetch all files, then filter client-side
        const all = await invoke<VaultFile[]>('vault_get_files', { limit: 500, offset: 0 });
        if (s === 'recent') {
          setFiles(all.slice(0, 50));
        } else if (s === 'all') {
          setFiles(all);
        } else {
          // file type filter (image, audio, video, code, document)
          setFiles(all.filter(f => f.file_type === s));
        }
      }
    } catch (e) {
      console.error('[Vault] Failed to load files:', e);
      setFiles([]);
    }
    setLoading(false);
  }, [activeSection, searchQuery]);

  const loadProjects = useCallback(async () => {
    try {
      const result = await invoke<VaultProject[]>('vault_get_projects');
      setProjects(result);
    } catch (e) { console.error('Failed to load projects:', e); }
  }, []);

  const loadTags = useCallback(async () => {
    try {
      const result = await invoke<VaultTag[]>('vault_get_tags');
      setTags(result);
    } catch (e) { console.error('Failed to load tags:', e); }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const result = await invoke<[number, number, number]>('vault_get_stats');
      setStats({ total_files: result[0], total_size: result[1], total_projects: result[2] });
    } catch (e) { console.error('Failed to load stats:', e); }
  }, []);

  useEffect(() => { loadFiles(); }, [loadFiles]);
  useEffect(() => { loadProjects(); loadTags(); loadStats(); }, []);



  // Auto-scan on mount so Studio generations appear in Vault
  useEffect(() => {
    (async () => {
      // Migrate old-style filenames to cfx_ convention (one-time, idempotent)
      try {
        const migration = await invoke<{ renamed: number; skipped: number }>('vault_migrate_filenames');
        console.log('[Vault] Migration result:', migration);
      } catch (e) {
        console.warn('[Vault] Filename migration skipped:', e);
      }

      // Get platform-specific vault directories from backend
      let dirs: string[];
      try {
        dirs = await invoke<string[]>('get_vault_directories');
      } catch (e) {
        console.warn('[Vault] get_vault_directories failed, using fallback:', e);
        dirs = [];
      }

      for (const dir of dirs) {
        try {
          console.log('[Vault] Scanning:', dir);
          await invoke('vault_scan_directory', { dir_path: dir });
        } catch (e) {
          console.warn('[Vault] Scan failed for', dir, ':', e);
        }
      }
      // Reload everything after scan
      await loadFiles();
      await loadStats();
      await loadProjects();
      await loadTags();
      console.log('[Vault] Auto-scan complete');
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleToggleFavorite = async (id: string) => {
    await invoke('vault_toggle_favorite', { id });
    loadFiles();
  };

  const handleDelete = async (id: string) => {
    await invoke('vault_delete_file', { id });
    await loadFiles();
    await loadStats();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} file(s)?`)) return;
    for (const id of selectedIds) {
      try { await invoke('vault_delete_file', { id }); } catch (e) { console.error('Delete failed:', e); }
    }
    setSelectedIds(new Set());
    await loadFiles();
    await loadStats();
  };

  const handleBulkMoveToProject = () => {
    if (selectedIds.size === 0) return;
    setMovingFileIds(Array.from(selectedIds));
    setShowProjectPicker(true);
  };

  const handleProjectPick = async (projectId: string) => {
    setShowProjectPicker(false);
    for (const fileId of movingFileIds) {
      try {
        await invoke('vault_add_file_to_project', { projectId, fileId });
      } catch (e) {
        console.error('Move to project failed:', e);
      }
    }
    setMovingFileIds([]);
    setSelectedIds(new Set());
    await loadFiles();
    await loadProjects();
  };

  const handleSelectAll = () => {
    const allIds = new Set(files.map(f => f.id));
    setSelectedIds(allIds);
  };

  const handleCreateProject = async () => {
    setShowNewProjectModal(true);
  };

  const handleCreateProjectConfirm = async (name: string) => {
    setShowNewProjectModal(false);
    await invoke('vault_create_project', { name, description: null, project_type: null });
    loadProjects();
  };

  const handleEditProject = async (id: string, name: string, description: string | null) => {
    await invoke('vault_edit_project', { id, name, description });
    loadProjects();
  };

  const handleRenameProject = (project: VaultProject) => {
    setRenamingProject(project);
  };

  const handleRenameConfirm = async (newName: string) => {
    if (renamingProject) {
      await handleEditProject(renamingProject.id, newName, renamingProject.description ?? null);
    }
    setRenamingProject(null);
  };

  const handleDeleteProject = async (id: string) => {
    await invoke('vault_delete_project', { id });
    if (activeSection === `project:${id}`) {
      setActiveSection('recent');
    }
    loadProjects();
  };

  const handleScan = async () => {
    // Get platform-specific vault directories from backend
    let dirs: string[];
    try {
      dirs = await invoke<string[]>('get_vault_directories');
    } catch (e) {
      dirs = [];
    }
    for (const dir of dirs) {
      try {
        await invoke('vault_scan_directory', { dir_path: dir });
      } catch (e) {
        // Directory may not exist — that's OK
      }
    }
    await loadFiles();
    await loadStats();
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(1)} GB`;
  };

  const FILTER_CHIPS = [
    { key: 'recent', icon: '🕐', label: 'Recent' },
    { key: 'favorites', icon: '⭐', label: 'Favorites' },
    { key: 'all', icon: '📁', label: 'All' },
    { key: 'image', icon: '🖼️', label: 'Images' },
    { key: 'audio', icon: '🎵', label: 'Audio' },
    { key: 'video', icon: '🎬', label: 'Video' },
    { key: 'code', icon: '💻', label: 'Code' },
    { key: 'document', icon: '📄', label: 'Docs' },
  ];

  const TABS = [
    { key: 'browse', icon: '📁', label: 'Browse' },
    { key: 'projects', icon: '📂', label: 'Projects' },
    { key: 'search', icon: '🔍', label: 'Search' },
    { key: 'stats', icon: '📊', label: 'Stats' },
  ];

  if (isMobile) {
    return (
      <div className="vault-container">
        {/* ── Title Bar ── */}
        <div className="vault-title-bar">
          <div className="vault-title-bar-left">
            {drilledProject && (
              <button className="vault-title-bar-back" onClick={() => { setDrilledProject(null); setActiveSection('recent'); loadFiles('recent'); }}>←</button>
            )}
            <span className="vault-title-bar-icon">🛡️</span>
            <span className="vault-title-bar-text">{drilledProject ? drilledProject.name : 'Vault'}</span>
          </div>
          <button className="vault-studio-btn" onClick={() => window.dispatchEvent(new CustomEvent('conflux:navigate', { detail: { viewId: 'studio' } }))}>✨ Studio</button>
        </div>

        {/* ── Browse Tab ── */}
        {activeTab === 'browse' && (
          <>
            {!drilledProject && (
              <div className="vault-filter-bar">
                {FILTER_CHIPS.map(f => (
                  <button key={f.key} className={`vault-filter-chip ${activeSection === f.key ? 'active' : ''}`} onClick={() => { setActiveSection(f.key); loadFiles(f.key); }}>
                    <span className="vault-filter-chip-icon">{f.icon}</span> {f.label}
                  </button>
                ))}
              </div>
            )}
            <div className="vault-content-wrapper">
              <VaultToolbar viewMode={viewMode} onViewModeChange={setViewMode} isMobile={true} />
              {selectedIds.size > 0 && (
                <div className="vault-selection-bar">
                  <span className="vault-selection-count">{selectedIds.size} selected</span>
                  <button className="vault-selection-btn move" onClick={handleBulkMoveToProject}>📂 Move</button>
                  <button className="vault-selection-btn delete" onClick={handleBulkDelete}>🗑️ Delete</button>
                  <button className="vault-selection-btn cancel" onClick={() => setSelectedIds(new Set())}>✕</button>
                </div>
              )}
              <div className="vault-content-area">
                {loading ? (
                  <div className="vault-empty"><span className="vault-empty-title">Loading...</span></div>
                ) : files.length === 0 ? (
                  <div className="vault-empty">
                    <span className="vault-empty-title">{searchQuery ? 'No results' : 'No files yet'}</span>
                    <span className="vault-empty-desc">{searchQuery ? `No files match "${searchQuery}"` : 'Files appear here as your agents create them.'}</span>
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="vault-grid">
                    {files.map(file => (
                      <VaultFileCard key={file.id} file={file} selected={selectedIds.has(file.id)} onSelect={() => toggleSelect(file.id)} onToggleFavorite={() => handleToggleFavorite(file.id)} onDelete={() => handleDelete(file.id)} onOpen={() => invoke('vault_open_file', { path: file.path })} onDownload={() => invoke('vault_download_file', { path: file.path, filename: file.name })} onContextMenu={() => setContextMenu(file)} />
                    ))}
                  </div>
                ) : viewMode === 'list' ? (
                  <div className="vault-list-view">
                    <div className="vault-list-header">
                      <div></div><div>Name</div><div>Type</div><div>Size</div><div>Modified</div><div>Agent</div><div></div>
                    </div>
                    {files.map(file => (
                      <div key={file.id} className="vault-list-row" onClick={() => toggleSelect(file.id)} onDoubleClick={() => invoke('vault_open_file', { path: file.path })}>
                        <div className="vault-list-icon">{getFileEmoji(file.file_type)}</div>
                        <div className="vault-list-name">{file.name}</div>
                        <div className="vault-list-cell">{file.extension || file.file_type}</div>
                        <div className="vault-list-cell">{formatSize(file.size_bytes)}</div>
                        <div className="vault-list-cell">{formatDate(file.updated_at)}</div>
                        <div className="vault-list-cell">{file.created_by ? '🤖' : '—'}</div>
                        <div>{file.is_favorite ? '⭐' : ''}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="vault-timeline">
                    {groupByDate(files).map(([date, dateFiles]) => (
                      <div key={date}>
                        <div className="vault-timeline-date">{date}</div>
                        <div className="vault-timeline-files">
                          {dateFiles.map(file => (
                            <VaultFileCard key={file.id} file={file} selected={selectedIds.has(file.id)} onSelect={() => toggleSelect(file.id)} onToggleFavorite={() => handleToggleFavorite(file.id)} onDelete={() => handleDelete(file.id)} onOpen={() => invoke('vault_open_file', { path: file.path })} onDownload={() => invoke('vault_download_file', { path: file.path, filename: file.name })} onContextMenu={() => setContextMenu(file)} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Projects Tab ── */}
        {activeTab === 'projects' && (
          <div className="vault-content-wrapper">
            <div style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#e2e0ea', fontSize: '16px' }}>Projects</h3>
              <button className="vault-btn-primary" onClick={handleCreateProject} style={{ fontSize: '12px', padding: '8px 14px' }}>+ New</button>
            </div>
            <div className="vault-projects-grid-mobile" style={{ padding: '0 12px 12px' }}>
              {projects.length === 0 ? (
                <div className="vault-empty">
                  <span className="vault-empty-title">No projects</span>
                  <span className="vault-empty-desc">Create a project to organize your files.</span>
                </div>
              ) : projects.map(p => (
                <div key={p.id} className="vault-project-card-mobile" onClick={() => { setDrilledProject(p); setActiveSection(`project:${p.id}`); loadFiles(`project:${p.id}`); }}>
                  <span style={{ fontSize: '24px' }}>📂</span>
                  <span className="vault-project-card-name">{p.name}</span>
                  <span className="vault-project-card-meta">{p.file_count} files</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Search Tab ── */}
        {activeTab === 'search' && (
          <div className="vault-search-screen">
            <input className="vault-search-screen-input" autoFocus placeholder="Search files..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); if (e.target.value) loadFiles(undefined, e.target.value); }} />
            <div className="vault-search-results">
              {searchQuery && files.length === 0 && (
                <div className="vault-empty"><span className="vault-empty-title">No results</span></div>
              )}
              {searchQuery && files.length > 0 && (
                <div className="vault-grid">
                  {files.map(file => (
                    <VaultFileCard key={file.id} file={file} selected={selectedIds.has(file.id)} onSelect={() => toggleSelect(file.id)} onToggleFavorite={() => handleToggleFavorite(file.id)} onDelete={() => handleDelete(file.id)} onOpen={() => invoke('vault_open_file', { path: file.path })} onDownload={() => invoke('vault_download_file', { path: file.path, filename: file.name })} onContextMenu={() => setContextMenu(file)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Stats Tab ── */}
        {activeTab === 'stats' && (
          <div className="vault-stats-screen">
            {stats && (
              <>
                <div className="vault-stats-screen-card">
                  <span style={{ fontSize: '32px' }}>📁</span>
                  <span className="vault-stats-screen-value">{stats.total_files}</span>
                  <span className="vault-stats-screen-label">Files</span>
                </div>
                <div className="vault-stats-screen-card">
                  <span style={{ fontSize: '32px' }}>💾</span>
                  <span className="vault-stats-screen-value">{formatSize(stats.total_size)}</span>
                  <span className="vault-stats-screen-label">Storage</span>
                </div>
                <div className="vault-stats-screen-card">
                  <span style={{ fontSize: '32px' }}>📂</span>
                  <span className="vault-stats-screen-value">{stats.total_projects}</span>
                  <span className="vault-stats-screen-label">Projects</span>
                </div>
                <button className="vault-btn-primary" onClick={handleScan} style={{ marginTop: '16px', width: '100%' }}>🔄 Scan Files</button>
              </>
            )}
          </div>
        )}

        {/* ── Bottom Tab Bar ── */}
        <nav className="vault-bottom-tabs">
          {TABS.map(t => (
            <button key={t.key} className={`vault-tab-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => { setActiveTab(t.key as any); if (t.key !== 'browse') setDrilledProject(null); }}>
              <span className="vault-tab-icon">{t.icon}</span>
              <span className="vault-tab-label">{t.label}</span>
            </button>
          ))}
        </nav>

        {/* ── Context Menu ── */}
        {contextMenu && (
          <div className="vault-context-overlay" onClick={() => setContextMenu(null)}>
            <div className="vault-context-menu" onClick={e => e.stopPropagation()}>
              <div className="vault-context-header">
                <span className="vault-context-header-icon">{getFileEmoji(contextMenu.file_type)}</span>
                <div className="vault-context-header-info">
                  <span className="vault-context-header-name">{contextMenu.name}</span>
                  <span className="vault-context-header-meta">{formatSize(contextMenu.size_bytes)} · {contextMenu.file_type}</span>
                </div>
              </div>
              <div className="vault-context-actions">
                <button className="vault-context-action" onClick={() => { handleToggleFavorite(contextMenu.id); setContextMenu(null); }}>
                  <span className="vault-context-action-icon">{contextMenu.is_favorite ? '⭐' : '☆'}</span> {contextMenu.is_favorite ? 'Unfavorite' : 'Favorite'}
                </button>
                <button className="vault-context-action" onClick={() => { setMovingFileIds([contextMenu.id]); setShowProjectPicker(true); setContextMenu(null); }}>
                  <span className="vault-context-action-icon">📂</span> Move to Project
                </button>
                <button className="vault-context-action" onClick={() => { invoke('vault_download_file', { path: contextMenu.path, filename: contextMenu.name }); setContextMenu(null); }}>
                  <span className="vault-context-action-icon">⬇️</span> Download
                </button>
                <button className="vault-context-action" onClick={() => { invoke('vault_open_file', { path: contextMenu.path }); setContextMenu(null); }}>
                  <span className="vault-context-action-icon">🔗</span> Open
                </button>
                <button className="vault-context-action vault-context-action-delete" onClick={() => { handleDelete(contextMenu.id); setContextMenu(null); }}>
                  <span className="vault-context-action-icon">🗑️</span> Delete
                </button>
              </div>
              <button className="vault-context-cancel" onClick={() => setContextMenu(null)}>Cancel</button>
            </div>
          </div>
        )}

        {/* ── Project Picker Modal ── */}
        {showProjectPicker && (
          <div className="vault-modal-overlay" onClick={() => setShowProjectPicker(false)}>
            <div className="vault-modal" onClick={e => e.stopPropagation()}>
              <div className="vault-modal-header">
                <h3>Move to Project</h3>
                <button className="vault-modal-close" onClick={() => setShowProjectPicker(false)}>✕</button>
              </div>
              <div className="vault-modal-body">
                {projects.length === 0 ? (
                  <div className="vault-modal-empty">No projects yet. Create one first.</div>
                ) : (
                  <div className="vault-project-picker-list">
                    {projects.map(p => (
                      <button key={p.id} className="vault-project-picker-item" onClick={() => handleProjectPick(p.id)}>
                        <span className="vault-project-picker-icon">📂</span>
                        <span className="vault-project-picker-name">{p.name}</span>
                        <span className="vault-project-picker-count">{p.file_count} files</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <InputModal isOpen={showNewProjectModal} title="New Project" placeholder="Project name..." confirmLabel="Create" onConfirm={handleCreateProjectConfirm} onCancel={() => setShowNewProjectModal(false)} />
        <InputModal isOpen={!!renamingProject} title="Rename Project" placeholder="Project name..." defaultValue={renamingProject?.name || ''} confirmLabel="Rename" onConfirm={handleRenameConfirm} onCancel={() => setRenamingProject(null)} />
      </div>
    );
  }

  // ── Desktop layout (unchanged) ──
  return (
    <div className="vault-container">
      {/* Hero Header */}
      <div className="vault-hero">
        <div className="vault-hero-glow" />
        <div className="vault-hero-content">
          <div className="vault-hero-top-bar">
            <button
              className="vault-studio-btn"
              onClick={() => window.dispatchEvent(new CustomEvent('conflux:navigate', { detail: { viewId: 'studio' } }))}
              title="Open Studio"
            >
              ✨ Studio
            </button>
          </div>
          <div className="vault-hero-icon">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M32 4L8 14V28C8 42.36 18.24 55.64 32 60C45.76 55.64 56 42.36 56 28V14L32 4Z" fill="url(#shield_grad)" opacity="0.2"/>
              <path d="M32 4L8 14V28C8 42.36 18.24 55.64 32 60C45.76 55.64 56 42.36 56 28V14L32 4Z" stroke="url(#shield_grad)" strokeWidth="2" fill="none"/>
              <path d="M24 32L29 37L40 26" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="32" cy="28" r="6" fill="none" stroke="#8b5cf6" strokeWidth="1.5" opacity="0.5"/>
              <defs>
                <linearGradient id="shield_grad" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#8b5cf6"/>
                  <stop offset="1" stopColor="#3b82f6"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="vault-hero-title">Vault</h1>
          <p className="vault-hero-sub">Encrypted file storage & project folders</p>
        </div>
      </div>

      <div className="vault-body">
      <VaultSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        projects={projects}
        tags={tags}
        onCreateProject={handleCreateProject}
        onRenameProject={handleRenameProject}
        onDeleteProject={handleDeleteProject}
      />
      <div className="vault-main">
        <VaultSearchBar query={searchQuery} onQueryChange={setSearchQuery} />
        <VaultToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onCreateProject={handleCreateProject}
        />
        {/* Selection Action Bar */}
        {selectedIds.size > 0 && (
          <div className="vault-selection-bar">
            <span className="vault-selection-count">{selectedIds.size} selected</span>
            <button className="vault-selection-btn" onClick={handleSelectAll}>✅ Select All</button>
            <button className="vault-selection-btn move" onClick={handleBulkMoveToProject}>📂 Move to Project</button>
            <button className="vault-selection-btn delete" onClick={handleBulkDelete}>🗑️ Delete</button>
            <button className="vault-selection-btn cancel" onClick={() => setSelectedIds(new Set())}>✕ Cancel</button>
          </div>
        )}

        <div className="vault-content-area">
          {loading ? (
            <div className="vault-empty">
              <svg className="vault-empty-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M32 4L8 14V28C8 42.36 18.24 55.64 32 60C45.76 55.64 56 42.36 56 28V14L32 4Z" stroke="#8b5cf6" strokeWidth="2" fill="none" opacity="0.4"/>
                <path d="M24 32L29 37L40 26" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
              </svg>
              <div className="vault-empty-title">Loading...</div>
            </div>
          ) : files.length === 0 ? (
            <div className="vault-empty">
              <svg className="vault-empty-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M32 4L8 14V28C8 42.36 18.24 55.64 32 60C45.76 55.64 56 42.36 56 28V14L32 4Z" stroke="#8b5cf6" strokeWidth="2" fill="none"/>
                <circle cx="32" cy="28" r="8" stroke="#8b5cf6" strokeWidth="2" fill="none"/>
                <path d="M32 20V28" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <div className="vault-empty-title">
                {searchQuery ? 'No results found' : 'Vault is empty'}
              </div>
              <div className="vault-empty-desc">
                {searchQuery
                  ? `No files match "${searchQuery}"`
                  : 'Click "Scan" to index your vault directory, or files will appear here as your agents create them.'}
              </div>
              {!searchQuery && (
                <div className="vault-empty-desc">Files appear here as your agents create them.</div>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="vault-grid">
              {files.map(file => (
                <VaultFileCard
                  key={file.id}
                  file={file}
                  selected={selectedIds.has(file.id)}
                  onSelect={() => toggleSelect(file.id)}
                  onToggleFavorite={() => handleToggleFavorite(file.id)}
                  onDelete={() => handleDelete(file.id)}
                  onOpen={() => invoke('vault_open_file', { path: file.path })}
                  onDownload={() => invoke('vault_download_file', { path: file.path, filename: file.name })}
                />
              ))}
            </div>
          ) : viewMode === 'list' ? (
            <div className="vault-list-view">
              <div className="vault-list-header">
                <div></div>
                <div>Name</div>
                <div>Type</div>
                <div>Size</div>
                <div>Modified</div>
                <div>Agent</div>
                <div></div>
              </div>
              {files.map(file => (
                <div key={file.id} className="vault-list-row" onClick={() => toggleSelect(file.id)} onDoubleClick={() => invoke('vault_open_file', { path: file.path })}>
                  <div className="vault-list-icon">{getFileEmoji(file.file_type)}</div>
                  <div className="vault-list-name">{file.name}</div>
                  <div className="vault-list-cell">{file.extension || file.file_type}</div>
                  <div className="vault-list-cell">{formatSize(file.size_bytes)}</div>
                  <div className="vault-list-cell">{formatDate(file.updated_at)}</div>
                  <div className="vault-list-cell">{file.created_by ? '🤖' : '—'}</div>
                  <div>{file.is_favorite ? '⭐' : ''}</div>
                </div>
              ))}
            </div>
          ) : (
            // Timeline view
            <div className="vault-timeline">
              {groupByDate(files).map(([date, dateFiles]) => (
                <div key={date}>
                  <div className="vault-timeline-date">{date}</div>
                  <div className="vault-timeline-files">
                    {dateFiles.map(file => (
                      <VaultFileCard
                        key={file.id}
                        file={file}
                        selected={selectedIds.has(file.id)}
                        onSelect={() => toggleSelect(file.id)}
                        onToggleFavorite={() => handleToggleFavorite(file.id)}
                        onDelete={() => handleDelete(file.id)}
                        onOpen={() => invoke('vault_open_file', { path: file.path })}
                        onDownload={() => invoke('vault_download_file', { path: file.path, filename: file.name })}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {stats && (
          <div className="vault-stats-bar">
            <div className="vault-stat">
              <span>📁</span>
              <span className="vault-stat-value">{stats.total_files}</span> files
            </div>
            <div className="vault-stat">
              <span>💾</span>
              <span className="vault-stat-value">{formatSize(stats.total_size)}</span>
            </div>
            <div className="vault-stat">
              <span>📂</span>
              <span className="vault-stat-value">{stats.total_projects}</span> projects
            </div>
          </div>
        )}
      </div>
      </div> {/* vault-body */}

      {/* Project Picker Modal for Move-to-Project */}
      {showProjectPicker && (
        <div className="vault-modal-overlay" onClick={() => setShowProjectPicker(false)}>
          <div className="vault-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vault-modal-header">
              <h3>Move to Project</h3>
              <button className="vault-modal-close" onClick={() => setShowProjectPicker(false)}>✕</button>
            </div>
            <div className="vault-modal-body">
              {projects.length === 0 ? (
                <div className="vault-modal-empty">No projects yet. Create one first.</div>
              ) : (
                <div className="vault-project-picker-list">
                  {projects.map(p => (
                    <button
                      key={p.id}
                      className="vault-project-picker-item"
                      onClick={() => handleProjectPick(p.id)}
                    >
                      <span className="vault-project-picker-icon">📂</span>
                      <span className="vault-project-picker-name">{p.name}</span>
                      <span className="vault-project-picker-count">{p.file_count} files</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <InputModal
        isOpen={showNewProjectModal}
        title="New Project"
        placeholder="Project name..."
        confirmLabel="Create"
        onConfirm={handleCreateProjectConfirm}
        onCancel={() => setShowNewProjectModal(false)}
      />
      <InputModal
        isOpen={!!renamingProject}
        title="Rename Project"
        placeholder="Project name..."
        defaultValue={renamingProject?.name || ''}
        confirmLabel="Rename"
        onConfirm={handleRenameConfirm}
        onCancel={() => setRenamingProject(null)}
      />

    </div>
  );
}

function getFileEmoji(type: string): string {
  const map: Record<string, string> = {
    image: '🖼️', audio: '🎵', video: '🎬', code: '💻',
    document: '📄', archive: '📦', other: '📎',
  };
  return map[type] || '📎';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString();
}

function groupByDate(files: VaultFile[]): [string, VaultFile[]][] {
  const groups = new Map<string, VaultFile[]>();
  for (const f of files) {
    const date = new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date)!.push(f);
  }
  return Array.from(groups.entries());
}
