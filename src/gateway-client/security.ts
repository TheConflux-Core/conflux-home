// Conflux Home — Security API Client
// Typed wrappers for all security_* Tauri commands.

import { invoke } from '@tauri-apps/api/core';

// ── Types ──

export interface SecurityEvent {
  id: string;
  agent_id: string;
  session_id: string | null;
  event_type: string;
  category: 'info' | 'warning' | 'critical';
  tool_name: string | null;
  target: string | null;
  details: string | null;
  risk_score: number;
  was_allowed: boolean;
  created_at: string;
}

export interface SecuritySummary {
  total_events: number;
  last_24h: number;
  blocked: number;
  high_risk: number;
  by_category: Record<string, number>;
  by_type: Record<string, number>;
  recent_anomalies: Array<{
    id: string;
    agent_id: string;
    target: string | null;
    risk_score: number;
    created_at: string;
  }>;
}

export interface SecurityProfile {
  agent_id: string;
  sandbox_enabled: boolean;
  file_access_mode: string;
  network_mode: string;
  exec_mode: string;
  max_file_reads_per_min: number;
  max_file_writes_per_min: number;
  max_exec_per_min: number;
  max_network_per_min: number;
  anomaly_threshold: number;
}

export interface PermissionRule {
  id: string;
  agent_id: string;
  resource_type: string;
  resource_value: string;
  action: 'allow' | 'deny' | 'prompt';
  scope: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface PermissionPrompt {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_emoji: string;
  request_type: string;
  target: string;
  tool_name: string | null;
  created_at: string;
}

export interface AnomalyRule {
  id: string;
  name: string;
  description: string | null;
  rule_type: string;
  condition_json: string;
  severity: string;
  action: string;
  is_enabled: boolean;
}

export interface TriggeredAnomaly {
  rule_id: string;
  rule_name: string;
  severity: string;
  action: string;
  description: string;
  details: Record<string, unknown>;
}

// ── API Functions ──

/** Get security events with optional filters */
export async function getSecurityEvents(filters?: {
  agent_id?: string;
  event_type?: string;
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<SecurityEvent[]> {
  return invoke('security_get_events', {
    agentId: filters?.agent_id,
    eventType: filters?.event_type,
    category: filters?.category,
    limit: filters?.limit,
    offset: filters?.offset,
  });
}

/** Get SIEM dashboard summary */
export async function getSecuritySummary(): Promise<SecuritySummary> {
  return invoke('security_get_summary');
}

/** Get activity for a specific agent */
export async function getAgentActivity(agentId: string, limit?: number): Promise<SecurityEvent[]> {
  return invoke('security_get_agent_activity', { agentId, limit });
}

/** Get critical security events */
export async function getCriticalEvents(limit?: number): Promise<SecurityEvent[]> {
  return invoke('security_get_critical_events', { limit });
}

/** Get agent security profile */
export async function getSecurityProfile(agentId: string): Promise<SecurityProfile> {
  return invoke('security_get_profile', { agentId });
}

/** Update agent security profile */
export async function updateSecurityProfile(
  agentId: string,
  updates: Partial<SecurityProfile>
): Promise<void> {
  return invoke('security_update_profile', {
    agentId,
    sandboxEnabled: updates.sandbox_enabled,
    fileAccessMode: updates.file_access_mode,
    networkMode: updates.network_mode,
    execMode: updates.exec_mode,
    maxFileReads: updates.max_file_reads_per_min,
    maxFileWrites: updates.max_file_writes_per_min,
    maxExec: updates.max_exec_per_min,
    maxNetwork: updates.max_network_per_min,
    anomalyThreshold: updates.anomaly_threshold,
  });
}

/** Get permission rules for an agent */
export async function getPermissionRules(agentId: string): Promise<PermissionRule[]> {
  return invoke('security_get_rules', { agentId });
}

/** Add a permission rule */
export async function addPermissionRule(
  agentId: string,
  resourceType: string,
  resourceValue: string,
  action: string,
  scope?: string,
  description?: string
): Promise<string> {
  return invoke('security_add_rule', {
    agentId,
    resourceType,
    resourceValue,
    action,
    scope,
    description,
  });
}

/** Delete a permission rule */
export async function deletePermissionRule(ruleId: string): Promise<boolean> {
  return invoke('security_delete_rule', { ruleId });
}

/** Get pending permission prompts */
export async function getPendingPrompts(agentId?: string): Promise<PermissionPrompt[]> {
  return invoke('security_get_pending_prompts', { agentId });
}

/** Resolve a permission prompt */
export async function resolvePermissionPrompt(
  promptId: string,
  decision: 'allow_once' | 'allow_always' | 'deny_once' | 'deny_always'
): Promise<void> {
  return invoke('security_resolve_prompt', { promptId, decision });
}

/** Run anomaly scan across all agents */
export async function runAnomalyScan(): Promise<TriggeredAnomaly[]> {
  return invoke('security_run_anomaly_scan');
}

/** Get anomaly rules */
export async function getAnomalyRules(): Promise<AnomalyRule[]> {
  return invoke('security_get_anomaly_rules');
}

/** Cleanup old security events */
export async function cleanupSecurityEvents(days?: number): Promise<number> {
  return invoke('security_cleanup_events', { days });
}
