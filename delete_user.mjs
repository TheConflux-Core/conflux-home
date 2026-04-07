import { createClient } from '@supabase/supabase-js';
const url = 'https://zcvhozqrssotirabdlzr.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjdmhvenFyc3NvdGlyYWJkbHpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY3MDkyOSwiZXhwIjoyMDkwMjQ2OTI5fQ.QTFQ9RHlR0ftoA2S7Tr_Hlbh9oEUZ7szsIElzyH5k0Y';
const supabase = createClient(url, key, { auth: { persistSession: false } });
const userId = 'c9bb0e32-d3c2-46b7-b557-2e7f59fec5ee';
const { error } = await supabase.auth.admin.deleteUser(userId);
if (error) {
  console.error('Delete error:', error.message, error);
  process.exit(1);
} else {
  console.log('User deleted successfully');
}
