-- Admin support and RLS policies to allow admins to see all reports

-- Admins allowlist table
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);

-- Helper to check if current user is an admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists(select 1 from public.admins a where a.user_id = auth.uid());
$$;

-- Ensure RLS enabled on reports
alter table public.reports enable row level security;

-- Allow admins to select all reports; reporters can read their own (keeps existing policy working)
-- Drop existing policies if they exist and recreate them
drop policy if exists reports_select_admin_all on public.reports;
create policy reports_select_admin_all
on public.reports
for select
using (
  public.is_admin() or reporter_user_id = auth.uid() or reporter_user_id is null
);

-- Allow admins to update reports (e.g., change status)
drop policy if exists reports_update_admin on public.reports;
create policy reports_update_admin
on public.reports
for update
using (public.is_admin())
with check (public.is_admin());

-- Optional: prevent non-admin deletes; admins can delete
drop policy if exists reports_delete_admin on public.reports;
create policy reports_delete_admin
on public.reports
for delete
using (public.is_admin());

comment on table public.admins is 'Allowlist of admin users who can moderate reports.';
comment on function public.is_admin() is 'Returns true when auth.uid() is present in public.admins.';
