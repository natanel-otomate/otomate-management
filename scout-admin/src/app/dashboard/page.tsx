'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { MiniLineChart } from '@/components/MiniLineChart';
import { formatMoneyFromCents } from '@/lib/money';

type DashboardResponse = {
  series: { ym: string; expected_cents: number; actual_cents: number }[];
  open_payment_requests_count: number;
  open_payment_requests_cents: number;
  totals: {
    paid_30d_cents: number;
    paid_90d_cents: number;
  };
};

export default function MainDashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/metrics/dashboard?months=12', {
        cache: 'no-store',
      });
      const json = await res.json();
      if (res.ok) setData(json);
      else alert(json?.error || 'Failed to load dashboard');
      setLoading(false);
    })();
  }, []);

  const currency = 'USD';
  const actualSeries = useMemo(
    () => data?.series.map((p) => p.actual_cents) || [],
    [data]
  );
  const expectedSeries = useMemo(
    () => data?.series.map((p) => p.expected_cents) || [],
    [data]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-zinc-50 flex items-center justify-center">
        <div className="text-lg">Loading…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black text-zinc-50 p-8">
        <div className="text-zinc-400">No data.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold mb-2">Main Dashboard</h1>
            <p className="text-zinc-400">
              MoM actual vs expected (forecast from project contract value)
            </p>
          </div>
          <Link
            href="/clients"
            className="text-sm text-zinc-300 hover:text-zinc-50 transition-colors"
          >
            View Clients →
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-zinc-900 p-6">
            <div className="text-sm text-zinc-400">Open payment requests</div>
            <div className="mt-2 text-2xl font-semibold">
              {data.open_payment_requests_count}
            </div>
            <div className="mt-1 text-sm text-zinc-400">
              {formatMoneyFromCents(data.open_payment_requests_cents, currency)}
            </div>
          </div>
          <div className="rounded-lg bg-zinc-900 p-6">
            <div className="text-sm text-zinc-400">Total paid (last 30d)</div>
            <div className="mt-2 text-2xl font-semibold">
              {formatMoneyFromCents(data.totals.paid_30d_cents, currency)}
            </div>
          </div>
          <div className="rounded-lg bg-zinc-900 p-6">
            <div className="text-sm text-zinc-400">Total paid (last 90d)</div>
            <div className="mt-2 text-2xl font-semibold">
              {formatMoneyFromCents(data.totals.paid_90d_cents, currency)}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-lg bg-zinc-900 p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">MoM actual vs expected</h2>
              <p className="text-sm text-zinc-400">
                Expected is allocated from project contract value across months
              </p>
            </div>
            <div className="text-xs text-zinc-500">
              {data.series.map((p) => p.ym).join(' · ')}
            </div>
          </div>
          <div className="mt-4">
            <MiniLineChart
              series={[
                { label: 'Actual', values: actualSeries },
                { label: 'Expected', values: expectedSeries },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
