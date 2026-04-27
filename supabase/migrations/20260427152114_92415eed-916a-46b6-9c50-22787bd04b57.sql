alter table public.cases
  add column if not exists merge_config jsonb;