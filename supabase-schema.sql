-- Run this SQL in your Supabase SQL Editor

-- Training Sessions (Phase 8)
create table if not exists training_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  started_at timestamptz default now(),
  completed_at timestamptz,
  task_name text not null,
  status text not null default 'active',
  report text,
  total_questions int default 0
);

alter table training_sessions enable row level security;

create policy "Allow anonymous insert sessions"
  on training_sessions for insert
  with check (true);

create policy "Allow anonymous select sessions"
  on training_sessions for select
  using (true);

create policy "Allow anonymous update sessions"
  on training_sessions for update
  using (true);

-- Captures
create table if not exists captures (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  image_url text,
  question text not null,
  answer text not null,
  task_name text,
  step_index int,
  step_title text,
  session_id uuid references training_sessions(id)
);

-- Allow anonymous insert and select (Phase 1: no auth)
-- Lock down in Phase 2 when you add auth

alter table captures enable row level security;

create policy "Allow anonymous insert"
  on captures for insert
  with check (true);

create policy "Allow anonymous select"
  on captures for select
  using (true);
