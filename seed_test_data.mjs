import { createClient } from '@supabase/supabase-js';

const url = 'https://zcvhozqrssotirabdlzr.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjdmhvenFyc3NvdGlyYWJkbHpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY3MDkyOSwiZXhwIjoyMDkwMjQ2OTI5fQ.QTFQ9RHlR0ftoA2S7Tr_Hlbh9oEUZ7szsIElzyH5k0Y';
const supabase = createClient(url, key, { auth: { persistSession: false } });

const USER_EMAIL = 'donziglioni@gmail.com';
const USER_ID = 'c9bb0e32-d3c2-46b7-b557-2e7f59fec5ee';
const now = new Date().toISOString();
const month = now.slice(0, 7); // e.g. '2026-04'

async function seed() {
  console.log('=== Seeding test data for', USER_EMAIL, '===');

  // 1. Find profile
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', USER_EMAIL);

  if (pErr) { console.error('Profile lookup error:', pErr); return; }
  const userId = profiles?.[0]?.id ?? USER_ID;
  console.log('Profile ID:', userId);

  // Find member_id for family_members
  const { data: members } = await supabase
    .from('family_members')
    .select('id')
    .eq('parent_id', userId)
    .limit(1);
  const memberId = members?.[0]?.id ?? null;
  console.log('Member ID:', memberId);

  const data = {};

  // ── Kitchen Inventory (Hearth) ──
  const today = new Date();
  const future3 = new Date(today.getTime() + 2 * 86400000).toISOString().split('T')[0];
  const future7 = new Date(today.getTime() + 6 * 86400000).toISOString().split('T')[0];
  const future14 = new Date(today.getTime() + 13 * 86400000).toISOString().split('T')[0];

  const { data: kitchenRows, error: kErr } = await supabase
    .from('kitchen_inventory')
    .insert([
      { name: 'Milk', quantity: 1, unit: 'gallon', category: 'dairy', expiry_date: future3, location: 'fridge' },
      { name: 'Chicken Breast', quantity: 2, unit: 'lbs', category: 'meat', expiry_date: future3, location: 'fridge' },
      { name: 'Spinach', quantity: 1, unit: 'bag', category: 'produce', expiry_date: future3, location: 'fridge' },
      { name: 'Eggs', quantity: 12, unit: 'count', category: 'dairy', expiry_date: future7, location: 'fridge' },
      { name: 'Yogurt', quantity: 4, unit: 'cups', category: 'dairy', expiry_date: future7, location: 'fridge' },
      { name: 'Rice', quantity: 5, unit: 'lbs', category: 'pantry', expiry_date: future14, location: 'pantry' },
      { name: 'Pasta', quantity: 2, unit: 'boxes', category: 'pantry', expiry_date: null, location: 'pantry' },
      { name: 'Tomatoes', quantity: 6, unit: 'count', category: 'produce', expiry_date: future7, location: 'counter' },
    ]).select('id');

  data.kitchen = kErr ? { error: kErr } : kitchenRows;
  console.log('Kitchen items seeded:', kitchenRows?.length ?? 'error');

  // ── Budget Entries (Pulse) ──
  const { data: budgetRows, error: bErr } = await supabase
    .from('budget_entries')
    .insert([
      { user_id: userId, entry_type: 'income', category: 'Salary', amount: 4500.00, description: 'Monthly salary', date: month + '-01' },
      { user_id: userId, entry_type: 'expense', category: 'housing', amount: 1200.00, description: 'Rent', date: month + '-01' },
      { user_id: userId, entry_type: 'expense', category: 'groceries', amount: 187.50, description: 'Weekly groceries', date: month + '-03' },
      { user_id: userId, entry_type: 'expense', category: 'subscriptions', amount: 14.99, description: 'Netflix', date: month + '-01' },
      { user_id: userId, entry_type: 'expense', category: 'dining', amount: 42.30, description: 'Dinner out', date: month + '-04' },
      { user_id: userId, entry_type: 'expense', category: 'transportation', amount: 55.00, description: 'Gas', date: month + '-02' },
      { user_id: userId, entry_type: 'expense', category: 'utilities', amount: 89.50, description: 'Electric bill', date: month + '-01' },
      { user_id: userId, entry_type: 'expense', category: 'healthcare', amount: 35.00, description: 'Co-pay', date: month + '-05' },
      { user_id: userId, entry_type: 'savings', category: 'emergency', amount: 500.00, description: 'Monthly savings', date: month + '-01' },
    ]).select('id');

  data.budget = bErr ? { error: bErr } : budgetRows;
  console.log('Budget entries seeded:', budgetRows?.length ?? 'error');

  // ── Life Tasks (Orbit) ──
  const { data: taskRows, error: tErr } = await supabase
    .from('life_tasks')
    .insert([
      { user_id: userId, title: 'Review Q1 financials', category: 'work', priority: 'high', status: 'pending', due_date: month + '-10' },
      { user_id: userId, title: 'Schedule oil change', category: 'personal', priority: 'medium', status: 'pending', due_date: month + '-15' },
      { user_id: userId, title: 'Update resume', category: 'career', priority: 'low', status: 'pending' },
      { user_id: userId, title: 'Call dentist', category: 'health', priority: 'medium', status: 'pending', due_date: month + '-08' },
      { user_id: userId, title: 'Plan weekend trip', category: 'personal', priority: 'low', status: 'pending', due_date: month + '-20' },
    ]).select('id');

  data.tasks = tErr ? { error: tErr } : taskRows;
  console.log('Tasks seeded:', taskRows?.length ?? 'error');

  // ── Dreams (Horizon) ──
  const { data: dreamData, error: dErr } = await supabase.rpc('dream_create', {
    p_user_id: userId,
    p_title: 'Launch Conflux Home v1.0',
    p_description: 'Ship the first public release with 16+ apps and full auth',
    p_category: 'product',
    p_target_date: '2026-06-30'
  });
  // If RPC fails, insert directly
  let dreamId;
  if (dErr) {
    console.log('Direct dream insert fallback');
    const { data: directDream } = await supabase
      .from('dreams')
      .insert({
        user_id: userId,
        title: 'Launch Conflux Home v1.0',
        description: 'Ship the first public release with 16+ apps and full auth',
        category: 'product',
        target_date: '2026-06-30',
        progress: 65,
        status: 'active',
      })
      .select('id')
      .single();
    dreamId = directDream?.id;
  } else {
    dreamId = dreamData?.id;
  }
  console.log('Dream created:', dreamId ?? 'error');

  const { data: dream2 } = await supabase
    .from('dreams')
    .insert({
      user_id: userId,
      title: 'Get 100 beta users',
      description: 'Onboard 100 active users through magic link referrals',
      category: 'growth',
      target_date: '2026-08-01',
      progress: 12,
    })
    .select('id');
  console.log('Dream 2 created:', dream2?.[0]?.id ?? 'error');

  const { data: dream3 } = await supabase
    .from('dreams')
    .insert({
      user_id: userId,
      title: 'Complete kitchen AI redesign',
      description: 'Finish all 16 app visual redesigns with consistent glassmorphism',
      category: 'design',
      target_date: '2026-05-15',
      progress: 35,
    })
    .select('id');
  console.log('Dream 3 created:', dream3?.[0]?.id ?? 'error');

  data.dreams = { id: dreamId };

  // ── Feed Items (Current) ──
  const { data: feedRows, error: fErr } = await supabase
    .from('content_feed')
    .insert([
      { user_id: userId, content_type: 'news', title: 'AI Agents Gain Traction in Enterprise', body: 'Major tech companies adopt multi-agent workflows...', is_read: false, category: 'technology', created_at: month + '-05' },
      { user_id: userId, content_type: 'tip', title: 'Budget tip: Category-based allocation', body: 'Try zero-based budgeting to maximize efficiency...', is_read: false, category: 'finance', created_at: month + '-04' },
      { user_id: userId, content_type: 'challenge', title: 'Weekly Meal Prep Challenge', body: 'Try batch cooking 5 meals in under 2 hours...', is_read: false, category: 'cooking', created_at: month + '-03' },
      { user_id: userId, content_type: 'fun_fact', title: 'Tauri uses 10x less RAM than Electron', body: 'Rust backend + system webview = lean desktop apps...', is_read: false, category: 'tech', created_at: month + '-02' },
    ]).select('id');

  data.feed = fErr ? { error: fErr } : feedRows;
  console.log('Feed items seeded:', feedRows?.length ?? 'error');

  console.log('\n=== Seed complete ===');
  if (kErr || bErr || tErr || fErr) {
    console.log('Errors:', { kErr, bErr, tErr, fErr });
  }
}

seed().catch(console.error);
