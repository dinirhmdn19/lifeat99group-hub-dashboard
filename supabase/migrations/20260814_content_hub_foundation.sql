-- Prepared locally only. Do not run this migration until the invite/auth and RLS
-- rollout has been reviewed in the Supabase dashboard.
-- Existing public.content records and its existing pic/deadline columns are preserved.

alter table public.content
  add column if not exists pic text,
  add column if not exists deadline date,
  add column if not exists google_calendar_event_id text;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text not null unique,
  name text,
  role text not null default 'viewer' check (role in ('admin', 'editor', 'viewer')),
  active boolean not null default true,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.insights (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content(id) on delete cascade,
  recorded_at date not null default current_date,
  reach bigint,
  views bigint,
  likes bigint,
  comments bigint,
  shares bigint,
  saves bigint,
  engagement bigint,
  engagement_rate numeric(7,4),
  cta_objective text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists insights_content_id_recorded_at_idx
  on public.insights (content_id, recorded_at desc);

-- New sensitive tables must not be exposed to anonymous clients. Policies must be
-- added together with the server-side invite flow and admin role checks.
alter table public.app_users enable row level security;
alter table public.insights enable row level security;
