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

export type View = 'dashboard' | 'chat' | 'marketplace' | 'settings' | 'onboarding';

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
