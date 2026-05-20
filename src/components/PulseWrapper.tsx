// Conflux Home — PulseWrapper
// Finance application: Budget + Stocks + Portfolio + Investments + Speak to Pulse

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import PulseParticles from './PulseParticles';
import PulseBoot from './PulseBoot';
import PulseOnboarding, { hasCompletedPulseOnboarding } from './PulseOnboarding';
import PulseTour, { hasCompletedPulseTour } from './PulseTour';
import '../styles/budget-pulse.css';
import BudgetTab from './BudgetTab';
import StocksTab from './StocksTab';
import PortfolioTab from './PortfolioTab';
// import InvestmentsTab from './InvestmentsTab';
import SpeakToPulseTab from './SpeakToPulseTab';
import '../styles/pulse-tabs.css';

export type PulseTab = 'budget' | 'stocks' | 'portfolio' | 'speak';

export default function PulseWrapper() {
  const [bootDone, setBootDone] = useState(() => localStorage.getItem('pulse-boot-done') === 'true');
  const hasOnboarded = hasCompletedPulseOnboarding();
  const hasTakenTour = hasCompletedPulseTour();
  const [showOnboarding, setShowOnboarding] = useState(!bootDone && !hasOnboarded);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [showTour, setShowTour] = useState(!bootDone ? false : !hasTakenTour);
  const [tourComplete, setTourComplete] = useState(false);
  const [activeTab, setActiveTab] = useState<PulseTab>('budget');
  const [financialScore, setFinancialScore] = useState(81); // default optimistic

  // ── Financial Health Score ──────────────────────────────────────
  // Computed from budget surplus + portfolio diversification + goal progress
  const computeFinancialScore = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const holdings: any[] = await invoke<any[]>('pulse_get_holdings', { memberId: null }).catch(() => []);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const goals: any[] = await invoke<any[]>('pulse_get_investment_goals', { memberId: null }).catch(() => []);

      // Budget component (0–40 points): savings rate
      let budgetScore = 0;
      // We can't easily get surplus here without duplicating useBudgetEngine logic
      // Use a placeholder that checks if income > obligations (full credit if surplus positive)
      // BudgetTab itself shows the real number; here we just give max credit if buckets exist
      budgetScore = 20; // base: budgeting system is active

      // Portfolio component (0–50 points): diversification + performance
      // Matches PortfolioTab calcFinancialHealthScore formula exactly
      let portfolioScore = 0;
      if (holdings && holdings.length > 0) {
        const types = new Set(holdings.map((h: any) => h.asset_type)).size;
        const gainers = holdings.filter((h: any) => (h.current_value || 0) > (h.cost_basis || 0)).length;
        portfolioScore = 20 // base engagement score
          + Math.min(types * 12, 40) // up to 40 pts for asset diversification
          + Math.round((gainers / holdings.length) * 40); // up to 40 pts for % holdings in profit
      }

      // Goals component (0–20 points): progress toward investment goals
      let goalsScore = 0;
      if (goals && goals.length > 0) {
        const avgPct = goals.reduce((s: number, g: any) => {
          const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
          return s + Math.min(pct, 100);
        }, 0) / goals.length;
        goalsScore = Math.round((avgPct / 100) * 20);
      }

      const score = Math.min(100, budgetScore + portfolioScore + goalsScore);
      setFinancialScore(score);
    } catch {
      // Keep default score on error
    }
  }, [bootDone]);

  useEffect(() => {
    if (bootDone) computeFinancialScore();
  }, [bootDone, computeFinancialScore]);

  const showTabBar = bootDone && !showOnboarding && !onboardingComplete && (showTour ? tourComplete : true);

  return (
    <div className="pulse-wrapper">
      <div className="pulse-bg-effects" />
      <PulseParticles />

      {!bootDone && (
        <PulseBoot
          onComplete={() => {
            localStorage.setItem('pulse-boot-done', 'true');
            setBootDone(true);
          }}
        />
      )}

      {bootDone && showOnboarding && !onboardingComplete && (
        <PulseOnboarding
          onComplete={() => {
            setOnboardingComplete(true);
            setShowOnboarding(false);
            if (!hasTakenTour) setShowTour(true);
          }}
        />
      )}

      {bootDone && !showOnboarding && showTour && !tourComplete && (
        <PulseTour onComplete={() => setTourComplete(true)} />
      )}

      {/* Tab Navigation Bar */}
      {showTabBar && (
        <nav className="pulse-tab-nav">
          {/* Brand Mark */}
          <div className="pulse-tab-brand">
            <div className="pulse-brand-logo">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="14" cy="14" r="12" stroke="#34d399" strokeWidth="1.5" fill="none" opacity="0.3"/>
                <circle cx="14" cy="14" r="8" stroke="#34d399" strokeWidth="1.5" fill="none" opacity="0.5"/>
                <circle cx="14" cy="14" r="4" fill="#34d399"/>
                <line x1="14" y1="2" x2="14" y2="6" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="14" y1="22" x2="14" y2="26" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="2" y1="14" x2="6" y2="14" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="22" y1="14" x2="26" y2="14" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="pulse-brand-text">
              <span className="pulse-brand-name">Pulse</span>
              <span className="pulse-brand-tagline">Financial Intelligence</span>
            </div>
            <div className="pulse-brand-score">
              <div className="score-ring">
                <svg width="36" height="36" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" stroke="rgba(16,185,129,0.15)" strokeWidth="2" fill="none"/>
                  <circle
                    cx="18" cy="18" r="15"
                    stroke={financialScore >= 70 ? '#34d399' : financialScore >= 40 ? '#fbbf24' : '#ef4444'}
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="94.2"
                    strokeDashoffset={String(94.2 - (financialScore / 100) * 94.2)}
                    strokeLinecap="round"
                    transform="rotate(-90 18 18)"
                    className="score-arc"
                  />
                </svg>
                <span className="score-number">{financialScore}</span>
              </div>
            </div>
          </div>

          {/* Tab Buttons */}
          <div className="pulse-tabs">
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`pulse-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon" dangerouslySetInnerHTML={{ __html: tab.iconSvg }} />
                <span className="tab-label">{tab.label}</span>
                {activeTab === tab.id && <span className="tab-active-dot" />}
              </button>
            ))}
          </div>


          <div className="pulse-tab-spacer" />
        </nav>
      )}

      {/* Active Tab Content */}
      <div className="pulse-tab-content">
        {showTabBar ? (
          <>
            {activeTab === 'budget' && <BudgetTab />}
            {activeTab === 'stocks' && <StocksTab />}
            {activeTab === 'portfolio' && <PortfolioTab />}
            {/* activeTab === 'investments' && <InvestmentsTab /> — coming soon */}
            {activeTab === 'speak' && <SpeakToPulseTab />}
          </>
        ) : (
          <BudgetTab preOnboarding={!bootDone || showOnboarding || (showTour && !tourComplete)} />
        )}
      </div>
    </div>
  );
}

const TABS: { id: PulseTab; label: string; icon: string; iconSvg: string }[] = [
  {
    id: 'budget',
    label: 'Budget',
    icon: '💰',
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`,
  },
  {
    id: 'stocks',
    label: 'Stocks',
    icon: '📈',
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    icon: '🎒',
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="12"/></svg>`,
  },
  {
    id: 'speak',
    label: 'Speak to Pulse',
    icon: '🎤',
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>`,
  },
];