// Conflux Home — Agent Manager
// Local-first agent install/uninstall via localStorage.
// No gateway calls for MVP — marketplace is local-only.

import { AGENT_PROFILES, AGENT_PROFILE_MAP } from '../data/agent-descriptions';

const STORAGE_KEY = 'conflux-selected-agents';

export interface InstallResult {
  success: boolean;
  message: string;
  agentId: string;
}

export interface AgentManager {
  getInstalled(): string[];
  isInstalled(agentId: string): boolean;
  install(agentId: string): Promise<InstallResult>;
  uninstall(agentId: string): Promise<InstallResult>;
  toggle(agentId: string): Promise<InstallResult>;
  getInstallCount(): number;
}

function readInstalled(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

function writeInstalled(ids: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function createAgentManager(): AgentManager {
  return {
    getInstalled(): string[] {
      return readInstalled();
    },

    isInstalled(agentId: string): boolean {
      return readInstalled().includes(agentId);
    },

    async install(agentId: string): Promise<InstallResult> {
      // Validate agent exists in known profiles
      if (!AGENT_PROFILE_MAP[agentId]) {
        return {
          success: false,
          message: `Unknown agent: ${agentId}`,
          agentId,
        };
      }

      const installed = readInstalled();
      if (installed.includes(agentId)) {
        return {
          success: false,
          message: 'Already installed',
          agentId,
        };
      }

      installed.push(agentId);
      writeInstalled(installed);

      return {
        success: true,
        message: `Installed ${AGENT_PROFILE_MAP[agentId].name}`,
        agentId,
      };
    },

    async uninstall(agentId: string): Promise<InstallResult> {
      const installed = readInstalled();
      if (!installed.includes(agentId)) {
        return {
          success: false,
          message: 'Not installed',
          agentId,
        };
      }

      writeInstalled(installed.filter(id => id !== agentId));

      return {
        success: true,
        message: `Uninstalled ${AGENT_PROFILE_MAP[agentId]?.name ?? agentId}`,
        agentId,
      };
    },

    async toggle(agentId: string): Promise<InstallResult> {
      const installed = readInstalled();
      if (installed.includes(agentId)) {
        return this.uninstall(agentId);
      }
      return this.install(agentId);
    },

    getInstallCount(): number {
      return readInstalled().length;
    },
  };
}

// Singleton for convenience
const defaultManager = createAgentManager();

export function getInstalledAgents(): string[] {
  return defaultManager.getInstalled();
}

export function isAgentInstalled(agentId: string): boolean {
  return defaultManager.isInstalled(agentId);
}

export function installAgent(agentId: string): Promise<InstallResult> {
  return defaultManager.install(agentId);
}

export function uninstallAgent(agentId: string): Promise<InstallResult> {
  return defaultManager.uninstall(agentId);
}

export function toggleAgent(agentId: string): Promise<InstallResult> {
  return defaultManager.toggle(agentId);
}
