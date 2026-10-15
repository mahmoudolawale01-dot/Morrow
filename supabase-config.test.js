const assert = require('assert');
const { resolveSupabaseConfig } = require('./supabase');

const config = resolveSupabaseConfig({
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  DATABASE_URL: 'postgresql://user:pass@host:5432/db',
});

assert.strictEqual(config.enabled, true);
assert.strictEqual(config.url, 'https://example.supabase.co');
assert.strictEqual(config.anonKey, 'anon-key');
assert.strictEqual(config.serviceRoleKey, 'service-key');
assert.strictEqual(config.databaseUrl, 'postgresql://user:pass@host:5432/db');

console.log('supabase config ok');
