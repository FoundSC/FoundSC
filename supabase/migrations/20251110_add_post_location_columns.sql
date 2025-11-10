alter table posts add column if not exists location_lat double precision;
alter table posts add column if not exists location_lng double precision;

alter table posts enable row level security;

create policy if not exists posts_read on posts
for select using (true);

create policy if not exists posts_insert on posts
for insert with check (true);