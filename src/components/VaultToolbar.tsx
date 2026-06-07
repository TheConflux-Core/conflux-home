import { VaultViewMode } from '../types';

interface Props {
  viewMode: VaultViewMode;
  onViewModeChange: (mode: VaultViewMode) => void;
  onCreateProject?: () => void;
  isMobile?: boolean;
}

export default function VaultToolbar({ viewMode, onViewModeChange, onCreateProject, isMobile }: Props) {
  return (
    <div className="vault-toolbar">
      <div className="vault-toolbar-group">
        <button className={`vault-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => onViewModeChange('grid')} title="Grid view">⊞</button>
        <button className={`vault-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => onViewModeChange('list')} title="List view">☰</button>
        <button className={`vault-view-btn ${viewMode === 'timeline' ? 'active' : ''}`}
                onClick={() => onViewModeChange('timeline')} title="Timeline view">⏱</button>
      </div>
      {!isMobile && (
        <div className="vault-toolbar-group">
          <button className="vault-btn-primary" onClick={onCreateProject}>+ New Project</button>
        </div>
      )}
    </div>
  );
}
