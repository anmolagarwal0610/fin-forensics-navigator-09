
-- 1) Roles enum
create type if not exists public.app_role as enum ('admin', 'user');

-- 2) user_roles table
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamp with time zone not null default now(),
  unique (user_id, role)
);

-- Enable RLS on user_roles
alter table public.user_roles enable row level security;

-- Users can view only their roles
drop policy if exists "Users can view their roles" on public.user_roles;
create policy "Users can view their roles"
  on public.user_roles
  for select
  to authenticated
  using (user_id = auth.uid());

-- Users can add ONLY their own 'user' role (prevents self-escalation)
drop policy if exists "Users can add their own user role" on public.user_roles;
create policy "Users can add their own user role"
  on public.user_roles
  for insert
  to authenticated
  with check (user_id = auth.uid() and role = 'user');

-- Users can delete ONLY their own 'user' role
drop policy if exists "Users can delete their own user role" on public.user_roles;
create policy "Users can delete their own user role"
  on public.user_roles
  for delete
  to authenticated
  using (user_id = auth.uid() and role = 'user');

-- (Intentionally no UPDATE policy to avoid privilege escalation)

-- 3) Helper function to check roles (security definer to avoid RLS recursion)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  );
$$;

-- 4) Extend RLS for admin access on cases, case_files, and events

-- Cases: allow admins to view and update any case (owner policies already exist)
drop policy if exists "Admins can view all cases" on public.cases;
create policy "Admins can view all cases"
  on public.cases
  for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can update any case" on public.cases;
create policy "Admins can update any case"
  on public.cases
  for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Case files: allow admins full access
drop policy if exists "Admins can view all case files" on public.case_files;
create policy "Admins can view all case files"
  on public.case_files
  for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can insert case files" on public.case_files;
create policy "Admins can insert case files"
  on public.case_files
  for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin') and uploaded_by = auth.uid());

drop policy if exists "Admins can update any case files" on public.case_files;
create policy "Admins can update any case files"
  on public.case_files
  for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can delete any case files" on public.case_files;
create policy "Admins can delete any case files"
  on public.case_files
  for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Events: add missing UPDATE/DELETE for owners and allow admins full access

-- Owner update/delete
drop policy if exists "Users can update events for their cases" on public.events;
create policy "Users can update events for their cases"
  on public.events
  for update
  to authenticated
  using (exists (
    select 1 from public.cases
    where cases.id = events.case_id
      and cases.creator_id = auth.uid()
  ));

drop policy if exists "Users can delete events for their cases" on public.events;
create policy "Users can delete events for their cases"
  on public.events
  for delete
  to authenticated
  using (exists (
    select 1 from public.cases
    where cases.id = events.case_id
      and cases.creator_id = auth.uid()
  ));

-- Admin full access
drop policy if exists "Admins can view all events" on public.events;
create policy "Admins can view all events"
  on public.events
  for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can insert events" on public.events;
create policy "Admins can insert events"
  on public.events
  for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can update events" on public.events;
create policy "Admins can update events"
  on public.events
  for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can delete events" on public.events;
create policy "Admins can delete events"
  on public.events
  for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));
