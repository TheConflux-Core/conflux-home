import { STUDIO_MODULES, StudioModule } from '../types';

interface ToolPaletteProps {
  activeModule: StudioModule;
  onSelect: (module: StudioModule) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  userTier?: string;
  onGateModule?: (module: StudioModule) => void; // called when user clicks a gated module
}

const MODULE_ORDER: StudioModule[] = ['image', 'video', 'music', 'voice', 'code', 'writing'];

// Modules that require pro tier
const GATED_MODULES: StudioModule[] = ['video', 'voice'];

export default function ToolPalette({ activeModule, onSelect, isCollapsed, onToggleCollapse, userTier = 'free', onGateModule }: ToolPaletteProps) {
  const isFree = userTier === 'free';

  return (
    <div className={`studio-toolpalette ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="toolpalette-header">
        {!isCollapsed && <span className="toolpalette-title">Modules</span>}
        <button
          className="toolpalette-collapse-btn"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand tools' : 'Collapse tools'}
        >
          {isCollapsed ? '▶' : '◀'}
        </button>
      </div>
      <div className="toolpalette-items">
        {MODULE_ORDER.map((key) => {
          const mod = STUDIO_MODULES[key];
          const isActive = key === activeModule;
          const isGated = isFree && GATED_MODULES.includes(key);

          return (
            <button
              key={key}
              className={`toolpalette-item ${isActive ? 'active' : ''} ${isGated ? 'gated' : ''}`}
              onClick={() => {
                if (isGated) {
                  onGateModule?.(key);
                } else {
                  onSelect(key);
                }
              }}
              title={isGated ? `${mod.label} — Pro feature` : mod.description}
              style={isGated ? { opacity: 0.5, cursor: 'pointer' } : undefined}
            >
              <span className="toolpalette-icon">{isGated ? '🔒' : mod.icon}</span>
              {!isCollapsed && (
                <>
                  <span className="toolpalette-label">{mod.label}</span>
                  <span className="toolpalette-desc">
                    {isGated ? 'Pro' : mod.description}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
