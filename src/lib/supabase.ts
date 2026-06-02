import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('[supabase] Initializing client:', {
  url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING',
  hasAnonKey: !!supabaseAnonKey,
  anonKeyPrefix: supabaseAnonKey ? supabaseAnonKey.substring(0, 10) + '...' : 'MISSING',
})

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
