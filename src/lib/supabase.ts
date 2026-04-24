import { createClient } from '@supabase/supabase-js';

// Get URL and Key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yidicpgcnbpswfhyolzm.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_FCJcG5PLDnYdVydsK3p8Cw_JpfY5Y12';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
  },
});
