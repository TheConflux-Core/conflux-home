import React, { useEffect, useState, useCallback } from 'react';
import type { NudgeType, NudgeData } from '../types';

interface NudgeCardProps {
  nudge: NudgeData;
  onDismiss: (nudgeId: string, permanent?: boolean) => void;
  onAction: (nudgeId: string, nudgeType: NudgeType) => void;
}

const nudgeConfig: Record<NudgeType, { emoji: string; title: string; color: string }> = {
  budget_uncategorized: {
    emoji: '💰',
    title: 'Budget Alert',
    color: 'var(--nudge-emerald, #10b981)',
  },
  kitchen_expiry: {
    emoji: '🍳',
    title: 'Kitchen Reminder',
    color: 'var(--nudge-amber, #f59e0b)',
  },
  dream_overdue: {
    emoji: '🎯',
    title: 'Dream Check-in',
    color: 'var(--nudge-violet, #8b5cf6)',
  },
  habit_streak: {
    emoji: '🔥',
    title: 'Streak Keep-up',
    color: 'var(--nudge-rose, #f43f5e)',
  },
};

export default function NudgeCard({ nudge, onDismiss, onAction }: NudgeCardProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const config = nudgeConfig[nudge.type];

  const handleDismiss = useCallback((permanent: boolean = false) => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss(nudge.id, permanent);
    }, 300);
  }, [nudge.id, onDismiss]);

  const handleAction = useCallback(() => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsVisible(false);
      onAction(nudge.id, nudge.type);
    }, 300);
  }, [nudge.id, nudge.type, onAction]);

  // Auto-dismiss after 10 seconds if no interaction
  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss(false);
    }, 10000);

    return () => clearTimeout(timer);
  }, [handleDismiss]);

  if (!isVisible) return null;

  return (
    <div
      className={`nudge-card ${isAnimatingOut ? 'nudge-exit' : ''}`}
      style={{
        animationDelay: '0s',
      }}
    >
      {/* Glassmorphism background */}
      <div className="nudge-glass" />

      {/* Accent bar */}
      <div
        className="nudge-accent-bar"
        style={{ background: config.color }}
      />

      {/* Content */}
      <div className="nudge-content">
        <div className="nudge-header">
          <span className="nudge-emoji">{config.emoji}</span>
          <span className="nudge-title">{config.title}</span>
          <span className="nudge-time">{nudge.timestamp}</span>
        </div>

        <p className="nudge-message">{nudge.message}</p>

        <div className="nudge-actions">
          <button
            className="nudge-btn nudge-action-btn"
            onClick={handleAction}
            style={{ borderColor: config.color, color: config.color }}
          >
            Take Action
          </button>

          <button
            className="nudge-btn nudge-dismiss-btn"
            onClick={() => handleDismiss(false)}
          >
            Dismiss
          </button>
        </div>

        <button
          className="nudge-dont-remind-btn"
          onClick={() => handleDismiss(true)}
          title="Never show this type of nudge again"
        >
          Don't remind me again
        </button>
      </div>
    </div>
  );
}
