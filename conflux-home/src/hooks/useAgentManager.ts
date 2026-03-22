// Conflux Home — useAgentManager hook
// React hook for agent install/uninstall state with instant re-renders.

import { useState, useCallback, useMemo } from 'react';
import { createAgentManager } from '../lib/agent-manager';
import type { InstallResult } from '../lib/agent-manager';

export function useAgentManager() {
  const manager = useMemo(() => createAgentManager(), []);

  const [installed, setInstalled] = useState<string[]>(() => manager.getInstalled());

  const isInstalled = useCallback(
    (agentId: string) => installed.includes(agentId),
    [installed],
  );

  const install = useCallback(
    async (agentId: string): Promise<InstallResult> => {
      const result = await manager.install(agentId);
      if (result.success) {
        setInstalled(manager.getInstalled());
      }
      return result;
    },
    [manager],
  );

  const uninstall = useCallback(
    async (agentId: string): Promise<InstallResult> => {
      const result = await manager.uninstall(agentId);
      if (result.success) {
        setInstalled(manager.getInstalled());
      }
      return result;
    },
    [manager],
  );

  const toggle = useCallback(
    async (agentId: string): Promise<InstallResult> => {
      const result = await manager.toggle(agentId);
      setInstalled(manager.getInstalled());
      return result;
    },
    [manager],
  );

  return {
    installed,
    installCount: installed.length,
    isInstalled,
    install,
    uninstall,
    toggle,
  };
}
