// Conflux Home — Home Health View
// Your House's Doctor: bills, maintenance, appliances, AI insights

import { useState, useEffect, useCallback } from 'react';
import { useHomeHealth } from '../hooks/useHomeHealth';
import type { HomeBill } from '../types';

const BILL_TYPE_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  electric: { emoji: '⚡', label: 'Electric', color: '#f59e0b' },
  gas: { emoji: '🔥', label: 'Gas', color: '#f97316' },
  water: { emoji: '💧', label: 'Water', color: '#3b82f6' },
  internet: { emoji: '📡', label: 'Internet', color: '#8b5cf6' },
  trash: { emoji: '🗑️', label: 'Trash', color: '#6b7280' },
  other: { emoji: '📄', label: 'Other', color: '#9ca3af' },
};

const APPLIANCE_CATEGORY_EMOJI: Record<string, string> = {
  hvac: '❄️', kitchen: '🍳', laundry: '👕', plumbing: '🚰', electrical: '⚡', outdoor: '🌿',
};

function getAgeColor(installed: string, lifespanYears: number): string {
  const age = (Date.now() - new Date(installed).getTime()) / (365.25 * 86400000);
  const pct = (age / lifespanYears) * 100;
  if (pct >= 90) return '#ef4444';
  if (pct >= 70) return '#f97316';
  if (pct >= 50) return '#f59e0b';
  return '#10b981';
}

function getAgePercent(installed: string, lifespanYears: number): number {
  const age = (Date.now() - new Date(installed).getTime()) / (365.25 * 86400000);
  return Math.min(100, Math.round((age / lifespanYears) * 100));
}

