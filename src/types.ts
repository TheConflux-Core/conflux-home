// Conflux Home — Type Definitions

export interface Agent {
  id: string;
  name: string;
  emoji: string;
  role: string;
  description: string;
  status: 'idle' | 'working' | 'thinking' | 'error' | 'offline';
  model: string;
  personality?: string;
  currentTask?: string;
  lastActive?: string;
  memorySize?: number; // KB of memory stored
  installedAt?: string;
}

export interface AgentMessage {
  id: string;
  agentId: string;
  content: string;
  timestamp: string;
  type: 'user' | 'agent' | 'system';
}

export interface AgentTemplate {
  id: string;
  name: string;
  emoji: string;
  category: 'work' | 'life' | 'creative' | 'fun' | 'expert';
  role: string;
  description: string;
  personality: string;
  skills: string[];
  modelRecommendation: string;
  installed: boolean;
}

export interface PipelineStatus {
  activeAgents: number;
  tasksRunning: number;
  tasksCompleted: number;
  memoryUsed: string;
  uptime: string;
}

export type View = 'dashboard' | 'chat' | 'google' | 'marketplace' | 'settings' | 'onboarding' | 'games' | 'agents' | 'kitchen' | 'budget' | 'feed' | 'life' | 'home' | 'dreams' | 'echo';

// Agent accent colors for avatar rendering
export const AGENT_COLORS: Record<string, string> = {
  conflux: '#00d4ff',    // cyan blue
  helix: '#00cc88',     // emerald green
  forge: '#ff8844',     // warm orange
  quanta: '#aabbff',    // cool blue
  prism: '#ff66cc',     // pink/magenta
  pulse: '#cc44ff',     // purple
  vector: '#ff6633',    // red-orange
  spectra: '#4488ff',   // royal blue
  luma: '#44ddff',      // bright cyan
  catalyst: '#ffcc00',  // gold/yellow
};

// ── Family Profiles ──

export type AgeGroup = 'toddler' | 'preschool' | 'kid' | 'teen' | 'young_adult' | 'adult';

export const AGE_GROUP_CONFIG: Record<AgeGroup, { label: string; ageRange: string; emoji: string; color: string }> = {
  toddler:     { label: 'Tiny Learner', ageRange: '1-2',  emoji: '🧸', color: '#f59e0b' },
  preschool:   { label: 'Preschool',    ageRange: '2-5',  emoji: '🌈', color: '#ec4899' },
  kid:         { label: 'Kid',          ageRange: '5-13', emoji: '🎮', color: '#8b5cf6' },
  teen:        { label: 'Teen',         ageRange: '13-18', emoji: '📱', color: '#3b82f6' },
  young_adult: { label: 'Young Adult',  ageRange: '19-29', emoji: '💼', color: '#10b981' },
  adult:       { label: 'Adult',        ageRange: '30+',  emoji: '🏠', color: '#6366f1' },
};

