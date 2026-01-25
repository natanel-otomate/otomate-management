'use client';

import { useEffect } from 'react';

const ENDPOINT =
  'http://127.0.0.1:7243/ingest/6e4e14f2-7b1f-4f20-9b93-65e634e6408d';

function postLog(payload: any) {
  // Avoid logging secrets/PII (no cookies, no localStorage, no keys)
  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

export function DebugProbe({ runId }: { runId: string }) {
  useEffect(() => {
    const snapshot = () => {
      const navEl = document.querySelector('[data-topnav="1"]') as
        | HTMLElement
        | null;

      postLog({
        sessionId: 'debug-session',
        runId,
        hypothesisId: 'A_nav_missing_or_old_deploy',
        location: 'src/components/DebugProbe.tsx:mount',
        message: 'Client probe snapshot',
        data: {
          href: window.location.href,
          path: window.location.pathname,
          title: document.title,
          hasTopNav: !!navEl,
          topNavTextPreview: navEl?.innerText?.slice(0, 80) || null,
          bodyChildCount: document.body?.children?.length ?? null,
        },
        timestamp: Date.now(),
      });
    };

    snapshot();
    requestAnimationFrame(snapshot);
  }, [runId]);

  return null;
}
