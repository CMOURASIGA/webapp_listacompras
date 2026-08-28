import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_KEY as string | undefined;

export const hasSupabaseConfig = Boolean(url && publishableKey);
export const supabase = createClient(
  url || 'https://invalid.local',
  publishableKey || 'missing-publishable-key',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);

