// Conflux Home — PulseWrapper
// Finance application: Budget + Stocks + Portfolio + Investments + Speak to Pulse

import { useState } from 'react';
import PulseParticles from './PulseParticles';
import PulseBoot from './PulseBoot';
import PulseOnboarding, { hasCompletedPulseOnboarding } from './PulseOnboarding';
import PulseTour, { hasCompletedPulseTour } from './PulseTour';
import '../styles/budget-pulse.css';
import BudgetTab from './BudgetTab';
import StocksTab from './StocksTab';
import PortfolioTab from './PortfolioTab';
import InvestmentsTab from './InvestmentsTab';
import SpeakToPulseTab from './SpeakToPulseTab';
import '../styles/pulse-tabs.css';

export type PulseTab = 'budget' | 'stocks' | 'portfolio' | 'investments' | 'speak';

export default function PulseWrapper() {
  const [bootDone, setBootDone] = useState(() => localStorage.getItem('pulse-boot-done') === 'true');
  const hasOnboarded = hasCompletedPulseOnboarding();
  const hasTakenTour = hasCompletedPulseTour();
  const [showOnboarding, setShowOnboarding] = useState(!bootDone && !hasOnboarded);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [showTour, setShowTour] = useState(!bootDone ? false : !hasTakenTour);
  const [tourComplete, setTourComplete] = useState(false);
  const [activeTab, setActiveTab] = useState<PulseTab>('budget');

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
                    stroke="#34d399"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="94.2"
                    strokeDashoffset="18"
                    strokeLinecap="round"
                    transform="rotate(-90 18 18)"
                    className="score-arc"
                  />
                </svg>
                <span className="score-number">81</span>
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
            {activeTab === 'investments' && <InvestmentsTab />}
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
    id: 'investments',
    label: 'Investments',
    icon: '🏦',
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/><path d="M8 12a4 4 0 0 1 8 0"/></svg>`,
  },
  {
    id: 'speak',
    label: 'Speak to Pulse',
    icon: '🎤',
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>`,
  },
];