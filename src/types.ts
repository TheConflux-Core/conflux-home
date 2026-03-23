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

export type View = 'dashboard' | 'chat' | 'marketplace' | 'settings' | 'onboarding' | 'games' | 'agents' | 'kitchen' | 'budget';

// Agent accent colors for avatar rendering
export const AGENT_COLORS: Record<string, string> = {
  zigbot: '#00d4ff',    // cyan blue
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
