function resolveSupabaseConfig(env = process.env) {
  const url = String(env.SUPABASE_URL || '').trim();
  const anonKey = String(env.SUPABASE_ANON_KEY || '').trim();
  const serviceRoleKey = String(env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const databaseUrl = String(env.DATABASE_URL || '').trim();

  return {
    enabled: Boolean(url && (anonKey || serviceRoleKey)),
    url,
    anonKey,
    serviceRoleKey,
    databaseUrl,
  };
}

function createSupabaseClients(env = process.env) {
  const config = resolveSupabaseConfig(env);

  let createClient = null;
  try {
    ({ createClient } = require('@supabase/supabase-js'));
  } catch (error) {
    return { ...config, client: null, admin: null, error: error.message };
  }

  if (!config.enabled || !config.url) {
    return { ...config, client: null, admin: null };
  }

  const clientOptions = {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  };

  return {
    ...config,
    client: createClient(config.url, config.anonKey || config.serviceRoleKey, clientOptions),
    admin: createClient(config.url, config.serviceRoleKey || config.anonKey, clientOptions),
  };
}

module.exports = {
  resolveSupabaseConfig,
  createSupabaseClients,
};
