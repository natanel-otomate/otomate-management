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

// Check if KV is configured
function isKvConfigured(): boolean {
  return !!(
    kv &&
    process.env.KV_REST_API_URL &&
    process.env.KV_REST_API_TOKEN
  );
}

// In-memory fallback for development
let memoryStore: Lead[] = [];

// Read leads from KV store
export async function getLeads(): Promise<Lead[]> {
  if (!isKvConfigured()) {
    console.warn('Vercel KV not configured, using in-memory storage (data will not persist)');
    return memoryStore;
  }

  try {
    const leads = await kv.get<Lead[]>(LEADS_KEY);
    return leads || [];
  } catch (error) {
    console.error('Error fetching leads from KV:', error);
    // Fallback to memory store if KV fails
    if (error instanceof Error) {
      console.error('KV Error details:', error.message);
    }
    return memoryStore;
  }
}

// Save leads to KV store
export async function saveLeads(leads: Lead[]): Promise<void> {
  if (!isKvConfigured()) {
    console.warn('Vercel KV not configured, using in-memory storage (data will not persist)');
    memoryStore = leads;
    return;
  }

  try {
    await kv.set(LEADS_KEY, leads);
  } catch (error) {
    console.error('Error saving leads to KV:', error);
    if (error instanceof Error) {
      const errorMsg = `Failed to save leads: ${error.message}`;
      console.error('KV Error details:', errorMsg);
      throw new Error(errorMsg);
    }
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
