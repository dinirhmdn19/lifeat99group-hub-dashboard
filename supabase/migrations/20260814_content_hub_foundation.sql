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

-- Content Hub administration follows the same identity-based pattern as the
-- AllAboard@99 project. There is one admin level with full Hub access; the
-- Auth user id is authoritative and email is never used as a permission check.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

alter table public.admin_users enable row level security;

create or replace function public.is_hub_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

revoke all on function public.is_hub_admin() from public;
grant execute on function public.is_hub_admin() to authenticated;

drop policy if exists admin_users_read_for_admins on public.admin_users;
create policy admin_users_read_for_admins on public.admin_users
  for select to authenticated
  using (public.is_hub_admin());

revoke insert, update, delete on public.admin_users from anon, authenticated;

create or replace function public.add_hub_admin(target_user_id uuid)
returns public.admin_users
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  result public.admin_users;
begin
  if not public.is_hub_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;
  if not exists (select 1 from auth.users where id = target_user_id) then
    raise exception 'target Auth user does not exist' using errcode = '22023';
  end if;

  insert into public.admin_users (user_id, created_by)
  values (target_user_id, auth.uid())
  on conflict (user_id) do nothing;
  select * into result from public.admin_users where user_id = target_user_id;
  return result;
end;
$$;

create or replace function public.remove_hub_admin(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_hub_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;
  if (select count(*) from public.admin_users) <= 1 then
    raise exception 'cannot remove the last Hub admin' using errcode = '42501';
  end if;
  delete from public.admin_users where user_id = target_user_id;
end;
$$;

revoke all on function public.add_hub_admin(uuid) from public;
revoke all on function public.remove_hub_admin(uuid) from public;
grant execute on function public.add_hub_admin(uuid) to authenticated;
grant execute on function public.remove_hub_admin(uuid) to authenticated;
