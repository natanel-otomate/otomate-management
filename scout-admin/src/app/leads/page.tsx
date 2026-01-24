'use client';

import { useEffect, useState } from 'react';
import { Lead } from '../../lib/leads';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
    // Refresh every 30 seconds to catch new leads
    const interval = setInterval(fetchLeads, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/leads');
      if (response.ok) {
        const data = await response.json();
        setLeads(data);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const isHighBudget = (budgetBracket: string) => {
    // Assuming "High" means above 15k
    return budgetBracket === 'High';
  };

  const isUrgent = (lead: Lead) => {
    if (lead.status !== 'New') return false;
    const createdAt = new Date(lead.created_at);
    const now = new Date();
    const hoursSinceCreation =
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceCreation >= 24;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-zinc-50 flex items-center justify-center">
        <div className="text-lg">Loading leads...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Lead Management Dashboard</h1>
          <p className="text-zinc-400">Total leads: {leads.length}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Company</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Email</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Budget</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Pain Point</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Created</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500">
                    No leads yet. Leads will appear here when submitted via the API.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const urgent = isUrgent(lead);
                  const highBudget = isHighBudget(lead.budget_bracket);

                  return (
                    <tr
                      key={lead.id}
                      className={`border-b border-zinc-900 hover:bg-zinc-900/50 transition-colors ${
                        highBudget ? 'bg-green-500/10' : ''
                      }`}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {lead.name}
                          {urgent && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-red-600 text-white rounded">
                              URGENT
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-zinc-300">{lead.company}</td>
                      <td className="py-4 px-4 text-zinc-300">{lead.email}</td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            highBudget
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {lead.budget_bracket}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            lead.status === 'New'
                              ? 'bg-blue-500/20 text-blue-400'
                              : lead.status === 'Contacted'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : lead.status === 'Won'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-zinc-400 max-w-xs truncate">
                        {lead.pain_point || '-'}
                      </td>
                      <td className="py-4 px-4 text-zinc-400 text-sm">
                        {new Date(lead.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => {
                            // You can add update functionality here
                            console.log('Update lead:', lead.id);
                          }}
                          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
