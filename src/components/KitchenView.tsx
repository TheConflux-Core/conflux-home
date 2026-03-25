// Conflux Home — Kitchen View (Hearth Overhaul)
// Home menu, meal library, weekly planner, smart grocery, pantry heatmap.

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useMeals, useWeeklyPlan, useGroceryList } from '../hooks/useKitchen';
import { useHomeMenu, useKitchenNudges, useKitchenDigest } from '../hooks/useHearth';
import { useFridgeScanner } from '../hooks/useFridgeScanner';
import type { Meal } from '../types';
import { MEAL_CATEGORIES, MEAL_CUISINES, MEAL_CATEGORY_EMOJI } from '../types';

import HearthHero from './HearthHero';
import HomeMenu from './HomeMenu';
import KitchenNudges from './KitchenNudges';
import KitchenDigestCard from './KitchenDigest';
import SmartGrocery from './SmartGrocery';
import PantryHeatmap from './PantryHeatmap';
import CookingMode from './CookingMode';

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

function formatCost(n: number | null): string {
  if (n == null) return '—';
  return `$${n.toFixed(2)}`;
}

const SLOTS = ['breakfast', 'lunch', 'dinner'] as const;

export default function KitchenView() {
  const [tab, setTab] = useState<'home' | 'library' | 'plan' | 'grocery' | 'pantry'>('home');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [filterCuisine, setFilterCuisine] = useState<string>('all');
  const [showFavorites, setShowFavorites] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [cookingMealId, setCookingMealId] = useState<string | null>(null);

  const weekStart = useMemo(getWeekStart, []);

  // Existing kitchen hooks
  const { meals, loading, addWithAI, toggleFavorite } = useMeals(
    filterCat === 'all' ? undefined : filterCat,
    filterCuisine === 'all' ? undefined : filterCuisine,
    showFavorites,
  );
  const { plan, setEntry } = useWeeklyPlan(weekStart);
  const { items: groceryItems, generate: generateGrocery, toggleItem, totalCost } = useGroceryList(weekStart);

  // New Hearth hooks
  const { menu: homeMenu, loading: menuLoading, load: loadHomeMenu } = useHomeMenu();
  const { nudges, load: loadNudges } = useKitchenNudges();
  const { digest, loading: digestLoading, load: loadDigest } = useKitchenDigest(weekStart);

  // Load home data on mount and when switching to home tab
  useEffect(() => {
    loadHomeMenu();
    loadNudges();
    loadDigest();
  }, [loadHomeMenu, loadNudges, loadDigest]);

  const handleAIAdd = useCallback(async () => {
    if (!aiPrompt.trim() || aiLoading) return;
    setAiLoading(true);
    try {
      const result = await addWithAI(aiPrompt);
      setAiPrompt('');
      setSelectedMeal(result.meal);
    } catch (e) {
      console.error('AI add failed:', e);
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, aiLoading, addWithAI]);

  const handleNudgeAction = useCallback((nudge: { nudge_type: string }) => {
    if (nudge.nudge_type === 'cook') setTab('library');
    else if (nudge.nudge_type === 'pantry') setTab('pantry');
    else if (nudge.nudge_type === 'grocery') setTab('grocery');
  }, []);

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="kitchen-view">
      {/* Header */}
      <div className="kitchen-header">
        <h2 className="kitchen-title">🔥 Hearth</h2>
        <div className="kitchen-tabs">
          <button className={`kitchen-tab ${tab === 'home' ? 'active' : ''}`} onClick={() => setTab('home')}>
            🏠 Home
          </button>
          <button className={`kitchen-tab ${tab === 'library' ? 'active' : ''}`} onClick={() => setTab('library')}>
            📖 Library
          </button>
          <button className={`kitchen-tab ${tab === 'plan' ? 'active' : ''}`} onClick={() => setTab('plan')}>
            📅 Week Plan
          </button>
          <button className={`kitchen-tab ${tab === 'grocery' ? 'active' : ''}`} onClick={() => setTab('grocery')}>
            🛒 Grocery
          </button>
          <button className={`kitchen-tab ${tab === 'pantry' ? 'active' : ''}`} onClick={() => setTab('pantry')}>
            🌡️ Pantry
          </button>
        </div>
      </div>

      {/* ── HOME TAB ── */}
      {tab === 'home' && (
        <div className="kitchen-home">
          <HearthHero
            nudges={nudges}
            onHomeMenu={() => setTab('library')}
            onPantryHeatmap={() => setTab('pantry')}
          />

          {menuLoading ? (
            <div className="kitchen-loading">Loading your kitchen...</div>
          ) : (
            <HomeMenu items={homeMenu} onSelect={(id) => setCookingMealId(id)} />
          )}

          <KitchenNudges nudges={nudges} onAction={handleNudgeAction} />

          {digest && !digestLoading && (
            <KitchenDigestCard digest={digest} />
          )}
        </div>
      )}

      {/* ── LIBRARY TAB ── */}
      {tab === 'library' && (
        <div className="kitchen-library">
          {/* AI Add */}
          <div className="kitchen-ai-add">
            <div className="ai-add-header">
              <span className="ai-add-icon">✨</span>
              <span>Add a meal with AI</span>
            </div>
            <div className="ai-add-row">
              <input
                type="text"
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAIAdd()}
                placeholder="Describe a meal... e.g., 'chicken parmesan with spaghetti'"
                className="ai-add-input"
              />
              <button className="btn-primary" onClick={handleAIAdd} disabled={aiLoading || !aiPrompt.trim()}>
                {aiLoading ? '✨ Creating...' : 'Add'}
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="kitchen-filters">
            <button className={`genre-btn ${!showFavorites ? 'active' : ''}`} onClick={() => setShowFavorites(false)}>
              All
            </button>
            <button className={`genre-btn ${showFavorites ? 'active' : ''}`} onClick={() => setShowFavorites(true)}>
              ⭐ Favorites
            </button>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="kitchen-select">
              <option value="all">All Categories</option>
              {MEAL_CATEGORIES.map(c => (
                <option key={c} value={c}>{MEAL_CATEGORY_EMOJI[c]} {c}</option>
              ))}
            </select>
            <select value={filterCuisine} onChange={e => setFilterCuisine(e.target.value)} className="kitchen-select">
              <option value="all">All Cuisines</option>
              {MEAL_CUISINES.map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Meal Grid */}
          {loading ? (
            <div className="kitchen-loading">Loading meals...</div>
          ) : meals.length === 0 ? (
            <div className="kitchen-empty">
              <p>No meals yet! Describe one above and I'll create it for you.</p>
              <p className="kitchen-empty-hint">Try: "spaghetti bolognese", "chicken tikka masala", "avocado toast"</p>
            </div>
          ) : (
            <div className="meal-grid">
              {meals.map(meal => (
                <div key={meal.id} className={`meal-card ${selectedMeal?.id === meal.id ? 'selected' : ''}`} onClick={() => setSelectedMeal(meal)}>
                  <div className="meal-card-header">
                    <span className="meal-card-emoji">
                      {meal.category ? MEAL_CATEGORY_EMOJI[meal.category] ?? '🍽️' : '🍽️'}
                    </span>
                    <button
                      className="meal-fav-btn"
                      onClick={e => { e.stopPropagation(); toggleFavorite(meal.id); }}
                    >
                      {meal.is_favorite ? '⭐' : '☆'}
                    </button>
                  </div>
                  <h3 className="meal-card-name">{meal.name}</h3>
                  {meal.description && <p className="meal-card-desc">{meal.description}</p>}
                  <div className="meal-card-meta">
                    {meal.prep_time_min && meal.cook_time_min && (
                      <span>⏱️ {meal.prep_time_min + meal.cook_time_min}min</span>
                    )}
                    {meal.cost_per_serving != null && (
                      <span>💰 {formatCost(meal.cost_per_serving)}/serving</span>
                    )}
                    <span>👥 {meal.servings}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Meal Detail Sidebar */}
          {selectedMeal && (
            <div className="meal-detail">
              <div className="meal-detail-header">
                <h3>{selectedMeal.name}</h3>
                <button className="modal-close" onClick={() => setSelectedMeal(null)}>✕</button>
              </div>
              {selectedMeal.description && <p className="meal-detail-desc">{selectedMeal.description}</p>}
              <div className="meal-detail-stats">
                {selectedMeal.prep_time_min && <div className="stat"><span className="stat-label">Prep</span><span>{selectedMeal.prep_time_min} min</span></div>}
                {selectedMeal.cook_time_min && <div className="stat"><span className="stat-label">Cook</span><span>{selectedMeal.cook_time_min} min</span></div>}
                <div className="stat"><span className="stat-label">Servings</span><span>{selectedMeal.servings}</span></div>
                {selectedMeal.estimated_cost != null && <div className="stat"><span className="stat-label">Total Cost</span><span>{formatCost(selectedMeal.estimated_cost)}</span></div>}
                {selectedMeal.cost_per_serving != null && <div className="stat"><span className="stat-label">Per Serving</span><span>{formatCost(selectedMeal.cost_per_serving)}</span></div>}
              </div>
              {selectedMeal.instructions && (
                <div className="meal-detail-section">
                  <h4>Instructions</h4>
                  <p className="meal-instructions">{selectedMeal.instructions}</p>
                </div>
              )}
              {selectedMeal.tags && (
                <div className="meal-detail-tags">
                  {(() => { try { return JSON.parse(selectedMeal.tags); } catch { return []; } })().map((t: string, i: number) => (
                    <span key={i} className="topic-tag">{t}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── WEEK PLAN TAB ── */}
      {tab === 'plan' && plan && (
        <div className="kitchen-plan">
          <div className="plan-header">
            <h3>Week of {new Date(weekStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</h3>
            <div className="plan-stats">
              <span>🍽️ {plan.meal_count} meals planned</span>
              <span>💰 Est. {formatCost(plan.total_estimated_cost)}</span>
            </div>
          </div>

          <div className="plan-grid">
            <div className="plan-grid-header">
              <div className="plan-slot-label"></div>
              {dayNames.map(d => (
                <div key={d} className="plan-day-header">{d}</div>
              ))}
            </div>

            {SLOTS.map(slot => (
              <div key={slot} className="plan-grid-row">
                <div className="plan-slot-label">{MEAL_CATEGORY_EMOJI[slot]} {slot}</div>
                {plan.days.map(day => {
                  const planSlot = day.slots.find(s => s.meal_slot === slot);
                  return (
                    <div key={day.day_of_week} className={`plan-cell ${planSlot?.meal ? 'filled' : 'empty'}`}>
                      {planSlot?.meal ? (
                        <div className="plan-meal-chip">
                          <span className="plan-meal-name">{planSlot.meal.name}</span>
                          {planSlot.meal.cost_per_serving != null && (
                            <span className="plan-meal-cost">{formatCost(planSlot.meal.cost_per_serving)}</span>
                          )}
                        </div>
                      ) : (
                        <button className="plan-add-btn" onClick={() => {
                          if (meals.length > 0) {
                            setEntry(day.day_of_week, slot, meals[0].id);
                          }
                        }}>
                          +
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── GROCERY TAB ── */}
      {tab === 'grocery' && (
        <div className="kitchen-grocery">
          <div className="grocery-header">
            <div className="grocery-actions">
              <span className="grocery-total">Est. total: <strong>{formatCost(totalCost)}</strong></span>
              <button className="btn-primary" onClick={generateGrocery}>
                ✨ Generate from Plan
              </button>
            </div>
          </div>

          {groceryItems.length === 0 ? (
            <div className="kitchen-empty">
              <p>No items yet. Plan some meals and click "Generate from Plan".</p>
            </div>
          ) : (
            <SmartGrocery items={groceryItems} onToggle={toggleItem} />
          )}
        </div>
      )}

      {/* ── PANTRY TAB ── */}
      {tab === 'pantry' && (
        <div className="kitchen-pantry">
          {/* Placeholder data until backend provides pantry items */}
          <PantryHeatmap items={[]} />
          <div className="kitchen-empty" style={{ marginTop: '1rem' }}>
            <p>🌡️ Connect your fridge scanner or add items to see pantry freshness.</p>
            <button className="btn-primary" onClick={() => setTab('library')}>
              Go to Fridge Scanner
            </button>
          </div>
        </div>
      )}

      {/* ── COOKING MODE OVERLAY ── */}
      {cookingMealId && (
        <CookingMode
          steps={[]}
          currentStep={0}
          onNext={() => {}}
          onPrev={() => {}}
          onClose={() => setCookingMealId(null)}
        />
      )}
    </div>
  );
}
