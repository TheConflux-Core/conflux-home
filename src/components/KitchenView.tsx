// Conflux Home — Kitchen View (Hearth Overhaul)
import { playSuccess } from '../lib/sound';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { useState, useCallback, useEffect, useMemo, useTransition } from 'react';
import { useMeals, useWeeklyPlan, useGroceryList } from '../hooks/useKitchen';
import { useHomeMenu, useKitchenNudges, useKitchenDigest, useTonightsMenu } from '../hooks/useHearth';
import { useFridgeScanner } from '../hooks/useFridgeScanner';
import type { MealMatchResult } from '../types';
import { useAuth } from '../hooks/useAuth';
import type { Meal, CookingStep } from '../types';
import { MEAL_CATEGORIES, MEAL_CUISINES, MEAL_CATEGORY_EMOJI } from '../types';

import KitchenNudges from './KitchenNudges';
import KitchenDigestCard from './KitchenDigest';
import SmartGrocery from './SmartGrocery';
import InventoryHeatmap from './InventoryHeatmap';
import HearthNutritionistView from './HearthNutritionistView';
import PantryHeatmap from './PantryHeatmap';
import CookingMode from './CookingMode';
import CookingModeEnhanced from './CookingModeEnhanced';
import RestaurantMenu from './RestaurantMenu';
import TonightHero from './TonightHero';
import WeeklyDigest from './WeeklyDigest';
import BrowseCards from './BrowseCards';
import { MicButton } from './voice';
import KitchenBoot from './KitchenBoot';
import HearthChat from './HearthChat';
import HearthOnboarding, { hasCompletedHearthOnboarding } from './HearthOnboarding';

import KitchenEmptyState from './KitchenEmptyState';
const NUTRITION_TIPS = [
  { emoji: '🔥', title: 'Protein First', body: 'Each meal should have a palm-sized portion of protein. It keeps you fuller longer and preserves muscle as you age.' },
  { emoji: '🥬', title: 'Eat the Rainbow', body: 'Colors in vegetables signal different nutrients. Aim for 3 different colors per day — especially leafy greens and orange/root veg.' },
  { emoji: '💧', title: 'Hydration Before Meals', body: 'Drink a full glass of water 15 minutes before eating. Improves digestion, reduces overeating, and supports every metabolic process.' },
  { emoji: '⏰', title: 'Meal Timing Matters', body: 'Eating within 2 hours of waking kickstarts your metabolism. Try to keep dinner light and finish at least 3 hours before sleep.' },
  { emoji: '🧂', title: 'Salt in the Kitchen', body: 'Lightly salt as you cook — it enhances flavor without the sodium hit of adding salt at the table. Your heart will thank you.' },
  { emoji: '🥜', title: 'Smart Snacking', body: 'Keep nuts and seeds handy. A small handful provides healthy fats, protein, and fiber that keep energy stable between meals.' },
];

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, week starts on Sunday
  const diff = now.getDate() - day;
  const sunday = new Date(now.setDate(diff));
  return sunday.toISOString().split('T')[0];
}

function formatCost(n: number | null): string {
  if (n == null) return '—';
  return `$${n.toFixed(2)}`;
}

const SLOTS = ['breakfast', 'lunch', 'dinner'] as const;

