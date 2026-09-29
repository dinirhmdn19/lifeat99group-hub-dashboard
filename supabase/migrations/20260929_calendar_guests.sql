alter table public.app_users
  add column if not exists calendar_guest boolean not null default false;
