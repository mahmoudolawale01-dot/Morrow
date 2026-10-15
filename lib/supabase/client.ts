import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseEnv } from './config';

export function createClient() {
  const { url, anonKey } = getSupabaseEnv();

  if (!url || !anonKey) {
    throw new Error('Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or their SUPABASE_* equivalents).');
  }

  return createBrowserClient(url, anonKey);
}
