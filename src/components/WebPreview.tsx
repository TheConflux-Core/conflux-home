import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import LivePreview from './LivePreview';
import SyntaxHighlight from './SyntaxHighlight';
import { StudioGeneration } from '../types';

interface WebPreviewProps {
  generation: StudioGeneration;
  onRemix?: (gen: StudioGeneration, prompt: string) => void;
  onSaveToVault?: (gen: StudioGeneration) => void;
  onExport?: (gen: StudioGeneration) => void;
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile';
type TabView = 'split' | 'preview' | 'code';

export default function WebPreview({ generation, onRemix, onSaveToVault, onExport }: WebPreviewProps) {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [tabView, setTabView] = useState<TabView>('split');
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRemix, setShowRemix] = useState(false);
  const [remixPrompt, setRemixPrompt] = useState('');
  const [isRemixing, setIsRemixing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract code from metadata_json
  const { code, framework } = useMemo(() => {
    try {
      const meta = generation.metadata_json ? JSON.parse(generation.metadata_json) : {};
      return {
        code: meta.code || '',
        framework: meta.framework || 'html',
      };
    } catch {
      return { code: '', framework: 'html' };
    }
  }, [generation.metadata_json]);

  const displayCode = editingCode ?? code;
  const isModified = editingCode !== null && editingCode !== code;

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  // Escape key exits fullscreen or edit mode
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) setIsFullscreen(false);
        if (isEditing) setIsEditing(false);
        if (showRemix) setShowRemix(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFullscreen, isEditing, showRemix]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(displayCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = displayCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [displayCode]);

  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditingCode(e.target.value);
  }, []);

  const handleToggleEdit = useCallback(() => {
    if (isEditing) {
      setIsEditing(false);
    } else {
      setEditingCode((prev) => prev ?? code);
      setIsEditing(true);
    }
  }, [isEditing, code]);

  const handleReset = useCallback(() => {
    setEditingCode(null);
    setIsEditing(false);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  // Extract complexity for remix
  const complexity = useMemo(() => {
    try {
      const meta = generation.metadata_json ? JSON.parse(generation.metadata_json) : {};
      return meta.complexity || 'simple';
    } catch {
      return 'simple';
    }
  }, [generation.metadata_json]);

  const handleRemix = useCallback(async () => {
    if (!remixPrompt.trim() || isRemixing) return;
    setIsRemixing(true);
    try {
      // Create a new generation with remix context
      const newGenId = await invoke<string>('studio_create_generation', {
        module: 'code',
        prompt: `Remix: ${remixPrompt}`,
        model: 'cloud',
        provider: 'cloud',
      });

      await invoke('studio_generate_web', {
        generationId: newGenId,
        prompt: `Based on this existing code:\n\`\`\`${framework}\n${displayCode}\n\`\`\`\n\nMake the following changes: ${remixPrompt}`,
        framework: framework,
        complexity: complexity,
        referenceImage: null,
      });

      // Reload and select the new generation
      const newGen = await invoke<StudioGeneration>('studio_get_generation', { id: newGenId });
      if (newGen && onRemix) {
        onRemix(newGen, remixPrompt);
      }
      setShowRemix(false);
      setRemixPrompt('');
    } catch (e) {
      console.error('Remix failed:', e);
    } finally {
      setIsRemixing(false);
    }
  }, [remixPrompt, isRemixing, displayCode, framework, complexity, onRemix]);

  const langLabel = framework === 'react' ? 'JSX' : framework === 'tailwind' ? 'HTML + Tailwind' : 'HTML';
  const prismLang = framework === 'react' ? 'jsx' : 'html';

  return (
    <div
      ref={containerRef}
      className={`web-preview-container ${isFullscreen ? 'web-fullscreen' : ''}`}
    >
      {/* Toolbar */}
      <div className="web-preview-toolbar">
        <div className="web-toolbar-left">
          <div className="web-view-tabs">
            <button
              className={`web-view-tab ${tabView === 'split' ? 'active' : ''}`}
              onClick={() => setTabView('split')}
              title="Split view"
            >
              ◧ Split
            </button>
            <button
              className={`web-view-tab ${tabView === 'preview' ? 'active' : ''}`}
              onClick={() => setTabView('preview')}
              title="Preview only"
            >
              👁 Preview
            </button>
            <button
              className={`web-view-tab ${tabView === 'code' ? 'active' : ''}`}
              onClick={() => setTabView('code')}
              title="Code only"
            >
              &lt;/&gt; Code
            </button>
          </div>
          <span className="web-lang-badge">{langLabel}</span>
          {isModified && <span className="web-modified-badge">Modified</span>}
        </div>

        <div className="web-toolbar-right">
          <div className="web-device-toggle">
            <button
              className={`web-device-btn ${deviceMode === 'desktop' ? 'active' : ''}`}
              onClick={() => setDeviceMode('desktop')}
              title="Desktop (1280px)"
            >
              🖥
            </button>
            <button
              className={`web-device-btn ${deviceMode === 'tablet' ? 'active' : ''}`}
              onClick={() => setDeviceMode('tablet')}
              title="Tablet (768px)"
            >
              📱
            </button>
            <button
              className={`web-device-btn ${deviceMode === 'mobile' ? 'active' : ''}`}
              onClick={() => setDeviceMode('mobile')}
              title="Mobile (375px)"
            >
              📲
            </button>
          </div>
          <button className="web-action-btn" onClick={handleCopy}>
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
          <button
            className={`web-action-btn ${isEditing ? 'web-action-active' : ''}`}
            onClick={handleToggleEdit}
          >
            {isEditing ? '👁 Preview' : '✏️ Edit'}
          </button>
          <button className="web-action-btn" onClick={() => setShowRemix(!showRemix)}>
            🔄 Remix
          </button>
          <button className="web-action-btn" onClick={handleToggleFullscreen}>
            {isFullscreen ? '⛶ Exit' : '⛶ Fullscreen'}
          </button>
          <button className="web-action-btn web-action-save" onClick={() => onSaveToVault?.(generation)}>
            💾 Save
          </button>
          <button className="web-action-btn web-action-export" onClick={() => onExport?.(generation)}>
            📤 Export
          </button>
          {isModified && (
            <button className="web-action-btn web-action-reset" onClick={handleReset}>
              ↩ Reset
            </button>
          )}
        </div>
      </div>

      {/* Remix Bar */}
      {showRemix && (
        <div className="web-remix-bar">
          <input
            type="text"
            className="web-remix-input"
            placeholder="Describe changes... (e.g., 'make it blue', 'add a loading spinner', 'make it bigger')"
            value={remixPrompt}
            onChange={(e) => setRemixPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRemix()}
            disabled={isRemixing}
          />
          <button
            className="web-remix-btn"
            onClick={handleRemix}
            disabled={!remixPrompt.trim() || isRemixing}
          >
            {isRemixing ? 'Remixing…' : 'Remix'}
          </button>
          <button className="web-remix-cancel" onClick={() => setShowRemix(false)}>✕</button>
        </div>
      )}

      {/* Content */}
      <div className={`web-preview-content web-view-${tabView}`}>
        {/* Code Pane */}
        {(tabView === 'split' || tabView === 'code') && (
          <div className="web-code-pane">
            <div className="web-code-header">
              <span className="web-code-lang">{langLabel}</span>
              <span className="web-code-lines">{displayCode.split('\n').length} lines</span>
            </div>
            {isEditing ? (
              <div className="web-code-editor">
                <div className="web-code-line-numbers">
                  {displayCode.split('\n').map((_: string, i: number) => (
                    <span key={i}>{i + 1}</span>
                  ))}
                </div>
                <textarea
                  ref={textareaRef}
                  className="web-code-textarea"
                  value={displayCode}
                  onChange={handleCodeChange}
                  spellCheck={false}
                  wrap="off"
                />
              </div>
            ) : (
              <div className="web-code-highlight" onClick={handleToggleEdit} title="Click to edit">
                <SyntaxHighlight code={displayCode} language={prismLang} />
              </div>
            )}
          </div>
        )}

        {/* Preview Pane */}
        {(tabView === 'split' || tabView === 'preview') && (
          <div className="web-preview-pane">
            <LivePreview
              code={displayCode}
              framework={framework}
              deviceMode={deviceMode}
            />
          </div>
        )}
      </div>
    </div>
  );
}
