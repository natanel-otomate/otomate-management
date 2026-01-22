import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

interface HealthStatus {
  kv_configured: boolean;
  kv_url_set: boolean;
  kv_token_set: boolean;
  environment: string | undefined;
  kv_connection?: string;
  kv_error?: string;
}

export async function GET() {
  const health: HealthStatus = {
    kv_configured: !!(
      process.env.KV_REST_API_URL &&
      process.env.KV_REST_API_TOKEN
    ),
    kv_url_set: !!process.env.KV_REST_API_URL,
    kv_token_set: !!process.env.KV_REST_API_TOKEN,
    environment: process.env.NODE_ENV,
  };

  // Try to test KV connection
  if (health.kv_configured) {
    try {
      // Test by trying to get a non-existent key (should return null, not error)
      await kv.get('__health_check__');
      health.kv_connection = 'OK';
    } catch (error) {
      health.kv_connection = 'FAILED';
      health.kv_error = error instanceof Error ? error.message : 'Unknown error';
    }
  } else {
    health.kv_connection = 'NOT_CONFIGURED';
  }

  return NextResponse.json(health);
}
