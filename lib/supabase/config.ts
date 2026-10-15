export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  return {
    url: url.trim(),
    anonKey: anonKey.trim(),
    serviceRoleKey: serviceRoleKey.trim(),
    isConfigured: Boolean(url && (anonKey || serviceRoleKey)),
  };
}
