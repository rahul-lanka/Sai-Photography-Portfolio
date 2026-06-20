create table if not exists public.customer_comments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_type text,
  comment text not null,
  rating integer not null default 5 check (rating between 1 and 5),
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.customer_comments enable row level security;

drop policy if exists "Public can submit customer comments" on public.customer_comments;
create policy "Public can submit customer comments"
on public.customer_comments
for insert
to anon, authenticated
with check (is_approved = false);

drop policy if exists "Public can read approved customer comments" on public.customer_comments;
create policy "Public can read approved customer comments"
on public.customer_comments
for select
to anon, authenticated
using (is_approved = true);

drop policy if exists "Admins can manage customer comments" on public.customer_comments;
create policy "Admins can manage customer comments"
on public.customer_comments
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);
