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

// ── Quarantine (Sentinel) Types ──

export interface QuarantineStatus {
  agent_id: string;
  level: number;
  level_name: string;
  level_emoji: string;
  reason: string;
  trigger_event_id: string | null;
  auto_escalated: boolean;
  created_at: string;
}

export interface QuarantineEvent {
  id: string;
  agent_id: string;
  level: number;
  level_name: string;
  level_emoji: string;
  reason: string;
  trigger_event_id: string | null;
  auto_escalated: boolean;
  is_active: boolean;
  released_at: string | null;
  released_by: string | null;
  created_at: string;
}

export interface AutoEscalation {
  agent_id: string;
  new_level: number;
  level_name: string;
  level_emoji: string;
}

// ── Quarantine (Sentinel) API Functions ──

/** Get current quarantine status for an agent */
export async function getQuarantineStatus(agentId: string): Promise<QuarantineStatus> {
  return invoke('quarantine_get_status', { agentId });
}

/** Get quarantine level for an agent (lightweight) */
export async function getQuarantineLevel(agentId: string): Promise<string> {
  return invoke('quarantine_get_level', { agentId });
}

/** Manually escalate an agent's quarantine level */
export async function quarantineEscalate(
  agentId: string,
  level: number,
  reason: string
): Promise<string> {
  return invoke('quarantine_escalate', { agentId, level, reason });
}

/** Release an agent from quarantine */
export async function quarantineRelease(agentId: string): Promise<boolean> {
  return invoke('quarantine_release', { agentId });
}

/** Get quarantine history (all agents or specific agent) */
export async function getQuarantineHistory(
  agentId?: string,
  limit?: number
): Promise<QuarantineEvent[]> {
  return invoke('quarantine_get_history', { agentId, limit });
}

/** Get all currently quarantined agents */
export async function getAllQuarantined(): Promise<QuarantineStatus[]> {
  return invoke('quarantine_get_all');
}

/** Run auto-escalation checks across all agents */
export async function runAutoEscalation(): Promise<AutoEscalation[]> {
  return invoke('quarantine_run_auto_escalation');
}

/** Check if an agent can respond (not Suspended/Frozen) */
export async function canAgentRespond(agentId: string): Promise<boolean> {
  return invoke('quarantine_can_respond', { agentId });
}

// ══════════════════════════════════════════════════════════════
// NETWORK DISCOVERY — Phase 9: "Who's on my WiFi?"
// ══════════════════════════════════════════════════════════════

export interface NetworkDevice {
  id: string;
  ip_address: string;
  mac_address: string | null;
  hostname: string | null;
  manufacturer: string | null;
  device_type: string;
  is_known: boolean;
  nickname: string | null;
  first_seen: string;
  last_seen: string;
  open_ports: number[];
  is_online: boolean;
  scan_count: number;
}

export interface NetworkEvent {
  id: string;
  event_type: string;
  device_id: string;
  description: string | null;
  severity: string;
  created_at: string;
}

export interface NetworkScanResult {
  devices_found: number;
  devices_new: number;
  devices_left: number;
  total_known: number;
  total_online: number;
  unknown_online: number;
  scan_duration_ms: number;
}

export interface NetworkMapData {
  local_ip: string;
  gateway_ip: string | null;
  subnet: string;
  devices: NetworkDevice[];
  scan_result: NetworkScanResult | null;
}

/** Run a full network scan (ARP + hostname + ports) */
export async function networkScan(): Promise<NetworkScanResult> {
  return invoke('network_scan');
}

/** Get all known network devices */
export async function networkGetDevices(): Promise<NetworkDevice[]> {
  return invoke('network_get_devices');
}

/** Get network events (device join/leave) */
export async function networkGetEvents(limit?: number): Promise<NetworkEvent[]> {
  return invoke('network_get_events', { limit });
}

/** Get the full network map data */
export async function networkGetMap(): Promise<NetworkMapData> {
  return invoke('network_get_map');
}

/** Rename a device (give it a nickname) */
export async function networkRenameDevice(deviceId: string, nickname: string): Promise<void> {
  return invoke('network_rename_device', { deviceId, nickname });
}

/** Mark a device as known/trusted */
export async function networkMarkKnown(deviceId: string): Promise<void> {
  return invoke('network_mark_known', { deviceId });
}

/** Delete a device from the database */
export async function networkDeleteDevice(deviceId: string): Promise<void> {
  return invoke('network_delete_device', { deviceId });
}
