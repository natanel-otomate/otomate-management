import { getSupabaseClient } from './supabase';

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

// Read all leads from Supabase
export async function getLeads(): Promise<Lead[]> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching leads:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching leads from Supabase:', error);
    throw error;
  }
}

// Add a new lead to Supabase
export async function addLead(lead: Omit<Lead, 'id' | 'created_at'>): Promise<Lead> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('leads')
      .insert([
        {
          name: lead.name,
          company: lead.company,
          email: lead.email,
          budget_bracket: lead.budget_bracket,
          status: lead.status,
          pain_point: lead.pain_point || '',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating lead:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error adding lead to Supabase:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to create lead: ${error.message}`);
    }
    throw error;
  }
}
