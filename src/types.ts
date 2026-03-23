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
