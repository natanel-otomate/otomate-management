import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

interface HealthStatus {
  supabase_configured: boolean;
  supabase_url_set: boolean;
  supabase_key_set: boolean;
  environment: string | undefined;
  supabase_connection?: string;
  supabase_error?: string;
}

export async function GET() {
  const health: HealthStatus = {
    supabase_configured: !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    supabase_url_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_key_set: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    environment: process.env.NODE_ENV,
  };

  // Try to test Supabase connection
  if (health.supabase_configured) {
    try {
      // Test connection by querying a simple table
      const { error } = await getSupabaseClient().from('leads').select('count').limit(1);
      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "relation does not exist" - table might not be created yet
        throw error;
      }
      health.supabase_connection = 'OK';
    } catch (error) {
      health.supabase_connection = 'FAILED';
      health.supabase_error = error instanceof Error ? error.message : 'Unknown error';
    }
  } else {
    health.supabase_connection = 'NOT_CONFIGURED';
  }

  return NextResponse.json(health);
}
