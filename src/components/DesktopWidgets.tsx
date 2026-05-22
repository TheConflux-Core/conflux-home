import { View } from '../types';

interface WidgetDef {
  id: string;
  icon: string;
  label: string;
  preview: string;
  color: string;
}

const WIDGETS: WidgetDef[] = [
  { id: 'google', icon: '🔍', label: 'Google', preview: 'Calendar · Mail · Drive', color: '#4285f4' },
  { id: 'pulse', icon: '💰', label: 'Pulse', preview: 'Weekly spend summary', color: '#10b981' },
  { id: 'hearth', icon: '🍳', label: 'Hearth', preview: "Tonight's meal plan", color: '#f59e0b' },
  { id: 'orbit', icon: '🧠', label: 'Orbit', preview: 'Active reminders', color: '#6366f1' },
  { id: 'horizon', icon: '🎯', label: 'Horizon', preview: 'Current milestones', color: '#8b5cf6' },
  { id: 'family', icon: '🧩', label: 'Family', preview: 'Active agents', color: '#3b82f6' },
  { id: 'story', icon: '🎮', label: 'Story', preview: 'Play and compete', color: '#f43f5e' },

  { id: 'bazaar', icon: '🛒', label: 'Marketplace', preview: 'Browse agents', color: '#84cc16' },
  { id: 'settings', icon: '⚙️', label: 'Settings', preview: 'System config', color: '#64748b' },
];

interface DesktopWidgetsProps {
  onNavigate: (view: View) => void;
}

export default function DesktopWidgets({ onNavigate }: DesktopWidgetsProps) {
  return (
    <>
      <div className="desktop-widgets-grid">
        {WIDGETS.map((widget) => (
          <div
            key={widget.id}
            className="desktop-widget"
            onClick={() => onNavigate(widget.id as View)}
            style={{
              '--widget-color': widget.color,
            } as React.CSSProperties}
          >
            <div
              className="widget-accent"
              style={{
                background: `linear-gradient(90deg, ${widget.color}, ${widget.color}88)`,
              }}
            />
            <div className="widget-body">
              <div className="widget-icon">{widget.icon}</div>
              <div className="widget-label">{widget.label}</div>
              <div className="widget-preview">{widget.preview}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
