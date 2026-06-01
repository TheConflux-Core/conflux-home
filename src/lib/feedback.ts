// Feedback & Bug Reporting Utilities
// Supports in-app form submission (Supabase) and GitHub issue fallback.

import { invoke } from '@tauri-apps/api/core';
import { supabase } from './supabase';

const GITHUB_REPO = 'TheConflux-Core/conflux-home';

export interface FeedbackSubmission {
  type: 'bug' | 'feature';
  title: string;
  description: string;
  pageContext?: string;
  userEmail?: string;
}

/**
 * Collect system telemetry for bug reports.
 * Uses Tauri get_system_info for accurate app version + OS.
 * Falls back to navigator properties when Tauri is unavailable.
 */
async function collectSystemInfo(): Promise<{
  appVersion: string;
  osInfo: string;
  userAgent: string;
}> {
  const userAgent = navigator.userAgent || 'Unknown';

  try {
    const info = await invoke<{ os: string; arch: string; app_version: string }>('get_system_info');
    // Build a rich OS string: "windows x86_64" → "Windows (x86_64)"
    const osLabel = info.os.charAt(0).toUpperCase() + info.os.slice(1);
    return {
      appVersion: info.app_version || 'unknown',
      osInfo: `${osLabel} (${info.arch})`,
      userAgent,
    };
  } catch {
    // Fallback: extract what we can from navigator
    const platform = navigator.platform || 'Unknown';
    return {
      appVersion: 'unknown',
      osInfo: platform,
      userAgent,
    };
  }
}

/**
 * Submit feedback to Supabase ch_feedback table.
 * Returns the inserted row id on success, null on failure.
 */
export async function submitFeedback(
  submission: FeedbackSubmission,
  userId?: string | null,
): Promise<string | null> {
  try {
    const sys = await collectSystemInfo();

    const { data, error } = await supabase
      .from('ch_feedback')
      .insert({
        user_id: userId ?? null,
        feedback_type: submission.type,
        title: submission.title,
        description: submission.description,
        page_context: submission.pageContext ?? null,
        app_version: sys.appVersion,
        os_info: sys.osInfo,
        user_agent: sys.userAgent,
        user_email: submission.userEmail ?? null,
      })
      .select('id')
      .single();

    if (error) {
      console.warn('[feedback] Supabase insert failed:', error.message);
      return null;
    }

    return data?.id ?? null;
  } catch (err) {
    console.warn('[feedback] submitFeedback error:', err);
    return null;
  }
}

/**
 * Open a pre-filled GitHub bug report issue in a new tab.
 * Kept as an alternative for users who prefer GitHub.
 */
export function openBugReport() {
  const platform = navigator.platform || 'Unknown';
  const userAgent = navigator.userAgent;

  const params = new URLSearchParams({
    template: 'bug_report.yml',
    title: '[Bug] ',
    labels: 'bug',
  });

  const url = `https://github.com/${GITHUB_REPO}/issues/new?${params}`;
  window.open(url, '_blank');
}

/**
 * Open the GitHub feature request issue form in a new tab.
 * Kept as an alternative for users who prefer GitHub.
 */
export function openFeatureRequest() {
  const url = `https://github.com/${GITHUB_REPO}/issues/new?template=feature_request.yml`;
  window.open(url, '_blank');
}
