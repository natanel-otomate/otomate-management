import { kv } from '@vercel/kv';

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  budget_bracket: 'Low' | 'Mid' | 'High';
  status: 'New' | 'Contacted' | 'Won' | 'Lost';
  pain_point: string;
  created_at: string;
}

const LEADS_KEY = 'leads';

// Read leads from KV store
export async function getLeads(): Promise<Lead[]> {
  try {
    const leads = await kv.get<Lead[]>(LEADS_KEY);
    return leads || [];
  } catch (error) {
    console.error('Error fetching leads from KV:', error);
    // If KV is not configured (local dev), return empty array
    return [];
  }
}

// Save leads to KV store
export async function saveLeads(leads: Lead[]): Promise<void> {
  try {
    await kv.set(LEADS_KEY, leads);
  } catch (error) {
    console.error('Error saving leads to KV:', error);
    throw error;
  }
}

// Add a new lead
export async function addLead(lead: Omit<Lead, 'id' | 'created_at'>): Promise<Lead> {
  const leads = await getLeads();
  const newLead: Lead = {
    ...lead,
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    created_at: new Date().toISOString(),
  };
  leads.push(newLead);
  await saveLeads(leads);
  return newLead;
}
