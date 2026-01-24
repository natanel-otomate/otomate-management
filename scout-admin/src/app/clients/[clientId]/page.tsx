'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Tabs } from '@/components/Tabs';
import { MiniLineChart } from '@/components/MiniLineChart';
import { formatMoneyFromCents } from '@/lib/money';

type Client = {
  id: string;
  name: string;
  company: string;
  email: string;
  created_at: string;
};

type Project = {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  contract_value_cents: number;
  currency: string;
};

type Task = {
  id: string;
  project_id: string;
  title: string;
  status: string;
};

type Subtask = {
  id: string;
  task_id: string;
  title: string;
  status: string;
};

type PaymentRequest = {
  id: string;
  title: string | null;
  amount_cents: number;
  currency: string;
  due_date: string | null;
  status: string;
};

type Invoice = {
  id: string;
  invoice_number: string | null;
  amount_cents: number;
  currency: string;
  issued_date: string | null;
  paid_date: string | null;
  status: string;
};

type ClientDetails = {
  client: Client;
  projects: Project[];
  tasks: Task[];
  subtasks: Subtask[];
  billing: { payment_requests: PaymentRequest[]; invoices: Invoice[] };
  metrics: {
    total_value_cents: number;
    open_payment_requests_count: number;
    open_payment_requests_cents: number;
    series: { ym: string; expected_cents: number; actual_cents: number }[];
  };
};

type TabId = 'dashboard' | 'projects' | 'billing';

