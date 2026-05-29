// Feedback & Bug Reporting Utilities
// Supports in-app form submission (Supabase) and GitHub issue fallback.

import { supabase } from './supabase'

const GITHUB_REPO = 'TheConflux-Core/conflux-home';

export interface FeedbackSubmission {
  type: 'bug' | 'feature';
  title: string;
  description: string;
  pageContext?: string;
  userEmail?: string;
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
    const platform = navigator.platform || 'Unknown';
    const appVersion = localStorage.getItem('conflux-app-version') || 'unknown';

    const { data, error } = await supabase
      .from('ch_feedback')
      .insert({
        user_id: userId ?? null,
        feedback_type: submission.type,
        title: submission.title,
        description: submission.description,
        page_context: submission.pageContext ?? null,
        app_version: appVersion,
        os_info: platform,
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
