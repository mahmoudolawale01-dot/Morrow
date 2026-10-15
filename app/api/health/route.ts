import { NextResponse } from 'next/server';
import { getSupabaseEnv } from '@/lib/supabase/config';

export async function GET() {
  const { isConfigured, url } = getSupabaseEnv();

  return NextResponse.json({
    ok: true,
    service: 'morrow-api',
    mode: 'nextjs',
    database: {
      engine: isConfigured ? 'supabase-ready' : 'local-pending',
      provider: isConfigured ? 'supabase' : 'local-memory',
      configured: isConfigured,
      url: url || null,
    },
  });
}
