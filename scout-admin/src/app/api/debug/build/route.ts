import { NextResponse } from 'next/server';

export async function GET() {
  // IMPORTANT: no secrets here (no anon keys, no db urls, no cookies).
  return NextResponse.json({
    marker: 'nav-debug-build-v1',
    vercel: {
      env: process.env.VERCEL_ENV || null,
      git_commit_sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
      git_commit_message: process.env.VERCEL_GIT_COMMIT_MESSAGE || null,
      git_provider: process.env.VERCEL_GIT_PROVIDER || null,
      url: process.env.VERCEL_URL || null,
    },
    timestamp: new Date().toISOString(),
  });
}
