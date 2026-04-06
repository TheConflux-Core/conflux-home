import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export type IntentCategory =
  | 'budget_affordability'
  | 'budget_transaction'
  | 'budget_pattern'
  | 'kitchen_meal'
  | 'kitchen_pantry'
  | 'kitchen_recipe'
  | 'life_task'
  | 'life_schedule'
  | 'dream_goal'
  | 'dream_decompose'
  | 'general_chat';

export interface IntentResult {
  type: string; // 'budget', 'kitchen', 'life', 'dreams', 'chat'
  view: string; // 'budget', 'kitchen', 'life', 'dreams', 'chat'
  confidence: number;
  agentId: string; // 'pulse', 'hearth', 'orbit', 'horizon', 'conflux'
  prompt?: string;
  category?: IntentCategory;
}

export interface RoutedIntent {
  category: IntentCategory;
  agentId: string; // 'pulse', 'hearth', 'orbit', 'horizon', 'conflux'
  appView: string; // 'budget', 'kitchen', 'life', 'dreams', 'chat'
  query: string;
  response?: string;
}

// Simple keyword-based classification (expandable to LLM-based later)
export function classifyIntent(input: string): IntentResult {
  const text = input.toLowerCase();

  // Budget patterns
  if (text.match(/afford|can i buy|can i purchase|can i get/)) {
    return {
      type: 'budget',
      view: 'budget',
      confidence: 0.85,
      agentId: 'pulse',
      category: 'budget_affordability',
    };
  }
  if (text.match(/spent|expense|transaction|categorize|where did i spend/)) {
    return {
      type: 'budget',
      view: 'budget',
      confidence: 0.8,
      agentId: 'pulse',
      category: 'budget_transaction',
    };
  }
  if (text.match(/pattern|trend|spending habit|save money/)) {
    return {
      type: 'budget',
      view: 'budget',
      confidence: 0.75,
      agentId: 'pulse',
      category: 'budget_pattern',
    };
  }

  // Kitchen patterns
  if (text.match(/cook|meal|dinner|lunch|breakfast|what should i eat/)) {
    return {
      type: 'kitchen',
      view: 'kitchen',
      confidence: 0.85,
      agentId: 'hearth',
      category: 'kitchen_meal',
    };
  }
  if (text.match(/pantry|fridge|ingredient|grocery/)) {
    return {
      type: 'kitchen',
      view: 'kitchen',
      confidence: 0.8,
      agentId: 'hearth',
      category: 'kitchen_pantry',
    };
  }
  if (text.match(/recipe|how to make|cookbook/)) {
    return {
      type: 'kitchen',
      view: 'kitchen',
      confidence: 0.75,
      agentId: 'hearth',
      category: 'kitchen_recipe',
    };
  }

  // Life patterns
  if (text.match(/task|todo|reminder|schedule|appointment/)) {
    return {
      type: 'life',
      view: 'life',
      confidence: 0.85,
      agentId: 'orbit',
      category: 'life_task',
    };
  }
  if (text.match(/focus|energy|productive|when should i/)) {
    return {
      type: 'life',
      view: 'life',
      confidence: 0.8,
      agentId: 'orbit',
      category: 'life_schedule',
    };
  }

  // Dream patterns
  if (text.match(/goal|dream|achieve|want to|objective/)) {
    return {
      type: 'dreams',
      view: 'dreams',
      confidence: 0.85,
      agentId: 'horizon',
      category: 'dream_goal',
    };
  }
  if (text.match(/break down|step|milestone|plan/)) {
    return {
      type: 'dreams',
      view: 'dreams',
      confidence: 0.8,
      agentId: 'horizon',
      category: 'dream_decompose',
    };
  }

  // Default to chat
  return {
    type: 'chat',
    view: 'chat',
    confidence: 0.5,
    agentId: 'conflux',
    category: 'general_chat',
  };
}

export function useIntentRouter() {
  const route = useCallback(async (input: string): Promise<RoutedIntent> => {
    const result = classifyIntent(input);

    // Convert IntentResult to RoutedIntent
    const routed: RoutedIntent = {
      category: result.category || 'general_chat',
      agentId: result.agentId,
      appView: result.view,
      query: input,
    };

    return routed;
  }, []);

  return { route };
}
