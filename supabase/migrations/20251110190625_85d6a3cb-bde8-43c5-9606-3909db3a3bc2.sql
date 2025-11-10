-- Create jobs table for queued job tracking
create table if not exists public.jobs (
  id uuid primary key,
  task text not null check (task in ('initial-parse','final-analysis','parse-statements')),
  user_id uuid,
  session_id text,
  input_url text not null,
  status text not null check (status in ('STARTED','SUCCEEDED','FAILED')) default 'STARTED',
  url text,
  error text,
  idempotency_key text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable realtime for jobs table
alter publication supabase_realtime add table public.jobs;

-- Enable RLS
alter table public.jobs enable row level security;

-- RLS Policies
create policy "read_own_or_public"
on public.jobs for select
using (auth.uid() = user_id or user_id is null);

create policy "edge_insert"
on public.jobs for insert
with check (true);

create policy "edge_update"
on public.jobs for update
using (true);

-- Index for faster lookups
create index if not exists jobs_session_id_idx on public.jobs(session_id);
create index if not exists jobs_user_id_idx on public.jobs(user_id);
create index if not exists jobs_status_idx on public.jobs(status);