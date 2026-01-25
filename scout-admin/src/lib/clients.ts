import { getSupabaseClient } from './supabase';
import { safeInt } from './money';

export type Client = {
  id: string;
  name: string;
  company: string;
  email: string;
  created_at: string;
};

export type Project = {
  id: string;
  client_id: string;
  name: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  start_date: string | null;
  end_date: string | null;
  contract_value_cents: number;
  currency: string;
  created_at: string;
};

export type Task = {
  id: string;
  project_id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done' | 'blocked';
  sort_order: number;
  created_at: string;
};

export type Subtask = {
  id: string;
  task_id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done' | 'blocked';
  sort_order: number;
  created_at: string;
};

export type PaymentRequest = {
  id: string;
  client_id: string;
  project_id: string | null;
  title: string | null;
  amount_cents: number;
  currency: string;
  due_date: string | null;
  status: 'open' | 'paid' | 'cancelled';
  created_at: string;
};

export type Invoice = {
  id: string;
  client_id: string;
  project_id: string | null;
  invoice_number: string | null;
  amount_cents: number;
  currency: string;
  issued_date: string | null;
  paid_date: string | null;
  status: 'issued' | 'paid' | 'void';
  created_at: string;
};

export async function listClients(): Promise<Client[]> {
  const { data, error } = await getSupabaseClient()
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Client[];
}

export async function createClient(input: {
  name: string;
  company: string;
  email: string;
}): Promise<Client> {
  const { data, error } = await getSupabaseClient()
    .from('clients')
    .insert([input])
    .select('*')
    .single();
  if (error) throw error;
  return data as Client;
}

export async function getClient(clientId: string): Promise<Client | null> {
  const { data, error } = await getSupabaseClient()
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();
  if (error) {
    // Supabase/PostgREST uses PGRST116 for "0 rows" on .single()
    // Only treat that as "not found"; otherwise bubble up the real error.
    // This prevents permission/schema/config errors from being misreported as 404s.
    if ((error as any).code === 'PGRST116') return null;
    throw error;
  }
  return data as Client;
}

export async function listProjectsByClient(clientId: string): Promise<Project[]> {
  const { data, error } = await getSupabaseClient()
    .from('projects')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data || []).map((p: any) => ({
    ...(p as Project),
    contract_value_cents: safeInt(p.contract_value_cents, 0),
  })) as Project[];
}

export async function listTasksByProjectIds(projectIds: string[]): Promise<Task[]> {
  if (projectIds.length === 0) return [];
  const { data, error } = await getSupabaseClient()
    .from('tasks')
    .select('*')
    .in('project_id', projectIds)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []).map((t: any) => ({
    ...(t as Task),
    sort_order: safeInt(t.sort_order, 0),
  })) as Task[];
}

export async function listSubtasksByTaskIds(taskIds: string[]): Promise<Subtask[]> {
  if (taskIds.length === 0) return [];
  const { data, error } = await getSupabaseClient()
    .from('subtasks')
    .select('*')
    .in('task_id', taskIds)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []).map((s: any) => ({
    ...(s as Subtask),
    sort_order: safeInt(s.sort_order, 0),
  })) as Subtask[];
}

export async function listBillingByClient(clientId: string): Promise<{
  payment_requests: PaymentRequest[];
  invoices: Invoice[];
}> {
  const supabase = getSupabaseClient();

  const [{ data: prs, error: prError }, { data: invs, error: invError }] =
    await Promise.all([
      supabase
        .from('payment_requests')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false }),
      supabase
        .from('invoices')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false }),
    ]);

  if (prError) throw prError;
  if (invError) throw invError;

  const payment_requests = (prs || []).map((r: any) => ({
    ...(r as PaymentRequest),
    amount_cents: safeInt(r.amount_cents, 0),
  })) as PaymentRequest[];

  const invoices = (invs || []).map((r: any) => ({
    ...(r as Invoice),
    amount_cents: safeInt(r.amount_cents, 0),
  })) as Invoice[];

  return { payment_requests, invoices };
}
