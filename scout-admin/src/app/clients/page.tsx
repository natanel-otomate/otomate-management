'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Client = {
  id: string;
  name: string;
  company: string;
  email: string;
  created_at: string;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', company: '', email: '' });

  async function fetchClients() {
    const res = await fetch('/api/clients', { cache: 'no-store' });
    const data = await res.json();
    if (res.ok) setClients(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchClients();
  }, []);

  async function create() {
    setCreating(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ name: '', company: '', email: '' });
        await fetchClients();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || 'Failed to create client');
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-zinc-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold mb-2">Clients</h1>
            <p className="text-zinc-400">Manage client profiles and projects.</p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-300 hover:text-zinc-50 transition-colors"
          >
            View Main Dashboard →
          </Link>
        </div>

        <div className="mb-8 rounded-lg bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold mb-4">Add client</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Name"
              className="rounded bg-black/40 border border-zinc-800 px-3 py-2 text-sm outline-none focus:border-zinc-600"
            />
            <input
              value={form.company}
              onChange={(e) =>
                setForm((f) => ({ ...f, company: e.target.value }))
              }
              placeholder="Company"
              className="rounded bg-black/40 border border-zinc-800 px-3 py-2 text-sm outline-none focus:border-zinc-600"
            />
            <input
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="Email"
              className="rounded bg-black/40 border border-zinc-800 px-3 py-2 text-sm outline-none focus:border-zinc-600"
            />
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={create}
              disabled={creating}
              className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {creating ? 'Creating…' : 'Create client'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">
                  Name
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">
                  Company
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">
                  Email
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-zinc-500">
                    Loading…
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-zinc-500">
                    No clients yet.
                  </td>
                </tr>
              ) : (
                clients.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-zinc-900 hover:bg-zinc-900/50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <Link
                        href={`/clients/${c.id}`}
                        className="text-zinc-50 hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="py-4 px-4 text-zinc-300">{c.company}</td>
                    <td className="py-4 px-4 text-zinc-300">{c.email}</td>
                    <td className="py-4 px-4 text-zinc-400 text-sm">
                      {new Date(c.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
