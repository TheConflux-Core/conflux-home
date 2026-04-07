// Weekly Insights Report Component
// Displays structured weekly report on Sundays with glassmorphism styling

import React, { useState, useEffect, useCallback } from 'react';
import { useAgentStatus } from '../hooks/useAgentStatus';
import { useKitchenDigest } from '../hooks/useHearth';
import { useTasks } from '../hooks/useTasks';
import { useDreams } from '../hooks/useDreams';
import { useAuthContext } from '../contexts/AuthContext';
import InsightsCard from './InsightsCard';
import '../styles/weekly-insights.css';

interface WeeklyInsightsProps {
  onClose?: () => void;
}

interface WeeklyInsightsData {
  budget: {
    spentThisWeek: number;
    spentLastWeek: number;
    difference: number;
    differencePercent: number;
  };
  kitchen: {
    mealsCooked: number;
    topCuisine: string;
    varietyScore: number;
    savings: number;
  };
  life: {
    tasksCompleted: number;
    tasksTotal: number;
    completionPercent: number;
  };
  dreams: {
    activeGoals: number;
    goalsCompleted: number;
    progressAverage: number;
  };
}

export default function WeeklyInsights({ onClose }: WeeklyInsightsProps) {
  const { user } = useAuthContext();
  const userId = user?.id || '';

  // Check if it's Sunday
  const isSunday = useCallback(() => {
    const today = new Date();
    return today.getDay() === 0;
  }, []);

  // Check if already dismissed this week
  const getDismissedKey = useCallback(() => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    return `weekly-insights-dismissed-${weekStart.toISOString().split('T')[0]}`;
  }, []);

  const [isDismissed, setIsDismissed] = useState(() => {
    const key = getDismissedKey();
    return localStorage.getItem(key) === 'true';
  });

  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<WeeklyInsightsData | null>(null);
  const [recommendation, setRecommendation] = useState('');

  // Load data from hooks
  const { budgetSummary } = useAgentStatus(userId);
  const { digest } = useKitchenDigest(new Date().toISOString().split('T')[0]);
  const { grouped } = useTasks();
  const { dashboard: dreamsDashboard } = useDreams();

  // Calculate weekly spending (simplified - uses monthly data)
  const calculateWeeklySpending = useCallback((): { thisWeek: number; lastWeek: number } => {
    // In a real implementation, this would query weekly transaction data
    // For now, we'll estimate based on monthly data and current day of month
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dayOfMonth = today.getDate();
    const weeklyFactor = dayOfMonth / daysInMonth;

    if (!budgetSummary) {
      return { thisWeek: 0, lastWeek: 0 };
    }

    const monthlySpending = budgetSummary.totalExpenses;
    const estimatedWeeklySpending = monthlySpending / 4;

    // Simplified weekly comparison
    // In real implementation, would compare actual weekly data
    return {
      thisWeek: estimatedWeeklySpending * 0.95, // Placeholder
      lastWeek: estimatedWeeklySpending,
    };
  }, [budgetSummary]);

  // Generate insights data
  const generateInsights = useCallback(async (): Promise<WeeklyInsightsData | null> => {
    try {
      const weeklySpending = calculateWeeklySpending();
      const tasksCompleted = grouped.done?.length || 0;
      const tasksTotal = (grouped.pending?.length || 0) + (grouped.in_progress?.length || 0) + tasksCompleted;
      const tasksCompletionPercent = tasksTotal > 0 ? (tasksCompleted / tasksTotal) * 100 : 0;

      const activeDreams = dreamsDashboard?.dreams?.filter(d => d.status === 'active') || [];
      const completedDreams = dreamsDashboard?.dreams?.filter(d => d.status === 'completed') || [];
      const avgProgress = activeDreams.length > 0
        ? activeDreams.reduce((sum, d) => sum + (d.progress || 0), 0) / activeDreams.length
        : 0;

      return {
        budget: {
          spentThisWeek: weeklySpending.thisWeek,
          spentLastWeek: weeklySpending.lastWeek,
          difference: weeklySpending.thisWeek - weeklySpending.lastWeek,
          differencePercent: weeklySpending.lastWeek > 0
            ? ((weeklySpending.thisWeek - weeklySpending.lastWeek) / weeklySpending.lastWeek) * 100
            : 0,
        },
        kitchen: {
          mealsCooked: digest?.meals_cooked || 0,
          topCuisine: digest?.top_cuisine || 'N/A',
          varietyScore: digest?.variety_score || 0,
          savings: digest?.estimated_savings || 0,
        },
        life: {
          tasksCompleted,
          tasksTotal,
          completionPercent: tasksCompletionPercent,
        },
        dreams: {
          activeGoals: activeDreams.length,
          goalsCompleted: completedDreams.length,
          progressAverage: avgProgress,
        },
      };
    } catch (error) {
      console.error('Failed to generate weekly insights:', error);
      return null;
    }
  }, [calculateWeeklySpending, grouped, digest, dreamsDashboard]);

  // Generate recommendation based on data
  const generateRecommendation = useCallback((data: WeeklyInsightsData): string => {
    const recommendations: string[] = [];

    // Budget recommendation
    if (data.budget.difference > 0) {
      const percentOver = Math.round(data.budget.differencePercent);
      recommendations.push(`You're spending ${percentOver > 0 ? percentOver : 0}% more this week than last week. Consider reviewing your spending habits.`);
    } else if (data.budget.difference < 0) {
      recommendations.push(`Great job! You're spending less than last week. Consider putting the savings toward your goals.`);
    }

    // Kitchen recommendation
    if (data.kitchen.mealsCooked > 0) {
      recommendations.push(`You cooked ${data.kitchen.mealsCooked} meals this week${data.kitchen.topCuisine !== 'N/A' ? ` with ${data.kitchen.topCuisine} being your favorite cuisine` : ''}.`);
    }

    // Life recommendation
    if (data.life.tasksCompleted > 0) {
      const completionRate = Math.round(data.life.completionPercent);
      if (completionRate >= 80) {
        recommendations.push(`Excellent task completion rate of ${completionRate}%! Keep up the momentum.`);
      } else if (completionRate >= 50) {
        recommendations.push(`You completed ${completionRate}% of your tasks this week. Try focusing on high-priority items.`);
      } else {
        recommendations.push(`Consider prioritizing your tasks better to improve completion rate.`);
      }
    }

    // Dreams recommendation
    if (data.dreams.activeGoals > 0) {
      const avgProgressPercent = Math.round(data.dreams.progressAverage);
      recommendations.push(`You're ${avgProgressPercent}% through your active goals. Keep pushing toward those milestones!`);
    }

    return recommendations.join(' ');
  }, []);

  // Load insights when component mounts
  useEffect(() => {
    const loadInsights = async () => {
      setLoading(true);
      try {
        const data = await generateInsights();
        if (data) {
          setInsights(data);
          setRecommendation(generateRecommendation(data));
        }
      } catch (error) {
        console.error('Failed to load insights:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInsights();
  }, [generateInsights, generateRecommendation]);

  // Check if should show (only on Sunday or first open on Sunday)
  const shouldShow = !isDismissed && isSunday(); // Only show on Sundays

  const handleDismiss = useCallback(() => {
    const key = getDismissedKey();
    localStorage.setItem(key, 'true');
    setIsDismissed(true);
    if (onClose) {
      onClose();
    }
  }, [getDismissedKey, onClose]);

  if (!shouldShow) {
    return null;
  }

  if (loading) {
    return (
      <div className="weekly-insights-overlay">
        <div className="weekly-insights-container loading">
          <div className="loading-spinner">Loading weekly insights...</div>
        </div>
      </div>
    );
  }

  if (!insights) {
    return null;
  }

  return (
    <div className="weekly-insights-overlay">
      <div className="weekly-insights-container">
        {/* Header */}
        <div className="weekly-insights-header">
          <div className="header-content">
            <span className="header-icon">📅</span>
            <h2 className="header-title">Weekly Insights Report</h2>
            <span className="header-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </div>
          <button className="dismiss-button" onClick={handleDismiss} aria-label="Dismiss">
            ✕
          </button>
        </div>

        {/* Budget Section */}
        <div className="insights-section">
          <div className="section-header">
            <span className="section-icon">💰</span>
            <h3 className="section-title">Budget Summary</h3>
          </div>
          <div className="cards-grid">
            <InsightsCard
              data={{
                icon: '💳',
                title: 'Spent This Week',
                value: `$${insights.budget.spentThisWeek.toFixed(2)}`,
                trend: insights.budget.difference > 0 ? 'up' : 'down',
                color: '#ef4444',
              }}
              index={0}
            />
            <InsightsCard
              data={{
                icon: '📊',
                title: 'Last Week',
                value: `$${insights.budget.spentLastWeek.toFixed(2)}`,
                color: '#6366f1',
              }}
              index={1}
            />
            <InsightsCard
              data={{
                icon: '📈',
                title: 'Change',
                value: `${insights.budget.differencePercent > 0 ? '+' : ''}${insights.budget.differencePercent.toFixed(1)}%`,
                trend: insights.budget.difference > 0 ? 'up' : 'down',
                color: insights.budget.difference > 0 ? '#ef4444' : '#22c55e',
              }}
              index={2}
            />
          </div>
        </div>

        {/* Kitchen Section */}
        <div className="insights-section">
          <div className="section-header">
            <span className="section-icon">🍳</span>
            <h3 className="section-title">Kitchen Summary</h3>
          </div>
          <div className="cards-grid">
            <InsightsCard
              data={{
                icon: '👨‍🍳',
                title: 'Meals Cooked',
                value: `${insights.kitchen.mealsCooked}`,
                color: '#f59e0b',
              }}
              index={3}
            />
            <InsightsCard
              data={{
                icon: '🌍',
                title: 'Top Cuisine',
                value: insights.kitchen.topCuisine,
                color: '#8b5cf6',
              }}
              index={4}
            />
            <InsightsCard
              data={{
                icon: '🎯',
                title: 'Variety Score',
                value: `${insights.kitchen.varietyScore}/10`,
                color: '#06b6d4',
              }}
              index={5}
            />
          </div>
        </div>

        {/* Life Section */}
        <div className="insights-section">
          <div className="section-header">
            <span className="section-icon">🧠</span>
            <h3 className="section-title">Life Summary</h3>
          </div>
          <div className="cards-grid">
            <InsightsCard
              data={{
                icon: '✅',
                title: 'Tasks Completed',
                value: `${insights.life.tasksCompleted}/${insights.life.tasksTotal}`,
                trend: insights.life.completionPercent >= 50 ? 'up' : 'down',
                color: '#22c55e',
              }}
              index={6}
            />
            <InsightsCard
              data={{
                icon: '📊',
                title: 'Completion Rate',
                value: `${Math.round(insights.life.completionPercent)}%`,
                trend: insights.life.completionPercent >= 70 ? 'up' : insights.life.completionPercent >= 40 ? 'neutral' : 'down',
                color: '#22c55e',
              }}
              index={7}
            />
          </div>
        </div>

        {/* Dreams Section */}
        <div className="insights-section">
          <div className="section-header">
            <span className="section-icon">🎯</span>
            <h3 className="section-title">Dreams Summary</h3>
          </div>
          <div className="cards-grid">
            <InsightsCard
              data={{
                icon: '🏔️',
                title: 'Active Goals',
                value: `${insights.dreams.activeGoals}`,
                color: '#ec4899',
              }}
              index={8}
            />
            <InsightsCard
              data={{
                icon: '🏆',
                title: 'Goals Completed',
                value: `${insights.dreams.goalsCompleted}`,
                color: '#f59e0b',
              }}
              index={9}
            />
            <InsightsCard
              data={{
                icon: '📈',
                title: 'Avg Progress',
                value: `${Math.round(insights.dreams.progressAverage)}%`,
                trend: insights.dreams.progressAverage > 50 ? 'up' : 'down',
                color: '#8b5cf6',
              }}
              index={10}
            />
          </div>
        </div>

        {/* Recommendation Section */}
        <div className="recommendation-section">
          <div className="recommendation-header">
            <span className="recommendation-icon">💡</span>
            <h3 className="recommendation-title">Recommendation</h3>
          </div>
          <div className="recommendation-content">
            <p>{recommendation}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="weekly-insights-footer">
          <p>These insights are automatically generated every Sunday. You can dismiss this report until next week.</p>
        </div>
      </div>
    </div>
  );
}
