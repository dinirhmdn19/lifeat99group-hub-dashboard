-- One-time, manually reviewed bootstrap for the existing Content Hub admin.
-- Replace the UUID with the existing Supabase Auth user id for the
-- onboarding@99 administrator before running this in the Content Hub project.
-- Do not put an email, password, or service-role key in the frontend.

do $$
declare
  v_existing_user_id uuid := '1866de24-d5a4-4db5-ab64-c5f9ecc31208';
begin
  if v_existing_user_id is null then
    raise exception 'replace v_existing_user_id with an existing auth.users.id before running bootstrap';
  end if;
  if not exists (select 1 from auth.users where id = v_existing_user_id) then
    raise exception 'bootstrap user does not exist in auth.users';
  end if;

  insert into public.admin_users (user_id, created_by)
  values (v_existing_user_id, v_existing_user_id)
  on conflict (user_id) do nothing;
end;
$$;
