// Conflux Home — Skills Browser Panel
// Browse, install, toggle, and uninstall skills.

import { useState } from 'react';
import { useSkills, type Skill } from '../../hooks/useSkills';

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      className={`toggle-switch ${checked ? 'on' : ''}`}
      onClick={() => onChange(!checked)}
      aria-label={checked ? 'Disable' : 'Enable'}
      type="button"
    >
      <span className="toggle-knob" />
    </button>
  );
}

export default function SkillsBrowser() {
  const { skills, loading, install, toggle, uninstall } = useSkills();
  const [showModal, setShowModal] = useState(false);
  const [uninstallConfirm, setUninstallConfirm] = useState<string | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);

  const handleInstall = async (skill: Skill) => {
    setInstalling(skill.id);
    try {
      // Pass the skill id as manifest JSON (engine resolves it)
      await install(JSON.stringify({ id: skill.id }));
    } catch (err) {
      window.dispatchEvent(new CustomEvent('conflux:toast', {
        detail: { message: `Failed to install skill: ${err}`, type: 'error' },
      }));
    } finally {
      setInstalling(null);
    }
  };

  const handleUninstall = async (id: string) => {
    try {
      await uninstall(id);
      setUninstallConfirm(null);
    } catch (err) {
      window.dispatchEvent(new CustomEvent('conflux:toast', {
        detail: { message: `Failed to uninstall skill: ${err}`, type: 'error' },
      }));
    }
  };

  if (loading) {
    return (
      <div className="settings-section">
        <div className="settings-section-title">🧩 Skills</div>
        <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>Loading skills...</div>
      </div>
    );
  }

  return (
    <div className="settings-section">
      <div className="settings-section-title">
        🧩 Skills
        <button
          onClick={() => setShowModal(!showModal)}
          style={{
            background: showModal ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)',
            border: 'none',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 13,
            cursor: 'pointer',
            color: showModal ? '#000' : 'var(--text-muted)',
            fontWeight: 600,
          }}
        >
          +
        </button>
      </div>

      {/* Install Modal — shows all skills (installed + available) */}
      {showModal && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
            Available Skills
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {skills.map((skill) => (
              <div
                key={skill.id}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{skill.icon || '🧩'}</span>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {skill.name}
                  </div>
                </div>
                <div style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  lineHeight: 1.4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {skill.description}
                </div>
                <button
                  onClick={() => handleInstall(skill)}
                  disabled={installing === skill.id}
                  style={{
                    marginTop: 'auto',
                    background: 'rgba(255,255,255,0.06)',
                    border: 'none',
                    borderRadius: 6,
                    padding: '5px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {installing === skill.id ? 'Installing...' : '⬇️ Install'}
                </button>
              </div>
            ))}
          </div>

          {skills.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              No skills available.
            </div>
          )}

          <button
            className="settings-button"
            onClick={() => setShowModal(false)}
            style={{ marginTop: 12 }}
          >
            Close
          </button>
        </div>
      )}

      {/* Installed Skills Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
      }}>
        {skills.map((skill) => (
          <div
            key={skill.id}
            style={{
              background: 'var(--bg-card)',
              border: `1px solid ${skill.active ? 'var(--border)' : 'rgba(150,150,150,0.2)'}`,
              borderRadius: 12,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              opacity: skill.active ? 1 : 0.5,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>{skill.icon || '🧩'}</span>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {skill.name}
              </div>
            </div>

            <div style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {skill.description}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
              <ToggleSwitch
                checked={skill.active}
                onChange={(active) => toggle(skill.id, active)}
              />

              {uninstallConfirm === skill.id ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => handleUninstall(skill.id)}
                    style={{
                      background: 'rgba(255,68,68,0.12)',
                      border: 'none',
                      borderRadius: 6,
                      padding: '4px 8px',
                      fontSize: 10,
                      cursor: 'pointer',
                      color: '#ff6666',
                      fontWeight: 600,
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setUninstallConfirm(null)}
                    style={{
                      background: 'none',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      padding: '4px 8px',
                      fontSize: 10,
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setUninstallConfirm(skill.id)}
                  style={{
                    background: 'none',
                    border: '1px solid rgba(255,68,68,0.2)',
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontSize: 10,
                    cursor: 'pointer',
                    color: '#ff6666',
                  }}
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {skills.length === 0 && (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
          No skills installed. Click + to browse available skills.
        </div>
      )}
    </div>
  );
}