export interface FamilyMember {
  id: string;
  name: string;
  age: number | null;
  age_group: AgeGroup;
  avatar: string | null;
  color: string;
  default_agent_id: string | null;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateFamilyMemberRequest {
  name: string;
  age?: number;
  age_group: AgeGroup;
  avatar?: string;
  color?: string;
  default_agent_id?: string;
  parent_id?: string;
}

// ── Agent Templates (from DB) ──

export interface AgentTemplateDB {
  id: string;
  name: string;
  emoji: string;
  description: string;
  age_group: AgeGroup;
  soul: string;
  instructions: string;
  model_alias: string;
  category: string;
  is_system: boolean;
  created_at: string;
}

// ── Story Games ──

export type StoryGenre = 'adventure' | 'mystery' | 'fantasy' | 'scifi' | 'horror';
export type StoryDifficulty = 'easy' | 'normal' | 'hard';
export type PuzzleType = 'riddle' | 'pattern' | 'logic' | 'word' | 'code';

export const GENRE_CONFIG: Record<StoryGenre, { label: string; emoji: string }> = {
  adventure: { label: 'Adventure', emoji: '⚔️' },
  mystery:   { label: 'Mystery',   emoji: '🔍' },
  fantasy:   { label: 'Fantasy',   emoji: '🐉' },
  scifi:     { label: 'Sci-Fi',    emoji: '🚀' },
  horror:    { label: 'Horror',    emoji: '👻' },
};

export interface StoryGame {
  id: string;
  member_id: string | null;
  agent_id: string;
  title: string;
  genre: StoryGenre;
  age_group: AgeGroup;
  difficulty: StoryDifficulty;
  status: 'active' | 'completed' | 'paused';
  current_chapter: number;
  story_state: string | null;  // JSON
  created_at: string;
  updated_at: string;
}

export interface StoryChoice {
  id: string;
  text: string;
  consequence_hint?: string;
}

export interface StoryPuzzle {
  puzzle_type: PuzzleType;
  question: string;
  answer: string;
  hint?: string;
}

export interface StoryChapter {
  id: string;
  game_id: string;
  chapter_number: number;
  title: string | null;
  narrative: string;
  choices: string;  // JSON array of StoryChoice
  puzzle: string | null;  // JSON of StoryPuzzle
  puzzle_solved: boolean;
  image_prompt: string | null;
  image_url: string | null;
  chosen_choice_id: string | null;
  created_at: string;
}

export interface StorySeed {
  id: string;
  title: string;
  genre: StoryGenre;
  age_group: AgeGroup;
  difficulty: StoryDifficulty;
  opening: string;
  initial_choices: string;  // JSON
  world_template: string;   // JSON
  puzzle_types: string;     // JSON
  created_at: string;
}

export interface CreateStoryGameRequest {
  member_id?: string;
  title: string;
  genre: StoryGenre;
  age_group: AgeGroup;
  difficulty?: StoryDifficulty;
}

// ── Snake Game ─────────────────────────────────────────────

export type SnakeDirection = 'up' | 'down' | 'left' | 'right';

export type SnakeDifficulty = 'classic' | 'zen' | 'challenge' | 'speedrun';

export interface SnakePoint {
  x: number;
  y: number;
}

export interface SnakeGameConfig {
  gridSize: number;       // 20 for standard
  cellSize: number;       // 20px per cell
  baseSpeed: number;      // ms per tick at start
  speedIncrement: number; // ms faster per food eaten
  minSpeed: number;       // fastest possible (ms)
  wallsKill: boolean;     // false = wrap, true = death
  hasObstacles: boolean;  // challenge mode
  label: string;
  meta: string;
  icon: string;
}

export interface SnakeScore {
  score: number;
  difficulty: SnakeDifficulty;
  date: string;           // ISO timestamp
}

export interface SnakeGameState {
  snake: SnakePoint[];
  food: SnakePoint;
  direction: SnakeDirection;
  nextDirection: SnakeDirection;
  score: number;
  bestScore: number;
  speed: number;
  status: 'idle' | 'playing' | 'paused' | 'dead';
  obstacles: SnakePoint[];
}

// ── Learning Tracking ──

export type ActivityType = 'reading' | 'math' | 'science' | 'coding' | 'creative' | 'language' | 'life_skills' | 'story' | 'game';

export const ACTIVITY_CONFIG: Record<ActivityType, { label: string; emoji: string; color: string }> = {
  reading:     { label: 'Reading',     emoji: '📖', color: '#3b82f6' },
  math:        { label: 'Math',        emoji: '🔢', color: '#8b5cf6' },
  science:     { label: 'Science',     emoji: '🔬', color: '#10b981' },
  coding:      { label: 'Coding',      emoji: '💻', color: '#f59e0b' },
  creative:    { label: 'Creative',    emoji: '🎨', color: '#ec4899' },
  language:    { label: 'Language',    emoji: '🌍', color: '#06b6d4' },
  life_skills: { label: 'Life Skills', emoji: '🛠️', color: '#ef4444' },
  story:       { label: 'Stories',     emoji: '📚', color: '#6366f1' },
  game:        { label: 'Games',       emoji: '🎮', color: '#a855f7' },
};

export interface LearningActivity {
  id: string;
  member_id: string;
  agent_id: string;
  session_id: string | null;
  activity_type: ActivityType;
  topic: string | null;
  description: string | null;
  difficulty: string | null;
  score: number | null;
  duration_sec: number | null;
  tokens_used: number;
  metadata: string | null;
  created_at: string;
}

export interface LearningGoal {
  id: string;
  member_id: string;
  goal_type: 'streak' | 'mastery' | 'exploration' | 'custom';
  activity_type: string | null;
  title: string;
  target_value: number;
  current_value: number;
  unit: string | null;
  deadline: string | null;
  is_complete: boolean;
  created_at: string;
  completed_at: string | null;
}

export interface ActivityCount {
  activity_type: string;
  count: number;
  total_minutes: number;
}

export interface DailyActivity {
  date: string;
  count: number;
  minutes: number;
}

export interface LearningProgress {
  member_id: string;
  member_name: string;
  total_activities: number;
  total_minutes: number;
  current_streak_days: number;
  longest_streak_days: number;
  activities_by_type: ActivityCount[];
  recent_topics: string[];
  average_score: number | null;
  goals: LearningGoal[];
  weekly_summary: DailyActivity[];
}

export interface LogActivityRequest {
  member_id: string;
  agent_id: string;
  session_id?: string;
  activity_type: ActivityType;
  topic?: string;
  description?: string;
  difficulty?: string;
  score?: number;
  duration_sec?: number;
  metadata?: string;
}

// ── Smart Kitchen ──

export interface Meal {
  id: string;
  name: string;
  description: string | null;
  cuisine: string | null;
  category: string | null;
  photo_url: string | null;
  prep_time_min: number | null;
  cook_time_min: number | null;
  servings: number;
  difficulty: string;
  instructions: string | null;
  estimated_cost: number | null;
  cost_per_serving: number | null;
  calories: number | null;
  tags: string | null;
  source: string;
  is_favorite: boolean;
  last_made: string | null;
  times_made: number;
  created_at: string;
  updated_at: string;
}

export interface MealIngredient {
  id: string;
  meal_id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  estimated_cost: number | null;
  category: string | null;
  is_optional: boolean;
  notes: string | null;
  sort_order: number;
}

export interface MealWithIngredients {
  meal: Meal;
  ingredients: MealIngredient[];
}

export interface WeeklyPlan {
  week_start: string;
  days: DayPlan[];
  total_estimated_cost: number;
  meal_count: number;
}

export interface DayPlan {
  day_of_week: number;
  day_name: string;
  slots: PlanSlot[];
}

export interface PlanSlot {
  meal_slot: string;
  meal: Meal | null;
  notes: string | null;
}

export interface GroceryItem {
  id: string;
  member_id: string | null;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  estimated_cost: number | null;
  is_checked: boolean;
  source_meal_id: string | null;
  week_start: string | null;
  created_at: string;
}

export const MEAL_CATEGORIES = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'] as const;
export const MEAL_CUISINES = ['american', 'italian', 'mexican', 'asian', 'indian', 'mediterranean', 'french', 'thai', 'japanese', 'other'] as const;

export const MEAL_CATEGORY_EMOJI: Record<string, string> = {
  breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍿', dessert: '🍰',
};

export const INGREDIENT_CATEGORIES: Record<string, string> = {
  produce: '🥬 Produce', dairy: '🥛 Dairy', meat: '🥩 Meat', pantry: '🏪 Pantry',
  spice: '🧂 Spices', frozen: '🧊 Frozen', bakery: '🍞 Bakery', seafood: '🐟 Seafood',
};

// ── Budget Tracker ──

export interface BudgetEntry {
  id: string;
  member_id: string | null;
  entry_type: 'income' | 'expense' | 'savings' | 'goal';
  category: string;
  amount: number;
  description: string | null;
  recurring: boolean;
  frequency: string | null;
  date: string;
  created_at: string;
}

export interface CategoryTotal {
  category: string;
  total: number;
}

export interface BudgetSummary {
  month: string;
  total_income: number;
  total_expenses: number;
  total_savings: number;
  net: number;
  categories: CategoryTotal[];
}

export const EXPENSE_CATEGORIES = [
  { id: 'housing', label: '🏠 Housing', color: '#ef4444' },
  { id: 'groceries', label: '🛒 Groceries', color: '#f59e0b' },
  { id: 'transportation', label: '🚗 Transportation', color: '#3b82f6' },
  { id: 'utilities', label: '💡 Utilities', color: '#8b5cf6' },
  { id: 'healthcare', label: '🏥 Healthcare', color: '#ec4899' },
  { id: 'dining', label: '🍽️ Dining Out', color: '#10b981' },
  { id: 'entertainment', label: '🎬 Entertainment', color: '#06b6d4' },
  { id: 'shopping', label: '🛍️ Shopping', color: '#f97316' },
  { id: 'subscriptions', label: '📱 Subscriptions', color: '#a855f7' },
  { id: 'education', label: '📚 Education', color: '#14b8a6' },
  { id: 'personal', label: '💅 Personal Care', color: '#ec4899' },
  { id: 'other', label: '📦 Other', color: '#6b7280' },
];

export const INCOME_CATEGORIES = [
  { id: 'salary', label: '💰 Salary', color: '#10b981' },
  { id: 'freelance', label: '💻 Freelance', color: '#3b82f6' },
  { id: 'business', label: '🏢 Business', color: '#8b5cf6' },
  { id: 'investments', label: '📈 Investments', color: '#f59e0b' },
  { id: 'other_income', label: '💵 Other', color: '#6b7280' },
];

// ── Echo Types ──

export type EchoMood = 'great' | 'good' | 'okay' | 'bad' | 'terrible';

export interface EchoEntry {
  id: string;
  content: string;
  mood: EchoMood | null;
  tags: string[];
  is_voice: boolean;
  word_count: number;
  created_at: string;
  updated_at: string;
}

export interface EchoPattern {
  id: string;
  pattern_type: 'mood' | 'topic' | 'time' | 'frequency';
  title: string;
  description: string;
  confidence: number;
  data_json: string | null;
  created_at: string;
}

export interface EchoDigest {
  id: string;
  week_start: string;
  summary: string;
  themes: string[];
  mood_trajectory: (EchoMood | null)[];
  highlights: string[];
  created_at: string;
}

export interface EchoDailyBrief {
  today_entries: EchoEntry[];
  total_entries: number;
  current_streak: number;
  avg_words_per_entry: number;
  top_mood: EchoMood | null;
  recent_themes: string[];
}

export interface EchoWriteRequest {
  content: string;
  mood?: EchoMood;
  tags?: string[];
  is_voice?: boolean;
}

export const ECHO_MOOD_CONFIG: Record<EchoMood, { emoji: string; label: string; color: string }> = {
  great: { emoji: '😊', label: 'Great', color: '#22c55e' },
  good: { emoji: '🙂', label: 'Good', color: '#84cc16' },
  okay: { emoji: '😐', label: 'Okay', color: '#eab308' },
  bad: { emoji: '😔', label: 'Bad', color: '#f97316' },
  terrible: { emoji: '😢', label: 'Terrible', color: '#ef4444' },
};

// ── Content Feed ──

export interface ContentFeedItem {
  id: string;
  member_id: string | null;
  content_type: 'news' | 'tip' | 'challenge' | 'fun_fact' | 'reminder';
  title: string;
  body: string;
  source_url: string | null;
  category: string | null;
  is_read: boolean;
  is_bookmarked: boolean;
  created_at: string;
  expires_at: string | null;
}

export const FEED_TYPE_CONFIG: Record<string, { emoji: string; color: string }> = {
  news:        { emoji: '📰', color: '#3b82f6' },
  tip:         { emoji: '💡', color: '#f59e0b' },
  challenge:   { emoji: '🎯', color: '#ef4444' },
  fun_fact:    { emoji: '🤯', color: '#8b5cf6' },
  reminder:    { emoji: '⏰', color: '#10b981' },
  intelligence:{ emoji: '🧠', color: '#06b6d4' },
};

// ── Current — Intelligence Briefing ──

export interface BriefingItem {
  title: string;
  summary: string;
  relevance_score: number; // 1-100
  why_it_matters: string;
  category: string;
  icon: string; // emoji
  source_url?: string;
}

export interface DailyBriefing {
  id: string;
  greeting: string;
  items: BriefingItem[];
  generated_at: string;
}

export interface RippleSignal {
  id: string;
  title: string;
  description: string;
  confidence: number; // 1-100
  category: string;
  why_it_could_matter: string;
  detected_at: string;
  sources: string[]; // JSON string from Rust, parsed to array
}

export interface SignalThreadEntry {
  date: string;
  summary: string;
  source_url?: string;
}

export interface SignalThread {
  id: string;
  topic: string;
  summary: string;
  key_developments: string[]; // JSON string from Rust
  prediction: string;
  prediction_confidence: number;
  entries: SignalThreadEntry[]; // JSON string from Rust
  entries_count: number;
  created_at: string;
  updated_at: string;
}

export interface QuestionResult {
  id: string;
  question: string;
  answer: string;
  key_points: string[]; // JSON string from Rust
  sources: string[]; // JSON string from Rust
  confidence_level: 'high' | 'medium' | 'low';
  asked_at: string;
}

export interface CategoryDistribution {
  category: string;
  percentage: number;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

export interface CognitivePattern {
  id: string;
  time_range: string;
  category_distribution: CategoryDistribution[]; // JSON string from Rust
  tone_trend: string;
  blind_spots: string[]; // JSON string from Rust
  focus_shift: string;
  recommendation: string;
  analyzed_at: string;
}

// ── Fridge Scanner ──

export interface KitchenInventoryItem {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  expiry_date: string | null;
  location: string | null;
  last_restocked: string | null;
  created_at: string;
  updated_at: string;
}

export interface FridgeScanResult {
  items: KitchenInventoryItem[];
  summary: string;
  waste_risk: string[];
  suggested_meals: string[];
}

export interface MealMatch {
  meal_id: string;
  meal_name: string;
  have_count: number;
  total_count: number;
  match_pct: number;
  missing_ingredients: string[];
  can_make: boolean;
}

export interface MealMatchResult {
  matches: MealMatch[];
  total_inventory_items: number;
  can_make_count: number;
}

// ── Life Autopilot ──

export interface LifeDocument {
  id: string;
  member_id: string | null;
  doc_type: string;
  title: string;
  content: string | null;
  ai_summary: string | null;
  ai_key_dates: string | null;
  ai_action_items: string | null;
  source: string;
  file_url: string | null;
  tags: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface LifeReminder {
  id: string;
  member_id: string | null;
  document_id: string | null;
  reminder_type: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: string;
  is_dismissed: boolean;
  is_completed: boolean;
  recurring: boolean;
  frequency: string | null;
  created_at: string;
}

export interface LifeKnowledge {
  id: string;
  member_id: string | null;
  category: string;
  key: string;
  value: string;
  source_doc_id: string | null;
  confidence: number;
  created_at: string;
  updated_at: string;
}

export interface LifeAutopilotDashboard {
  upcoming_reminders: LifeReminder[];
  recent_documents: LifeDocument[];
  knowledge_count: number;
  documents_count: number;
  overdue_reminders: LifeReminder[];
}

// ── Home Health ──

export interface HomeProfile {
  id: string;
  address: string | null;
  year_built: number | null;
  square_feet: number | null;
  hvac_type: string | null;
  hvac_filter_size: string | null;
  water_heater_type: string | null;
  roof_type: string | null;
  window_type: string | null;
  insulation_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface HomeBill {
  id: string;
  bill_type: string;
  amount: number;
  usage: number | null;
  billing_month: string;
  notes: string | null;
  created_at: string;
}

export interface HomeMaintenance {
  id: string;
  task: string;
  category: string;
  last_completed: string | null;
  interval_months: number | null;
  next_due: string | null;
  priority: string;
  estimated_cost: number | null;
  notes: string | null;
  created_at: string;
}

export interface HomeAppliance {
  id: string;
  name: string;
  category: string;
  model: string | null;
  installed_date: string | null;
  expected_lifespan_years: number | null;
  warranty_expiry: string | null;
  estimated_replacement_cost: number | null;
  notes: string | null;
  last_service: string | null;
  next_service: string | null;
  created_at: string;
}

export interface BillTrendPoint {
  month: string;
  electric: number | null;
  gas: number | null;
  water: number | null;
  total: number;
}

export interface HomeDashboard {
  profile: HomeProfile | null;
  upcoming_maintenance: HomeMaintenance[];
  overdue_maintenance: HomeMaintenance[];
  appliances_needing_service: HomeAppliance[];
  bill_trend: BillTrendPoint[];
  total_monthly_utilities: number;
  health_score: number;
  ai_alerts: string[];
}

export interface HomeInsight {
  title: string;
  description: string;
  estimated_impact: string | null;
  priority: string;
  category: string;
  insight_category?: 'diagnosis' | 'prediction' | 'anomaly' | 'seasonal' | 'warranty';
  urgency?: 'immediate' | 'this_week' | 'this_month' | 'routine';
  action_steps?: string[];
  estimated_cost?: { low: number; high: number };
}

// ── Dream Builder ──

export interface Dream {
  id: string;
  member_id: string | null;
  title: string;
  description: string | null;
  category: string;
  target_date: string | null;
  status: string;
  progress: number;
  ai_plan: string | null;
  ai_next_actions: string | null;
  created_at: string;
  updated_at: string;
}

export interface DreamMilestone {
  id: string;
  dream_id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  completed_at: string | null;
  is_completed: boolean;
  sort_order: number;
  created_at: string;
}

export interface DreamTask {
  id: string;
  dream_id: string;
  milestone_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  completed_at: string | null;
  is_completed: boolean;
  frequency: string | null;
  created_at: string;
}

export interface DreamProgress {
  id: string;
  dream_id: string;
  note: string | null;
  progress_change: number | null;
  ai_insight: string | null;
  created_at: string;
}

export interface DreamDashboard {
  dreams: Dream[];
  active_dreams: number;
  total_milestones: number;
  completed_milestones: number;
  upcoming_tasks: DreamTask[];
  recent_progress: DreamProgress[];
}

// ── Dreams: Horizon ──

export interface DreamVelocity {
  dream_id: string;
  milestones_completed: number;
  milestones_total: number;
  tasks_completed: number;
  tasks_total: number;
  progress_pct: number;
  pace: string;
  days_remaining: number | null;
  estimated_completion: string | null;
}

export interface TimelineEntry {
  date: string;
  event_type: string;
  title: string;
  completed: boolean;
}

export interface DreamTimeline {
  dream_id: string;
  entries: TimelineEntry[];
  total_entries: number;
  completed_entries: number;
}

// ── Agent Diary ──

export interface DiaryEntry {
  id: string;
  agent_id: string;
  entry_date: string;
  title: string | null;
  content: string;
  mood: string;
  topics_discussed: string | null;
  memorable_moment: string | null;
  word_count: number;
  created_at: string;
}

export interface MoodCount {
  mood: string;
  count: number;
}

export interface DiaryDashboard {
  total_entries: number;
  entries_this_week: number;
  mood_distribution: MoodCount[];
  most_active_agent: string | null;
  latest_entries: DiaryEntry[];
  agents_with_entries: string[];
}

// ── Kitchen Hearth ──

export interface MealPhoto {
  id: string;
  meal_id: string;
  photo_url: string;
  caption: string | null;
  ai_tags: string | null;
  taken_at: string | null;
  created_at: string;
}

export interface HomeMenuItem {
  meal_id: string;
  name: string;
  emoji: string;
  reason: string;
  estimated_minutes: number;
  missing_ingredients: string[];
}

export interface PantryHeatItem {
  name: string;
  freshness: number;
  days_until_expiry: number | null;
  location: string;
}

export interface CookingStep {
  step_number: number;
  instruction: string;
  duration_minutes: number | null;
  timer_alert: boolean;
}

export interface KitchenDigest {
  week_start: string;
  meals_cooked: number;
  variety_score: number;
  unique_cuisines: number;
  estimated_savings: number;
  top_cuisine: string | null;
  suggestion: string;
}

export interface KitchenNudge {
  nudge_type: string;
  message: string;
  action_label: string;
  emoji: string;
}

// ── Budget Pulse ──

export interface BudgetGoal {
  id: string;
  member_id: string | null;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  monthly_allocation: number | null;
  auto_allocate: boolean;
  created_at: string;
}

export interface BudgetPattern {
  category: string;
  pattern_type: string;
  description: string;
  avg_amount: number;
  frequency: string;
}

export interface MonthlyReport {
  month: string;
  total_income: number;
  total_expenses: number;
  total_savings: number;
  net: number;
  top_categories: Array<{ category: string; total: number }>;
  patterns: BudgetPattern[];
  goals_progress: BudgetGoal[];
  savings_rate: number;
  comparison_to_last_month: number | null;
}

// ── Life Autopilot: Orbit ──

export interface LifeTask {
  id: string;
  title: string;
  category: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  energy_type: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface LifeHabit {
  id: string;
  name: string;
  category: string | null;
  frequency: string;
  target_count: number;
  streak: number;
  best_streak: number;
  active: boolean;
  created_at: string;
}

export interface LifeDailyFocus {
  id: string;
  focus_date: string;
  task_id: string | null;
  position: number;
  task: LifeTask | null;
  created_at: string;
}

export interface LifeSchedule {
  id: string;
  task_id: string | null;
  suggested_time: string | null;
  energy_match: string | null;
  reason: string | null;
  accepted: boolean;
  created_at: string;
}

export interface LifeNudge {
  id: string;
  nudge_type: string;
  message: string;
  action_label: string | null;
  dismissed: boolean;
  created_at: string;
}

export interface OrbitDashboard {
  today_focus: LifeDailyFocus[];
  pending_tasks: LifeTask[];
  active_habits: LifeHabit[];
  nudges: LifeNudge[];
  streak_total: number;
  completed_today: number;
}

// === Foundation (Home Health) Types ===

export interface HomeDiagnosis {
  symptom_summary: string;
  probable_causes: Array<{
    cause: string;
    likelihood: 'high' | 'medium' | 'low';
    severity: 'critical' | 'moderate' | 'minor';
  }>;
  recommended_action: {
    type: 'diy' | 'pro' | 'monitor';
    steps: string[];
    estimated_cost_range: { low: number; high: number };
  };
  urgency: 'immediate' | 'this_week' | 'this_month' | 'routine';
}

export interface PredictedFailure {
  appliance_name: string;
  current_age_years: number;
  expected_lifespan: number;
  failure_probability_next_6mo: number; // 0-1
  warning_signs_to_watch: string[];
  estimated_replacement_cost: number;
  recommended_action: string;
  urgency: 'high' | 'medium' | 'low';
}

export interface SeasonalTask {
  id: string;
  task: string;
  category: 'hvac' | 'plumbing' | 'roof' | 'yard' | 'interior' | 'general' | 'electrical' | 'safety';
  priority: 'high' | 'medium' | 'low';
  estimated_time_minutes: number;
  estimated_cost: number;
  diy_possible: boolean;
  description: string;
  month: number;
  completed: boolean;
  completed_date: string | null;
}

export interface BillAnomaly {
  is_anomalous: boolean;
  bill_type: string;
  current_amount: number;
  deviation_percent: number;
  comparison_to: 'monthly_average' | 'same_month_last_year';
  average_amount: number;
  possible_causes: string[];
  recommended_investigation: string;
  severity: 'info' | 'concern' | 'urgent';
}

export interface WarrantyAlert {
  appliance: string;
  warranty_expiry: string;
  days_remaining: number;
  action_recommended: string;
  claim_checklist: string[];
}

export interface HomeChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  context_snapshot?: {
    health_score: number;
    alerts_count: number;
  };
}

export interface FoundationDashboard {
  health_score: number;
  systems: Array<{
    name: string;
    icon: string;
    status: 'healthy' | 'warning' | 'critical';
    detail: string;
  }>;
  alerts: Array<{
    type: 'prediction' | 'anomaly' | 'warranty' | 'maintenance';
    title: string;
    severity: 'info' | 'warning' | 'critical';
    action: string;
  }>;
  upcoming_maintenance_count: number;
  overdue_maintenance_count: number;
  appliances_at_risk: number;
  total_monthly_utilities: number;
  warranty_expiring_soon: number;
  predicted_failures: PredictedFailure[];
  seasonal_tasks: SeasonalTask[];
}
