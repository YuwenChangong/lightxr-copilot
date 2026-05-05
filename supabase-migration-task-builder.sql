-- Task Builder: Phase 10 Migration
-- Run this SQL in your Supabase SQL Editor

-- Task Templates (user-created training workflows)
create table if not exists task_templates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  user_id uuid not null,
  name text not null,
  description text
);

alter table task_templates enable row level security;

create policy "Allow authenticated insert task_templates"
  on task_templates for insert
  with check (true);

create policy "Allow authenticated select task_templates"
  on task_templates for select
  using (true);

create policy "Allow authenticated update task_templates"
  on task_templates for update
  using (true);

create policy "Allow authenticated delete task_templates"
  on task_templates for delete
  using (true);

-- Task Steps (steps belonging to a task template)
create table if not exists task_steps (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  task_id uuid not null references task_templates(id) on delete cascade,
  step_order int not null,
  title text not null,
  instruction text not null,
  success_criteria text not null
);

alter table task_steps enable row level security;

create policy "Allow authenticated insert task_steps"
  on task_steps for insert
  with check (true);

create policy "Allow authenticated select task_steps"
  on task_steps for select
  using (true);

create policy "Allow authenticated update task_steps"
  on task_steps for update
  using (true);

create policy "Allow authenticated delete task_steps"
  on task_steps for delete
  using (true);