-- Migration: create clients/projects/tasks/subtasks + billing tables
-- Applied to Supabase project ref: kkorzfneuwmfedzehvsk

create extension if not exists pgcrypto;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null,
  email text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_clients_created_at on public.clients (created_at desc);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  status text not null default 'active' check (status in ('active','paused','completed','cancelled')),
  start_date date,
  end_date date,
  contract_value_cents bigint not null default 0 check (contract_value_cents >= 0),
  currency text not null default 'USD',
  created_at timestamptz not null default now()
);
create index if not exists idx_projects_client_id on public.projects (client_id);
create index if not exists idx_projects_created_at on public.projects (created_at desc);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  status text not null default 'todo' check (status in ('todo','in_progress','done','blocked')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_tasks_project_id on public.tasks (project_id);

create table if not exists public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  status text not null default 'todo' check (status in ('todo','in_progress','done','blocked')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_subtasks_task_id on public.subtasks (task_id);

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text,
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null default 'USD',
  due_date date,
  status text not null default 'open' check (status in ('open','paid','cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists idx_payment_requests_client_id on public.payment_requests (client_id);
create index if not exists idx_payment_requests_status on public.payment_requests (status);
create index if not exists idx_payment_requests_due_date on public.payment_requests (due_date);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  invoice_number text,
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null default 'USD',
  issued_date date,
  paid_date date,
  status text not null default 'issued' check (status in ('issued','paid','void')),
  created_at timestamptz not null default now()
);
create index if not exists idx_invoices_client_id on public.invoices (client_id);
create index if not exists idx_invoices_status on public.invoices (status);
create index if not exists idx_invoices_paid_date on public.invoices (paid_date);

alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.subtasks enable row level security;
alter table public.payment_requests enable row level security;
alter table public.invoices enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='clients' and policyname='allow_all_clients') then
    create policy allow_all_clients on public.clients for all using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='projects' and policyname='allow_all_projects') then
    create policy allow_all_projects on public.projects for all using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='tasks' and policyname='allow_all_tasks') then
    create policy allow_all_tasks on public.tasks for all using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='subtasks' and policyname='allow_all_subtasks') then
    create policy allow_all_subtasks on public.subtasks for all using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='payment_requests' and policyname='allow_all_payment_requests') then
    create policy allow_all_payment_requests on public.payment_requests for all using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='invoices' and policyname='allow_all_invoices') then
    create policy allow_all_invoices on public.invoices for all using (true) with check (true);
  end if;
end $$;