export default function HomeHealthView() {
  const { dashboard, insights, loading, load, loadInsights, addBill, deleteBill, addMaintenance, upsertProfile } = useHomeHealth();
  const [tab, setTab] = useState<'overview' | 'bills' | 'maintenance' | 'appliances' | 'insights' | 'profile'>('overview');
  const [billType, setBillType] = useState('electric');
  const [billAmount, setBillAmount] = useState('');
  const [billMonth, setBillMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [insightsLoaded, setInsightsLoaded] = useState(false);

  useEffect(() => { load(); }, [load]);

  const handleLoadInsights = useCallback(async () => {
    await loadInsights();
    setInsightsLoaded(true);
  }, [loadInsights]);

  if (loading) return <div className="kitchen-view"><div className="kitchen-header"><h2 className="kitchen-title">🏠 Home Health</h2><p style={{ color: 'rgba(255,255,255,0.6)' }}>Loading...</p></div></div>;

  const healthScore = dashboard?.health_score ?? 0;
  const scoreColor = healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="kitchen-view">
      <div className="kitchen-header">
        <h2 className="kitchen-title">🏠 Home Health</h2>
        <div className="kitchen-tabs">
          {(['overview', 'bills', 'maintenance', 'appliances', 'insights', 'profile'] as const).map(t => (
            <button key={t} className={`kitchen-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'overview' ? '📊' : t === 'bills' ? '💰' : t === 'maintenance' ? '🔧' : t === 'appliances' ? '🔌' : t === 'insights' ? '🧠' : '🏠'}
              {t === 'overview' ? ' Overview' : t === 'bills' ? ' Bills' : t === 'maintenance' ? ' Maint.' : t === 'appliances' ? ' Appliances' : t === 'insights' ? ' Insights' : ' Profile'}
            </button>
          ))}
        </div>
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Health Score */}
          <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 700, color: scoreColor }}>{healthScore.toFixed(0)}</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 12 }}>Home Health Score</div>
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
              <div style={{ height: '100%', borderRadius: 3, width: `${healthScore}%`, background: scoreColor, transition: 'width 0.3s' }} />
            </div>
          </div>

          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="budget-card" style={{ borderLeft: '3px solid #3b82f6' }}>
              <span className="budget-card-emoji">💰</span>
              <span className="budget-card-label">Monthly Bills</span>
              <span className="budget-card-value" style={{ color: '#3b82f6' }}>${(dashboard?.total_monthly_utilities ?? 0).toFixed(2)}</span>
            </div>
            <div className="budget-card" style={{ borderLeft: '3px solid #ef4444' }}>
              <span className="budget-card-emoji">🔴</span>
              <span className="budget-card-label">Overdue Maint.</span>
              <span className="budget-card-value" style={{ color: '#ef4444' }}>{dashboard?.overdue_maintenance.length ?? 0}</span>
            </div>
            <div className="budget-card" style={{ borderLeft: '3px solid #f59e0b' }}>
              <span className="budget-card-emoji">🔔</span>
              <span className="budget-card-label">Upcoming Maint.</span>
              <span className="budget-card-value" style={{ color: '#f59e0b' }}>{dashboard?.upcoming_maintenance.length ?? 0}</span>
            </div>
            <div className="budget-card" style={{ borderLeft: '3px solid #8b5cf6' }}>
              <span className="budget-card-emoji">🔌</span>
              <span className="budget-card-label">Appliances</span>
              <span className="budget-card-value" style={{ color: '#8b5cf6' }}>{dashboard?.appliances_needing_service.length ?? 0}</span>
            </div>
          </div>

          {/* Alerts */}
          {dashboard && dashboard.overdue_maintenance.length > 0 && (
            <div style={{ background: '#ef444410', border: '1px solid #ef444440', borderRadius: 12, padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#ef4444', margin: '0 0 10px 0' }}>🚨 Overdue Maintenance</h3>
              {dashboard.overdue_maintenance.slice(0, 3).map(m => (
                <div key={m.id} style={{ padding: '6px 0', borderBottom: '1px solid #ef444420' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{m.task}</div>
                  <div style={{ fontSize: 11, color: '#ef4444' }}>Due: {m.next_due}</div>
                </div>
              ))}
            </div>
          )}

          {/* Bill Trend Chart */}
          {dashboard && dashboard.bill_trend.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.75)', margin: '0 0 12px 0' }}>📈 Utility Trend</h3>
              <BillChart data={dashboard.bill_trend} />
            </div>
          )}
        </div>
      )}

      {/* Bills */}
      {tab === 'bills' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="ai-add-section">
            <div className="fridge-scan-header"><span className="ai-add-icon">💰</span><span>Log Bill</span></div>
            <div className="ai-add-row" style={{ flexWrap: 'wrap' }}>
              <select value={billType} onChange={e => setBillType(e.target.value)} className="kitchen-select">
                {Object.entries(BILL_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
              </select>
              <input type="number" value={billAmount} onChange={e => setBillAmount(e.target.value)} placeholder="Amount" className="ai-add-input" style={{ width: 100 }} />
              <input type="month" value={billMonth} onChange={e => setBillMonth(e.target.value)} className="ai-add-input" style={{ width: 140 }} />
              <button className="btn-primary" disabled={!billAmount}
                onClick={async () => { await addBill(billType, parseFloat(billAmount), billMonth); setBillAmount(''); }}>
                Log Bill
              </button>
            </div>
          </div>
          {dashboard && dashboard.bill_trend.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 16 }}>
              <BillChart data={dashboard.bill_trend} />
            </div>
          )}
        </div>
      )}

      {/* Maintenance */}
      {tab === 'maintenance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {dashboard?.overdue_maintenance.map(m => (
            <div key={m.id} style={{ padding: 12, borderRadius: 10, background: '#ef444410', border: '1px solid #ef444420' }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>🔴 {m.task}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{m.category} · Due {m.next_due}</div>
            </div>
          ))}
          {dashboard?.upcoming_maintenance.map(m => (
            <div key={m.id} style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontWeight: 500, fontSize: 14 }}>🔔 {m.task}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{m.category} · Due {m.next_due} · {m.priority}</div>
            </div>
          ))}
          {dashboard && dashboard.overdue_maintenance.length === 0 && dashboard.upcoming_maintenance.length === 0 && (
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', padding: 20 }}>No maintenance items yet. The AI will suggest items based on your home profile!</p>
          )}
        </div>
      )}

      {/* Appliances */}
      {tab === 'appliances' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {dashboard?.appliances_needing_service.map(a => {
            const emoji = APPLIANCE_CATEGORY_EMOJI[a.category] || '🔌';
            const agePct = a.installed_date && a.expected_lifespan_years ? getAgePercent(a.installed_date, a.expected_lifespan_years) : 0;
            const ageColor = a.installed_date && a.expected_lifespan_years ? getAgeColor(a.installed_date, a.expected_lifespan_years) : '#10b981';
            return (
              <div key={a.id} style={{ padding: 14, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{emoji} {a.name}</span>
                  <span style={{ fontSize: 12, color: ageColor, fontWeight: 600 }}>{agePct}% of life</span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
                  {a.category} · {a.model || 'No model'} · {a.installed_date ? `Installed ${a.installed_date}` : 'No install date'}
                </div>
                {a.expected_lifespan_years && (
                  <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                    <div style={{ height: '100%', borderRadius: 2, width: `${agePct}%`, background: ageColor }} />
                  </div>
                )}
                {a.estimated_replacement_cost && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>Replacement: ${a.estimated_replacement_cost.toFixed(2)}</div>
                )}
              </div>
            );
          })}
          {(!dashboard || dashboard.appliances_needing_service.length === 0) && (
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', padding: 20 }}>No appliances tracked yet. Add your HVAC, water heater, etc. to get AI-powered predictions.</p>
          )}
        </div>
      )}

      {/* Insights */}
      {tab === 'insights' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!insightsLoaded ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>Let AI analyze your home's health data</p>
              <button className="btn-primary" onClick={handleLoadInsights}>🧠 Analyze My Home</button>
            </div>
          ) : (
            insights.map((ins, i) => (
              <div key={i} style={{ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{ins.title}</div>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.75)' }}>{ins.description}</div>
                {ins.estimated_impact && (
                  <div style={{ marginTop: 8, fontSize: 12, padding: '4px 10px', borderRadius: 6, background: '#10b98120', color: '#10b981', display: 'inline-block' }}>
                    💰 {ins.estimated_impact}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Profile */}
      {tab === 'profile' && (
        <HomeProfileForm profile={dashboard?.profile} onSave={upsertProfile} />
      )}
    </div>
  );
}

function BillChart({ data }: { data: { month: string; total: number; electric: number | null; gas: number | null; water: number | null }[] }) {
  const maxTotal = Math.max(...data.map(d => d.total), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100 }}>
      {data.map(d => (
        <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ position: 'relative', width: '100%', height: 80 }}>
            {d.electric != null && <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${(d.electric / maxTotal) * 80}px`, background: '#f59e0b', borderRadius: '3px 3px 0 0' }} />}
            {d.gas != null && <div style={{ position: 'absolute', bottom: d.electric ? `${(d.electric / maxTotal) * 80}px` : 0, width: '100%', height: `${(d.gas / maxTotal) * 80}px`, background: '#f97316' }} />}
            {d.water != null && <div style={{ position: 'absolute', bottom: ((d.electric ?? 0) + (d.gas ?? 0)) / maxTotal * 80, width: '100%', height: `${(d.water / maxTotal) * 80}px`, background: '#3b82f6', borderRadius: '0 0 3px 3px' }} />}
          </div>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)' }}>{d.month.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

function HomeProfileForm({ profile, onSave }: { profile: { year_built: number | null; square_feet: number | null; hvac_type: string | null; hvac_filter_size: string | null; water_heater_type: string | null; roof_type: string | null; window_type: string | null; insulation_type: string | null } | null | undefined; onSave: (p: any) => Promise<void> }) {
  const [form, setForm] = useState({
    yearBuilt: profile?.year_built ?? undefined,
    squareFeet: profile?.square_feet ?? undefined,
    hvacType: profile?.hvac_type ?? '',
    hvacFilterSize: profile?.hvac_filter_size ?? '',
    waterHeaterType: profile?.water_heater_type ?? '',
    roofType: profile?.roof_type ?? '',
    windowType: profile?.window_type ?? '',
    insulationType: profile?.insulation_type ?? '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      yearBuilt: form.yearBuilt || undefined, squareFeet: form.squareFeet || undefined,
      hvacType: form.hvacType || undefined, hvacFilterSize: form.hvacFilterSize || undefined,
      waterHeaterType: form.waterHeaterType || undefined, roofType: form.roofType || undefined,
      windowType: form.windowType || undefined, insulationType: form.insulationType || undefined,
    });
    setSaving(false);
  };

  const field = (label: string, value: string | number | undefined, onChange: (v: any) => void, type = 'text', placeholder = '') => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 4 }}>{label}</label>
      <input type={type} value={value ?? ''} onChange={e => onChange(type === 'number' ? (e.target.value ? parseInt(e.target.value) : undefined) : e.target.value)} placeholder={placeholder} className="ai-add-input" style={{ width: '100%' }} />
    </div>
  );

  const select = (label: string, value: string, onChange: (v: string) => void, options: [string, string][]) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 4 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="kitchen-select" style={{ width: '100%' }}>
        <option value="">Not set</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );

  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 20 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px 0' }}>🏠 Home Profile</h3>
      {field('Year Built', form.yearBuilt, v => setForm(s => ({ ...s, yearBuilt: v })), 'number', 'e.g. 2005')}
      {field('Square Feet', form.squareFeet, v => setForm(s => ({ ...s, squareFeet: v })), 'number', 'e.g. 2200')}
      {select('HVAC Type', form.hvacType, v => setForm(s => ({ ...s, hvacType: v })), [['central_ac', 'Central AC'], ['window_ac', 'Window AC'], ['heat_pump', 'Heat Pump'], ['furnace', 'Furnace'], ['radiant', 'Radiant Heat']])}
      {field('HVAC Filter Size', form.hvacFilterSize, v => setForm(s => ({ ...s, hvacFilterSize: v })), 'text', 'e.g. 16x25x1')}
      {select('Water Heater', form.waterHeaterType, v => setForm(s => ({ ...s, waterHeaterType: v })), [['tank', 'Tank'], ['tankless', 'Tankless'], ['heat_pump', 'Heat Pump'], ['solar', 'Solar']])}
      {select('Roof Type', form.roofType, v => setForm(s => ({ ...s, roofType: v })), [['asphalt', 'Asphalt Shingles'], ['metal', 'Metal'], ['tile', 'Tile'], ['flat', 'Flat']])}
      {select('Window Type', form.windowType, v => setForm(s => ({ ...s, windowType: v })), [['single', 'Single Pane'], ['double', 'Double Pane'], ['triple', 'Triple Pane'], ['low_e', 'Low-E']])}
      {select('Insulation', form.insulationType, v => setForm(s => ({ ...s, insulationType: v })), [['fiberglass', 'Fiberglass'], ['spray_foam', 'Spray Foam'], ['cellulose', 'Cellulose']])}
      <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ width: '100%', marginTop: 8 }}>
        {saving ? 'Saving...' : '💾 Save Profile'}
      </button>
    </div>
  );
}