export default function KitchenView() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'home' | 'library' | 'plan' | 'grocery' | 'inventory' | 'nutritionist'>('home');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [filterCuisine, setFilterCuisine] = useState<string>('all');
  const [showFavorites, setShowFavorites] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  // Track AI loading separate from meals loading (for transition)
  const [aiLoading, setAiLoading] = useState(false);
  const [isPending, startAiTransition] = useTransition();
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [cookingMealId, setCookingMealId] = useState<string | null>(null);
  // Cooking mode step tracking (placeholder — wire to real steps when available)
  const [cookingSteps, setCookingSteps] = useState<CookingStep[]>([]);
  const [cookingCurrentStep, setCookingCurrentStep] = useState(0);

  // Boot → Onboarding → Tour state
  // bootDone persists across sessions (plays once ever).
  // showOnboarding: show if the user hasn't completed onboarding yet.
  // Boot sequence gates its own visibility; onboarding only renders after boot finishes.
  const [bootDone, setBootDone] = useState(() => localStorage.getItem('hearth-boot-done') === 'true');
  const hasOnboarded = hasCompletedHearthOnboarding();
  const [showOnboarding, setShowOnboarding] = useState(!hasOnboarded);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [showAddPantryItem, setShowAddPantryItem] = useState(false);
  const [inventoryAddLocation, setInventoryAddLocation] = useState<string | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanDescription, setScanDescription] = useState('');
  const [whatCanIMake, setWhatCanIMake] = useState<MealMatchResult | null>(null);
  const [shopForMealsItems, setShopForMealsItems] = useState<any[]>([]);
  const { scan, whatCanIMake: fetchWhatCanIMake, expiringSoon } = useFridgeScanner();
  // const [showKrogerExporter, setShowKrogerExporter] = useState(false); // KROGER_DISABLED

  // Week-plan inline meal picker: which cell is currently open for selection
  const [planPicker, setPlanPicker] = useState<{ day: number; slot: string } | null>(null);

  const [weekStart, setWeekStartState] = useState<string>(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day;
    const sunday = new Date(now.setDate(diff));
    return sunday.toISOString().split('T')[0];
  });

  const handleWeekChange = useCallback((newWeekStart: string) => {
    setWeekStartState(newWeekStart);
  }, []);

  // Existing kitchen hooks
  const { meals, loading, addWithAI, toggleFavorite, reload: reloadMeals, setMeals } = useMeals(
    filterCat === 'all' ? undefined : filterCat,
    filterCuisine === 'all' ? undefined : filterCuisine,
    showFavorites,
  );
  const { plan, setEntry } = useWeeklyPlan(weekStart);
  const { items: groceryItems, generate: generateGrocery, toggleItem, totalCost } = useGroceryList(weekStart);

  // New Hearth hooks
  const { tonight, loading: tonightLoading, load: loadTonightsMenu } = useTonightsMenu();
  const { menu: homeMenu, loading: menuLoading, load: loadHomeMenu } = useHomeMenu();
  const { nudges, load: loadNudges } = useKitchenNudges();
  const { digest, loading: digestLoading, load: loadDigest } = useKitchenDigest(weekStart);

  // Track whether initial meals load has completed (for empty state detection)
  const [mealsLoaded, setMealsLoaded] = useState(false);
  useEffect(() => {
    if (!loading) setMealsLoaded(true);
  }, [loading]);

  // Load home data on mount and when switching to home tab
  useEffect(() => {
    loadTonightsMenu();
    loadHomeMenu();
    loadNudges();
    loadDigest();
    // Load "what can I make" results
    fetchWhatCanIMake().then(setWhatCanIMake).catch(console.error);
  }, [loadTonightsMenu, loadHomeMenu, loadNudges, loadDigest, fetchWhatCanIMake]);


  // Listen for heartbeat beat events → refresh Kitchen data
  useEffect(() => {
    let ignore = false;
    const unlistenPromise = listen<null>('conflux:heartbeat-beat', () => {
      if (ignore) return;
      loadHomeMenu();
      loadNudges();
      loadDigest();
    });
    return () => {
      ignore = true;
      unlistenPromise.then(fn => fn());
    };
  }, [loadHomeMenu, loadNudges, loadDigest]);

  // Refresh Chef's Specials whenever meals change (covers adds from any tab)
  useEffect(() => {
    if (meals.length > 0) {
      loadHomeMenu();
    }
  }, [meals.length, loadHomeMenu]);

  // Load pantry inventory for Pantry tab
  const [pantryItems, setPantryItems] = useState<any[]>([]);
  useEffect(() => {
    const loadInventory = async () => {
      try {
        const inventory = await invoke<any[]>('kitchen_get_inventory', { location: null, member_id: user?.id || null });
        console.log('[KitchenView] Inventory loaded:', inventory.length, 'items');
        // Convert KitchenInventoryItem → PantryHeatItem
        const today = new Date();
        const heatItems = inventory.map((item: any) => {
          let daysUntilExpiry: number | null = null;
          let freshness = 1.0;
          if (item.expiry_date) {
            const expiry = new Date(item.expiry_date);
            daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            freshness = Math.max(0, Math.min(1, daysUntilExpiry / 30));
          }
          return {
            name: item.name,
            freshness,
            days_until_expiry: daysUntilExpiry,
            location: item.location || 'pantry',
          };
        });
        setPantryItems(heatItems);
      } catch (e) {
        console.error('[KitchenView] Failed to load inventory:', e);
      }
    };
    loadInventory();
  }, [user?.id]);

  const handleAIAdd = useCallback(async (description?: string) => {
    const text = description ?? aiPrompt;
    if (!text.trim() || aiLoading) return;
    setAiLoading(true);
    startAiTransition(async () => {
      try {
        const result = await addWithAI(text);
        if (!description) setAiPrompt('');
        setSelectedMeal(result.meal);
        await reloadMeals();
        playSuccess();
      } catch (e) {
        console.error('AI add failed:', e);
      } finally {
        setAiLoading(false);
      }
    });
  }, [aiPrompt, aiLoading, addWithAI, reloadMeals]);

  const handleNudgeAction = useCallback((nudge: { nudge_type: string }) => {
    if (nudge.nudge_type === 'cook') setTab('library');
    else if (nudge.nudge_type === 'pantry') setTab('inventory');
    else if (nudge.nudge_type === 'grocery') setTab('grocery');
  }, []);

  const handleStartCooking = useCallback(async (mealId: string) => {
    const meal = meals.find(m => m.id === mealId);
    if (meal) {
      try {
        const steps = await invoke<CookingStep[]>('kitchen_get_cooking_steps', { meal_id: mealId, member_id: null });
        setCookingSteps(steps);
        setCookingCurrentStep(0);
        setCookingMealId(mealId);
      } catch (e) {
        console.error('[KitchenView] Failed to load cooking steps:', e);
        setSelectedMeal(meal);
      }
    }
  }, [meals]);

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="kitchen-matrix" style={{ paddingTop: '50px', paddingBottom: '150px', paddingLeft: '121px', paddingRight: '121px' }}>
      {/* Background effects */}
      <div className="matrix-bg-effects" />

      {/* ── Boot Sequence ── */}
      {!bootDone && (
        <KitchenBoot
          onComplete={() => {
            localStorage.setItem('hearth-boot-done', 'true');
            setBootDone(true);
          }}
        />
      )}

      {/* ── Onboarding ── */}
      {bootDone && showOnboarding && !onboardingComplete && (
        <HearthOnboarding
          onComplete={(createdMeal) => {
            console.log('[KitchenView] onComplete called, createdMeal:', createdMeal?.name ?? 'UNDEFINED');
            console.log('[KitchenView] current meals before update:', meals.length);
            setOnboardingComplete(true);
            setShowOnboarding(false);
            if (createdMeal) {
              setMeals(prev => {
                console.log('[KitchenView] setMeals called with meal:', createdMeal.name, 'prev length:', prev.length);
                return [createdMeal, ...prev];
              });
              loadHomeMenu();
            } else {
              console.warn('[KitchenView] createdMeal was null/undefined, falling back to reloadMeals()');
              reloadMeals();
            }
          }}
        />
      )}



      {/* Header */}
      <div className="kitchen-header">
        <h2 className="kitchen-title">🔥 Hearth</h2>
        <div className="kitchen-tabs">
          <button data-tab="home" className={`kitchen-tab ${tab === 'home' ? 'active' : ''}`} onClick={() => setTab('home')}>
            🏠 Home
          </button>
          <button data-tab="library" className={`kitchen-tab ${tab === 'library' ? 'active' : ''}`} onClick={() => setTab('library')}>
            📖 Library
          </button>
          <button data-tab="plan" className={`kitchen-tab ${tab === 'plan' ? 'active' : ''}`} onClick={() => setTab('plan')}>
            📅 Week Plan
          </button>
          <button data-tab="grocery" className={`kitchen-tab ${tab === 'grocery' ? 'active' : ''}`} onClick={() => setTab('grocery')}>
            🛒 Grocery
          </button>
          <button data-tab="inventory" className={`kitchen-tab ${tab === 'inventory' ? 'active' : ''}`} onClick={() => setTab('inventory')}>
            📦 Inventory
          </button>
          <button data-tab="nutritionist" className={`kitchen-tab ${tab === 'nutritionist' ? 'active' : ''}`} onClick={() => setTab('nutritionist')}>
            🥗 Nutritionist
          </button>
        </div>
      </div>

      {/* ── HOME TAB ── */}
      {tab === 'home' && (
        <div className="kitchen-home">
          {/* Empty state — first run experience */}
          {mealsLoaded && meals.length === 0 ? (
            <KitchenEmptyState
              onAddMeal={async (desc) => {
                console.log('[KitchenView] onAddMeal START');
                setAiPrompt(desc);
                setAiLoading(true);
                console.log('[KitchenView] state set, starting transition');
                startAiTransition(async () => {
                  console.log('[KitchenView] transition running, calling addWithAI');
                  try {
                    const result = await addWithAI(desc);
                    console.log('[KitchenView] addWithAI done, updating state');
                    setAiPrompt('');
                    setSelectedMeal(result.meal);
                    console.log('[KitchenView] meal state set, reloading');
                    await reloadMeals();
                    console.log('[KitchenView] reloadMeals done');
                    loadHomeMenu();
                  } catch (e) {
                    console.error('[KitchenView] AI add failed:', e);
                  } finally {
                    console.log('[KitchenView] finally block, clearing aiLoading');
                    setAiLoading(false);
                  }
                });
                console.log('[KitchenView] onAddMeal END - transition started');
              }}
              onOpenLibrary={() => setTab('library')}
              isLoading={aiLoading}
            />
          ) : (
            <>
              {/* Tonight's Menu Hero */}
              <TonightHero
                tonight={tonight}
                loading={tonightLoading}
                onStartCooking={handleStartCooking}
                onSwap={loadTonightsMenu}
              />

              {/* Hearth NL Chat */}
              <HearthChat />

              {/* Restaurant Menu — Chef's Specials + Your Regulars */}
              <RestaurantMenu
                chefsSpecials={homeMenu}
                yourRegulars={meals.filter(m => m.is_favorite).slice(0, 6)}
                onSelect={(id) => {
                  const meal = meals.find(m => m.id === id);
                  if (meal) { setSelectedMeal(meal); setTab('library'); }
                }}
                loading={menuLoading}
              />

              <KitchenNudges nudges={nudges} onAction={handleNudgeAction} />

              {/* What Can I Make — based on current inventory */}
              {whatCanIMake && whatCanIMake.matches.length > 0 && (
                <div className="hearth-what-can-i-make">
                  <div className="wcm-header">
                    <span className="wcm-icon">🍽️</span>
                    <span className="wcm-title">What Can I Make?</span>
                    <span className="wcm-badge">{whatCanIMake.can_make_count} ready</span>
                  </div>
                  <div className="wcm-list">
                    {whatCanIMake.matches.slice(0, 5).map(m => (
                      <div key={m.meal_id} className={`wcm-item ${m.can_make ? 'wcm-ready' : 'wcm-missing'}`}
                        onClick={() => {
                          const meal = meals.find(me => me.id === m.meal_id);
                          if (meal) { setSelectedMeal(meal); setTab('library'); }
                        }}>
                        <span className="wcm-meal-name">{m.meal_name}</span>
                        {m.can_make ? (
                          <span className="wcm-ready-badge">✓ Ready</span>
                        ) : (
                          <span className="wcm-missing-label">{m.missing_ingredients.slice(0, 2).join(', ')}{m.missing_ingredients.length > 2 ? ` +${m.missing_ingredients.length - 2}` : ''}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {digest && !digestLoading && (
                <KitchenDigestCard digest={digest} />
              )}
            </>
          )}
        </div>
      )}

      {/* ── LIBRARY TAB ── */}
      {tab === 'library' && (
        <div className="kitchen-library">
          {/* AI Add Bar */}
          <div className="kitchen-ai-add">
            <div className="ai-add-header">
              <span className="ai-add-icon">✨</span>
              <span>Add a meal with AI</span>
            </div>
            <div className="ai-add-row">
              <div className="input-with-mic">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAIAdd()}
                  placeholder="Describe a meal... e.g., 'chicken parmesan with spaghetti'"
                  className="ai-add-input"
                />
                <MicButton
                  onTranscription={(text) => setAiPrompt(text)}
                  variant="inline"
                  size="sm"
                  className="mic-button-inline"
                />
              </div>
              <button className="btn-primary" onClick={() => handleAIAdd()} disabled={aiLoading || !aiPrompt.trim()}>
                {aiLoading ? '✨ Creating...' : 'Add'}
              </button>
            </div>
          </div>

          {/* Browse Cards — replaces old filter + grid */}
          <BrowseCards
            meals={meals}
            loading={loading}
            selectedCategory={filterCat}
            selectedCuisine={filterCuisine}
            showFavorites={showFavorites}
            onCategoryChange={setFilterCat}
            onCuisineChange={setFilterCuisine}
            onFavoritesToggle={() => setShowFavorites(!showFavorites)}
            onSelect={setSelectedMeal}
            onQuickAdd={(mealId) => {
              // Quick add to week plan — default to today's dinner
              const today = new Date().getDay();
              const dayIndex = today === 0 ? 6 : today - 1;
              setEntry(dayIndex, 'dinner', mealId);
              setTab('plan');
              playSuccess();
            }}
            pantryItems={[]}
          />

      {/* ── MEAL DETAIL MODAL ── */}
      {selectedMeal && (
        <div className="meal-modal-backdrop" onClick={() => setSelectedMeal(null)}>
          <div className="meal-modal" onClick={e => e.stopPropagation()}>
            <div className="meal-detail-header">
              <h3>{selectedMeal.name}</h3>
              <button className="modal-close" onClick={() => setSelectedMeal(null)}>✕</button>
            </div>
            {/* Meal Photo */}
            <div className="meal-detail-photo">
              {selectedMeal.photo_url ? (
                <img
                  src={selectedMeal.photo_url.startsWith('/') || /^[a-z]:/i.test(selectedMeal.photo_url)
                    ? convertFileSrc(selectedMeal.photo_url)
                    : selectedMeal.photo_url}
                  alt={selectedMeal.name ?? ''}
                  className="meal-detail-img"
                  onError={(e) => {
                    const target = e.currentTarget;
                    console.warn('[MealModal] Photo failed to load, showing emoji fallback');
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const emoji = parent.querySelector('.meal-detail-photo-emoji') as HTMLElement;
                      if (emoji) emoji.style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              <span className="meal-detail-photo-emoji" style={{ display: selectedMeal.photo_url ? 'none' : 'flex' }}>
                {MEAL_CATEGORY_EMOJI[selectedMeal.category ?? 'dinner'] ?? '🍽️'}
              </span>
            </div>
            <div className="meal-detail-photo-actions">
              <button
                className="replace-photo-btn"
                onClick={async () => {
                  try {
                    const selected = await open({
                      multiple: false,
                      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }],
                    });
                    if (selected && typeof selected === 'string') {
                      await invoke('kitchen_update_meal_photo', {
                        mealId: selectedMeal.id, photoUrl: selected,
                      });
                      await reloadMeals();
                      setSelectedMeal((prev: Meal | null) => prev ? { ...prev, photo_url: selected } : prev);
                    }
                  } catch (err) {
                    console.error('[KitchenView] Failed to upload photo:', err);
                  }
                }}
              >
                📷 Replace Photo
              </button>
              {selectedMeal.photo_url && (
                <button
                  className="remove-photo-btn"
                  onClick={async () => {
                    try {
                      await invoke('kitchen_update_meal_photo', { mealId: selectedMeal.id, photoUrl: '' });
                      await reloadMeals();
                      setSelectedMeal((prev: Meal | null) => prev ? { ...prev, photo_url: null } : prev);
                    } catch (err) {
                      console.error('[KitchenView] Failed to remove photo:', err);
                    }
                  }}
                >
                  ✕ Clear
                </button>
              )}
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
        </div>
      )}
        </div>
      )}

      {/* ── WEEK PLAN TAB ── */}
      {tab === 'plan' && (
        <div className="kitchen-plan">
          {plan ? (
            <WeeklyDigest
              plan={plan}
              meals={meals}
              loading={false}
              onSetEntry={setEntry}
              onShuffle={() => console.log('[Hearth] Shuffle week')}
              weekStart={weekStart}
              onWeekChange={handleWeekChange}
            />
          ) : (
            <div className="plan-loading">Loading your week plan...</div>
          )}
        </div>
      )}

      {/* ── GROCERY TAB ── */}
      {tab === 'grocery' && (
        <div className="kitchen-grocery">
          <div className="grocery-header">
            <div className="grocery-actions">
              <span className="grocery-total">Est. total: <strong>{formatCost(totalCost)}</strong></span>
              {/* <KrogerConnect /> */}
              {/* {groceryItems.length > 0 && (
                <button className="btn-primary" onClick={() => setShowKrogerExporter(true)}>
                  🛒 Add to Kroger
                </button>
              )} */}
              <button className="btn-primary" onClick={generateGrocery}>
                ✨ Generate from Plan
              </button>
              <button className="btn-ghost" onClick={async () => {
                try {
                  const items = await invoke<any[]>('fridge_shopping_for_meals');
                  setShopForMealsItems(items);
                } catch (e) {
                  console.error('Shopping for meals failed:', e);
                }
              }}>
                🛒 Shop for Meals
              </button>
            </div>
          </div>

          {groceryItems.length === 0 && shopForMealsItems.length === 0 ? (
            <div className="kitchen-empty">
              <p>No items yet. Plan some meals or scan your fridge to get started.</p>
            </div>
          ) : (
            <>
              {groceryItems.length > 0 && <SmartGrocery items={groceryItems} onToggle={toggleItem} />}
              {shopForMealsItems.length > 0 && (
                <div className="shop-for-meals-section">
                  <div className="section-header">
                    <span>🛒 Shop for Your Favorites</span>
                    <span className="section-sub">{shopForMealsItems.length} items from your favorite &amp; frequent meals</span>
                  </div>
                  <div className="shop-for-meals-list">
                    {shopForMealsItems.map((item: any) => (
                      <div key={item.id} className="shop-for-meals-item"
                        onClick={async () => {
                          try {
                            await invoke('kitchen_add_grocery_item', {
                              name: item.name,
                              quantity: item.quantity,
                              unit: item.unit,
                              category: item.category,
                              estimated_cost: item.estimated_cost,
                              week_start: weekStart,
                              member_id: user?.id || null,
                            });
                            setShopForMealsItems(prev => prev.filter((i: any) => i.id !== item.id));
                          } catch (e) {
                            console.error('Failed to add to grocery:', e);
                          }
                        }}
                      >
                        <div className="sfm-info">
                          <span className="sfm-name">{item.name}</span>
                          <span className="sfm-meta">{item.quantity ?? ''} {item.unit ?? ''} · {item.category ?? ''}</span>
                        </div>
                        <span className="sfm-cost">{item.estimated_cost != null ? `$${item.estimated_cost.toFixed(2)}` : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── INVENTORY TAB ── */}
      {tab === 'inventory' && (
        <div className="kitchen-pantry">
          <div className="inventory-header-actions">
            <button className="btn-primary" onClick={() => setShowScanModal(true)}>
              🧊 Scan My Fridge
            </button>
          </div>
          <InventoryHeatmap
            items={pantryItems}
            onAddItem={(location) => { setInventoryAddLocation(location); setShowAddPantryItem(true); }}
          />
        </div>
      )}

      {/* ── NUTRITIONIST TAB ── */}
      {tab === 'nutritionist' && (
        <HearthNutritionistView />
      )}

      {/* ── ADD ITEM MODAL ── */}
      {showAddPantryItem && (
        <div className="hearth-modal-backdrop" onClick={() => { setShowAddPantryItem(false); setInventoryAddLocation(null); }}>
          <div className="hearth-modal add-inventory-modal" onClick={e => e.stopPropagation()}>
            <div className="hearth-modal-header">
              <h3 className="hearth-modal-title">📦 Add to Inventory</h3>
              <button className="hearth-modal-close" onClick={() => { setShowAddPantryItem(false); setInventoryAddLocation(null); }}>✕</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const name = (form.elements.namedItem('name') as HTMLInputElement).value;
              if (!name) return;
              try {
                await invoke('kitchen_add_inventory', {
                  req: {
                    name,
                    quantity: parseFloat((form.elements.namedItem('quantity') as HTMLInputElement).value) || null,
                    unit: (form.elements.namedItem('unit') as HTMLInputElement).value || null,
                    category: (form.elements.namedItem('category') as HTMLInputElement).value || null,
                    expiry_date: (form.elements.namedItem('expiry_date') as HTMLInputElement).value || null,
                    location: (form.elements.namedItem('location') as HTMLInputElement).value || null,
                  },
                  member_id: user?.id || null,
                });
                setShowAddPantryItem(false);
                // Reload inventory
                const inventory = await invoke<any[]>('kitchen_get_inventory', { location: null, member_id: user?.id || null });
                const today = new Date();
                const heatItems = inventory.map((item: any) => {
                  let daysUntilExpiry: number | null = null;
                  let freshness = 1.0;
                  if (item.expiry_date) {
                    const expiryDate = new Date(item.expiry_date);
                    daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    freshness = Math.max(0, Math.min(1, daysUntilExpiry / 30));
                  }
                  return { name: item.name, freshness, days_until_expiry: daysUntilExpiry, location: item.location || 'pantry' };
                });
                setPantryItems(heatItems);
              } catch (err) {
                console.error('[KitchenView] Failed to add pantry item:', err);
              }
            }}>
              <div className="form-group">
                <label>Name *</label>
                <input name="name" type="text" required placeholder="e.g. Chicken breast" className="form-input" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Quantity</label>
                  <input name="quantity" type="number" step="any" placeholder="2" className="form-input" />
                </div>
                <div className="form-group">
                  <label>Unit</label>
                  <input name="unit" type="text" placeholder="pieces" className="form-input" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select name="category" className="form-select">
                    <option value="">Select...</option>
                    <option value="produce">🍎 Produce</option>
                    <option value="dairy">🥛 Dairy</option>
                    <option value="meat">🥩 Meat</option>
                    <option value="pantry">🥫 Pantry</option>
                    <option value="frozen">🧊 Frozen</option>
                    <option value="spice">🌿 Spice</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <select name="location" className="form-select" defaultValue={inventoryAddLocation ?? undefined}>
                    <option value="">Select...</option>
                    <option value="fridge">🧊 Fridge</option>
                    <option value="freezer">❄️ Freezer</option>
                    <option value="pantry">🏠 Pantry</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Expiry Date</label>
                <input name="expiry_date" type="date" className="form-input" />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-ghost" onClick={() => { setShowAddPantryItem(false); setInventoryAddLocation(null); }}>Cancel</button>
                <button type="submit" className="btn-primary">Add Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SCAN FRIDGE MODAL ── */}
      {showScanModal && (
        <div className="hearth-modal-backdrop" onClick={() => setShowScanModal(false)}>
          <div className="hearth-modal scan-modal" onClick={e => e.stopPropagation()}>
            <div className="hearth-modal-header">
              <h3 className="hearth-modal-title">🧊 Scan My Fridge</h3>
              <button className="hearth-modal-close" onClick={() => setShowScanModal(false)}>✕</button>
            </div>
            <div className="scan-modal-body">
              <p className="scan-description">Describe everything you see in your fridge, freezer, or pantry. Hearth will identify items and add them to your inventory.</p>
              <textarea
                className="scan-textarea"
                placeholder="e.g. I have half a carton of eggs, some sliced cheese, a bottle of salsa, leftover rice in a container, and a few apples in the door..."
                value={scanDescription}
                onChange={e => setScanDescription(e.target.value)}
                rows={5}
              />
              <div className="scan-actions">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => { setShowScanModal(false); setScanDescription(''); }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!scanDescription.trim()}
                  onClick={async () => {
                    if (!scanDescription.trim()) return;
                    try {
                      const result = await scan(scanDescription);
                      // Reload inventory + what-can-i-make
                      const inventory = await invoke<any[]>('kitchen_get_inventory', { location: null, member_id: user?.id || null });
                      const today = new Date();
                      const heatItems = inventory.map((item: any) => {
                        let daysUntilExpiry: number | null = null;
                        let freshness = 1.0;
                        if (item.expiry_date) {
                          const expiryDate = new Date(item.expiry_date);
                          daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                          freshness = Math.max(0, Math.min(1, daysUntilExpiry / 30));
                        }
                        return { name: item.name, freshness, days_until_expiry: daysUntilExpiry, location: item.location || 'pantry' };
                      });
                      setPantryItems(heatItems);
                      const wcm = await fetchWhatCanIMake();
                      setWhatCanIMake(wcm);
                      setShowScanModal(false);
                      setScanDescription('');
                    } catch (err) {
                      console.error('[KitchenView] Scan failed:', err);
                    }
                  }}
                >
                  🧊 Scan &amp; Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── COOKING MODE OVERLAY — Enhanced ── */}
      {cookingMealId && (
        <CookingModeEnhanced
          steps={cookingSteps}
          currentStep={cookingCurrentStep}
          onNext={() => setCookingCurrentStep(prev => Math.min(prev + 1, cookingSteps.length - 1))}
          onPrev={() => setCookingCurrentStep(prev => Math.max(prev - 1, 0))}
          onClose={() => setCookingMealId(null)}
          autoAdvance={true}
        />
      )}

      {/* ── KROGER CART EXPORTER ── */}
      {/*
      {showKrogerExporter && (
        <KrogerCartExporter
          groceryItems={groceryItems}
          onClose={() => setShowKrogerExporter(false)}
        />
      )}
      */}
    </div>
  );
}
