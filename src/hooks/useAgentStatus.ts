import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface AgentStatus {
  id: string;
  emoji: string;
  name: string;
  status: string;
}

export interface AgentStatusQuery {
  userId: string;
  member_id?: string;
}

// Timeout helper — resolves to fallback after 1s
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 1000, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}

export async function queryHearthStatus(userId: string, member_id?: string): Promise<string> {
  try {
    const items = await withTimeout(
      invoke<any[]>('kitchen_get_inventory', { memberId: member_id ?? undefined }),
      1000,
      []
    );
    const count = Array.isArray(items) ? items.length : 0;
    return count > 0 ? `Pantry: ${count} items stocked` : 'Hearth: Ready';
  } catch {
    return 'Hearth: Ready';
  }
}

export async function queryPulseStatus(userId: string, member_id?: string): Promise<string> {
  try {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const summary = await withTimeout(
      invoke<any>('budget_get_summary', { month }),
      1000,
      null
    );
    if (summary && summary.total_expenses !== undefined) {
      const txns = summary.categories?.reduce((sum: number, c: any) => sum + (c.count || 0), 0) || 0;
      return txns > 0 ? `${txns} transactions this month` : 'Pulse: Ready';
    }
    return 'Pulse: Ready';
  } catch {
    return 'Pulse: Ready';
  }
}

export async function queryOrbitStatus(userId: string, member_id?: string): Promise<string> {
  try {
    const tasks = await withTimeout(
      invoke<any[]>('life_get_tasks', { userId, status: 'pending' }),
      1000,
      []
    );
    const count = Array.isArray(tasks) ? tasks.length : 0;
    return count > 0 ? `${count} tasks on your plate today` : 'Orbit: Ready';
  } catch {
    return 'Orbit: Ready';
  }
}

export async function queryHorizonStatus(userId: string, member_id?: string): Promise<string> {
  try {
    const dreams = await withTimeout(
      invoke<any[]>('dream_get_all', { userId, status: 'active' }),
      1000,
      []
    );
    const count = Array.isArray(dreams) ? dreams.length : 0;
    return count > 0 ? `${count} active goals` : 'Horizon: Ready';
  } catch {
    return 'Horizon: Ready';
  }
}

export async function queryCurrentStatus(userId: string, member_id?: string): Promise<string | null> {
  try {
    const items = await withTimeout(
      invoke<any[]>('feed_get_items', {
        userId,
        memberId: member_id ?? undefined,
        contentType: undefined,
        unreadOnly: true,
      }),
      1000,
      []
    );
    const count = Array.isArray(items) ? items.length : 0;
    if (count > 0) {
      return `${count} unread items in your feed`;
    }
    return null; // Skip if no content
  } catch {
    return null;
  }
}

export async function fetchAgentStatuses(userId: string, member_id?: string): Promise<AgentStatus[]> {
  const [hearth, pulse, orbit, horizon, current] = await Promise.all([
    queryHearthStatus(userId, member_id),
    queryPulseStatus(userId, member_id),
    queryOrbitStatus(userId, member_id),
    queryHorizonStatus(userId, member_id),
    queryCurrentStatus(userId, member_id),
  ]);

  const statuses: AgentStatus[] = [
    { id: 'hearth', emoji: '🍳', name: 'Hearth', status: hearth },
    { id: 'pulse', emoji: '💰', name: 'Pulse', status: pulse },
    { id: 'orbit', emoji: '🪐', name: 'Orbit', status: orbit },
    { id: 'horizon', emoji: '🌅', name: 'Horizon', status: horizon },
  ];

  if (current) {
    statuses.push({ id: 'current', emoji: '📰', name: 'Current', status: current });
  }

  // Limit to 4 cards max
  return statuses.slice(0, 4);
}
