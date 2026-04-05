import React from 'react';

interface MissionControlHeaderProps {
  completedToday: number;
  streakTotal: number;
  taskCount: number;
}

export function MissionControlHeader({ completedToday, streakTotal, taskCount }: MissionControlHeaderProps) {
  return (
    <div className="mc-header">
      <div className="mc-header-left">
        <h2 className="mc-title">🌀 LIFE ORBIT</h2>
        <div className="mc-header-stats">
          <span className="mc-stat completed">✅ {completedToday} today</span>
          <span className="mc-stat streak">🔥 {streakTotal} streak</span>
          <span className="mc-stat tasks">📋 {taskCount} tasks</span>
        </div>
      </div>
      <div className="mc-altitude-container">
        <div className="mc-altitude-gauge">
          <span className="mc-altitude-value">{completedToday}</span>
          <span className="mc-altitude-label">COMPLETE</span>
        </div>
        <div className="mc-altitude-details">
          <div>Daily Momentum: <span>{completedToday} items completed</span></div>
          <div>Streak Strength: <span>{streakTotal} day streak</span></div>
        </div>
      </div>
    </div>
  );
}