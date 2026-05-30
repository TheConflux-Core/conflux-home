import { useStudio } from '../context/StudioContext';
import { convertFileSrc } from '@tauri-apps/api/core';
import { STUDIO_MODULES } from '../types';

function getThumbnailUrl(gen: { module: string; output_url: string | null; output_path: string | null }): string | null {
  // Only image and design modules produce visual thumbnails
  if (gen.module !== 'image' && gen.module !== 'design') return null;
  if (gen.output_url?.startsWith('http')) return gen.output_url;
  if (gen.output_path) return convertFileSrc(gen.output_path);
  return null;
}

// Background color per module for icon placeholders
const MODULE_COLORS: Record<string, string> = {
  image: 'rgba(168, 85, 247, 0.25)',
  music: 'rgba(6, 182, 212, 0.25)',
  voice: 'rgba(59, 130, 246, 0.25)',
  video: 'rgba(236, 72, 153, 0.25)',
  code: 'rgba(34, 197, 94, 0.25)',
  design: 'rgba(249, 115, 22, 0.25)',
};

export default function HistoryStrip() {
  const { generations, selectedGeneration, selectGeneration } = useStudio();

  if (generations.length === 0) {
    return null;
  }

  return (
    <div className="studio-history-strip">
      <div className="history-strip-header">
        <span className="history-strip-title">History</span>
      </div>
      <div className="history-strip-scroll">
        {generations.map((gen) => {
          const thumb = getThumbnailUrl(gen);
          const isActive = selectedGeneration?.id === gen.id;
          const mod = STUDIO_MODULES[gen.module];

          return (
            <button
              key={gen.id}
              className={`history-strip-item ${isActive ? 'active' : ''}`}
              onClick={() => selectGeneration(gen)}
              title={`${mod.icon} ${gen.prompt}`}
            >
              {thumb ? (
                <img src={thumb} alt={gen.prompt} className="history-strip-thumb" />
              ) : (
                <div
                  className="history-strip-placeholder"
                  style={{ background: MODULE_COLORS[gen.module] || 'rgba(255,255,255,0.04)' }}
                >
                  {mod.icon}
                </div>
              )}
              <span className="history-strip-module-badge">{mod.icon}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
