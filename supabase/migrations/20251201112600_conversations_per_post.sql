-- Conversations per post migration
-- Create required extension for UUID if missing
create extension if not exists pgcrypto;

-- 1) Conversations table (one per post and user pair)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null,
  user_b uuid not null,
  post_id integer not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint conversations_users_different check (user_a <> user_b)
);

-- Ensure a canonical (ordered) pair uniqueness per post
-- We use a functional unique index with least/greatest to avoid duplicates regardless of user order
create unique index if not exists conversations_unique_per_post
on public.conversations (
  post_id,
  least(user_a, user_b),
  greatest(user_a, user_b)
);

-- RLS
alter table public.conversations enable row level security;
-- Select allowed to participants
drop policy if exists "Conversations: participants can select" on public.conversations;
create policy "Conversations: participants can select" on public.conversations
  for select using (auth.uid() = user_a or auth.uid() = user_b);
-- Insert allowed only when the row includes the caller
drop policy if exists "Conversations: participants can insert" on public.conversations;
create policy "Conversations: participants can insert" on public.conversations
  for insert with check (auth.uid() = user_a or auth.uid() = user_b);

-- 2) get_or_create_conversation(user1, user2, post_id)
create or replace function public.get_or_create_conversation(
  user1_id uuid,
  user2_id uuid,
  in_post_id integer
)
returns table (conversation_id uuid)
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  ua uuid;
  ub uuid;
  conv_id uuid;
begin
  -- Canonicalize ordering to respect the unique index
  ua := least(user1_id, user2_id);
  ub := greatest(user1_id, user2_id);

  select id into conv_id
  from public.conversations c
  where c.post_id = in_post_id
    and c.user_a = ua and c.user_b = ub
  limit 1;

  if conv_id is null then
    insert into public.conversations (user_a, user_b, post_id)
    values (ua, ub, in_post_id)
    returning id into conv_id;
  end if;

  return query select conv_id as conversation_id;
end;
$$;

-- 3) get_user_conversations(user)
-- Returns per-post conversations for the user, with other participant and last message
create or replace function public.get_user_conversations(
  in_user_id uuid
)
returns table (
  id uuid,
  other_user_id uuid,
  other_user_email text,
  last_message text,
  last_message_time timestamptz,
  unread_count integer,
  post_id integer,
  post_title text
)
language sql
security definer
set search_path = public
stable
as $$
  with base as (
    select
      c.id,
      case when c.user_a = in_user_id then c.user_b else c.user_a end as other_user_id,
      c.post_id
    from public.conversations c
    where c.user_a = in_user_id or c.user_b = in_user_id
  ), last_msg as (
    select m.conversation_id,
           m.content as last_message,
           m.created_at as last_message_time,
           row_number() over (partition by m.conversation_id order by m.created_at desc) as rn
    from public.messages m
  )
  select
    b.id,
    b.other_user_id,
    u.email as other_user_email,
    lm.last_message,
    lm.last_message_time,
    0 as unread_count,
    b.post_id,
    p.title as post_title
  from base b
  left join auth.users u on u.id = b.other_user_id
  left join public.posts p on p.id = b.post_id
  left join last_msg lm on lm.conversation_id = b.id and lm.rn = 1
  order by coalesce(lm.last_message_time, 'epoch'::timestamptz) desc;
$$;
