import { useRef, useCallback } from 'react';
import { VaultFile } from '../types';
import { convertFileSrc } from '@tauri-apps/api/core';

interface Props {
  file: VaultFile;
  selected: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onOpen: () => void;
  onDownload?: () => void;
  onContextMenu?: () => void;
}

function getFileEmoji(type: string): string {
  const map: Record<string, string> = {
    image: '🖼️', audio: '🎵', video: '🎬', code: '💻',
    document: '📄', archive: '📦', other: '📎',
  };
  return map[type] || '📎';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

export default function VaultFileCard({ file, selected, onSelect, onToggleFavorite, onDelete, onOpen, onDownload, onContextMenu }: Props) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasLongPress = useRef(false);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    wasLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      wasLongPress.current = true;
      onContextMenu?.();
      // Haptic feedback if available
      if (navigator.vibrate) navigator.vibrate(30);
    }, 500);
  }, [onContextMenu]);

  const handleTouchEnd = useCallback(() => {
    clearLongPress();
  }, [clearLongPress]);

  const handleTouchMove = useCallback(() => {
    clearLongPress();
  }, [clearLongPress]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (wasLongPress.current) {
      wasLongPress.current = false;
      return;
    }
    onSelect();
  }, [onSelect]);

  return (
    <div
      className={`vault-file-card ${selected ? 'selected' : ''}`}
      onClick={handleClick}
      onDoubleClick={(e) => { e.stopPropagation(); onOpen(); }}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(); }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      <div className="vault-file-thumb">
        {file.file_type === 'image' && file.thumbnail_path ? (
          <img src={convertFileSrc(file.thumbnail_path)} alt={file.name} loading="lazy" />
        ) : file.file_type === 'image' ? (
          <img src={convertFileSrc(file.path)} alt={file.name} loading="lazy" />
        ) : file.file_type === 'audio' ? (
          <div className="vault-file-icon-large">🎵</div>
        ) : file.file_type === 'video' ? (
          <div className="vault-file-icon-large">🎬</div>
        ) : (
          <div className="vault-file-icon-large">{getFileEmoji(file.file_type)}</div>
        )}
        <div className="vault-file-type-badge">{file.extension || file.file_type}</div>
        <span className={`vault-file-favorite ${file.is_favorite ? 'is-fav' : ''}`}
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}>
          {file.is_favorite ? '⭐' : '☆'}
        </span>
      </div>
      <div className="vault-file-info">
        <div className="vault-file-name" title={file.name}>{file.name}</div>
        <div className="vault-file-meta">
          <span>{formatSize(file.size_bytes)}</span>
          {file.created_by && <span className="vault-file-agent">🤖</span>}
          {onDownload && (
            <button
              className="vault-file-download"
              onClick={(e) => { e.stopPropagation(); onDownload(); }}
              title="Save as..."
            >
              ⬇
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
