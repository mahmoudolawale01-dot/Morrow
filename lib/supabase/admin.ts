import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from './config';

export function createAdminSupabaseClient() {
  const { url, serviceRoleKey } = getSupabaseEnv();

  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for server-side access.');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