export default function ClientDetailPage({
  params,
}: {
  params: { clientId: string };
}) {
  const [tab, setTab] = useState<TabId>('dashboard');
  const [data, setData] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/clients/${params.clientId}/details`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (res.ok) setData(json);
      else alert(json?.error || 'Failed to load client');
      setLoading(false);
    })();
  }, [params.clientId]);

  const tasksByProject = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of data?.tasks || []) {
      map.set(t.project_id, [...(map.get(t.project_id) || []), t]);
    }
    return map;
  }, [data?.tasks]);

  const subtasksByTask = useMemo(() => {
    const map = new Map<string, Subtask[]>();
    for (const s of data?.subtasks || []) {
      map.set(s.task_id, [...(map.get(s.task_id) || []), s]);
    }
    return map;
  }, [data?.subtasks]);

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
        <Link href="/clients" className="text-zinc-300 hover:text-zinc-50">
          ← Back
        </Link>
        <div className="mt-6 text-zinc-400">Client not found.</div>
      </div>
    );
  }

  const currency =
    data.projects.find((p) => p.currency)?.currency ||
    data.billing.invoices.find((i) => i.currency)?.currency ||
    'USD';

  const actualSeries = data.metrics.series.map((p) => p.actual_cents);
  const expectedSeries = data.metrics.series.map((p) => p.expected_cents);
  const avgActual =
    actualSeries.reduce((s, v) => s + v, 0) / Math.max(1, actualSeries.length);
  const trend = actualSeries.map(() => avgActual);

  return (
    <div className="min-h-screen bg-black text-zinc-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <Link
              href="/clients"
              className="text-sm text-zinc-300 hover:text-zinc-50 transition-colors"
            >
              ← Clients
            </Link>
            <h1 className="text-3xl font-semibold mt-3">{data.client.name}</h1>
            <div className="mt-1 text-zinc-400">
              {data.client.company} · {data.client.email}
            </div>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-300 hover:text-zinc-50 transition-colors"
          >
            Main Dashboard →
          </Link>
        </div>

        <Tabs
          options={[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'projects', label: 'Projects' },
            { id: 'billing', label: 'Billing' },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'dashboard' && (
          <div className="mt-6 grid gap-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-zinc-900 p-6">
                <div className="text-sm text-zinc-400">Total value</div>
                <div className="mt-2 text-2xl font-semibold">
                  {formatMoneyFromCents(data.metrics.total_value_cents, currency)}
                </div>
              </div>
              <div className="rounded-lg bg-zinc-900 p-6">
                <div className="text-sm text-zinc-400">Open payment requests</div>
                <div className="mt-2 text-2xl font-semibold">
                  {data.metrics.open_payment_requests_count}
                </div>
                <div className="mt-1 text-sm text-zinc-400">
                  {formatMoneyFromCents(
                    data.metrics.open_payment_requests_cents,
                    currency
                  )}
                </div>
              </div>
              <div className="rounded-lg bg-zinc-900 p-6">
                <div className="text-sm text-zinc-400">MoM (latest month)</div>
                <div className="mt-2 text-2xl font-semibold">
                  {formatMoneyFromCents(
                    data.metrics.series[data.metrics.series.length - 1]?.actual_cents ||
                      0,
                    currency
                  )}
                </div>
                <div className="mt-1 text-sm text-zinc-400">
                  Expected:{' '}
                  {formatMoneyFromCents(
                    data.metrics.series[data.metrics.series.length - 1]?.expected_cents ||
                      0,
                    currency
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-zinc-900 p-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">MoM payments</h2>
                  <p className="text-sm text-zinc-400">
                    Actual vs Expected + average trendline
                  </p>
                </div>
                <div className="text-xs text-zinc-500">
                  {data.metrics.series.map((p) => p.ym).join(' · ')}
                </div>
              </div>
              <div className="mt-4">
                <MiniLineChart
                  series={[
                    { label: 'Actual', values: actualSeries },
                    { label: 'Expected', values: expectedSeries },
                    { label: 'Avg', values: trend },
                  ]}
                />
              </div>
              <div className="mt-4 flex gap-4 text-xs text-zinc-400">
                <div>
                  <span className="text-zinc-200">Actual avg:</span>{' '}
                  {formatMoneyFromCents(avgActual, currency)}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'projects' && (
          <div className="mt-6 grid gap-6">
            {data.projects.length === 0 ? (
              <div className="text-zinc-400">No projects yet.</div>
            ) : (
              data.projects.map((p) => (
                <div key={p.id} className="rounded-lg bg-zinc-900 p-6">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <div className="text-lg font-semibold">{p.name}</div>
                      <div className="mt-1 text-sm text-zinc-400">
                        {p.status}
                        {p.start_date ? ` · ${p.start_date}` : ''}
                        {p.end_date ? ` → ${p.end_date}` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-zinc-400">Contract</div>
                      <div className="text-lg font-semibold">
                        {formatMoneyFromCents(p.contract_value_cents, p.currency)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {(tasksByProject.get(p.id) || []).map((t) => (
                      <div key={t.id} className="rounded bg-black/30 p-3 border border-zinc-800">
                        <div className="flex items-center justify-between gap-4">
                          <div className="font-medium">{t.title}</div>
                          <div className="text-xs text-zinc-400">{t.status}</div>
                        </div>
                        <div className="mt-2 pl-4 space-y-1">
                          {(subtasksByTask.get(t.id) || []).map((s) => (
                            <div key={s.id} className="flex items-center justify-between gap-4 text-sm">
                              <div className="text-zinc-300">- {s.title}</div>
                              <div className="text-xs text-zinc-500">{s.status}</div>
                            </div>
                          ))}
                          {(subtasksByTask.get(t.id) || []).length === 0 && (
                            <div className="text-xs text-zinc-500">No subtasks</div>
                          )}
                        </div>
                      </div>
                    ))}
                    {(tasksByProject.get(p.id) || []).length === 0 && (
                      <div className="text-sm text-zinc-500">No tasks</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'billing' && (
          <div className="mt-6 grid gap-6">
            <div className="rounded-lg bg-zinc-900 p-6">
              <h2 className="text-lg font-semibold">Payment requests</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">
                        Title
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">
                        Amount
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">
                        Due
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.billing.payment_requests.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 px-4 text-zinc-500">
                          No payment requests.
                        </td>
                      </tr>
                    ) : (
                      data.billing.payment_requests.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b border-zinc-900 hover:bg-zinc-900/50 transition-colors"
                        >
                          <td className="py-4 px-4">{r.title || '-'}</td>
                          <td className="py-4 px-4 text-zinc-300">
                            {formatMoneyFromCents(r.amount_cents, r.currency)}
                          </td>
                          <td className="py-4 px-4 text-zinc-400">
                            {r.due_date || '-'}
                          </td>
                          <td className="py-4 px-4">
                            <span className="px-2 py-1 text-xs font-medium rounded bg-zinc-800 text-zinc-300">
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-lg bg-zinc-900 p-6">
              <h2 className="text-lg font-semibold">Invoices</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">
                        #
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">
                        Amount
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">
                        Issued
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">
                        Paid
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.billing.invoices.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 px-4 text-zinc-500">
                          No invoices.
                        </td>
                      </tr>
                    ) : (
                      data.billing.invoices.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b border-zinc-900 hover:bg-zinc-900/50 transition-colors"
                        >
                          <td className="py-4 px-4">{r.invoice_number || '-'}</td>
                          <td className="py-4 px-4 text-zinc-300">
                            {formatMoneyFromCents(r.amount_cents, r.currency)}
                          </td>
                          <td className="py-4 px-4 text-zinc-400">
                            {r.issued_date || '-'}
                          </td>
                          <td className="py-4 px-4 text-zinc-400">
                            {r.paid_date || '-'}
                          </td>
                          <td className="py-4 px-4">
                            <span className="px-2 py-1 text-xs font-medium rounded bg-zinc-800 text-zinc-300">
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
