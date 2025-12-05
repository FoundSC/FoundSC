-- Function to get all users who have contacted the post owner through a specific post
-- This is used when marking a post as found to select who helped retrieve the item

create or replace function public.get_post_contacts(
  in_post_id integer
)
returns table (
  user_id uuid,
  user_email text,
  display_name text,
  profile_picture text,
  last_message_time timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  -- Get all conversations for this post
  with post_conversations as (
    select
      c.id as conversation_id,
      c.user_a,
      c.user_b,
      c.post_id
    from public.conversations c
    where c.post_id = in_post_id
  ),
  -- Get the post owner
  post_info as (
    select user_id as owner_id
    from public.posts
    where id = in_post_id
  ),
  -- Get the other users (not the owner) in each conversation
  contact_users as (
    select
      case
        when pc.user_a = pi.owner_id then pc.user_b
        when pc.user_b = pi.owner_id then pc.user_a
        else null
      end as contact_user_id,
      pc.conversation_id
    from post_conversations pc
    cross join post_info pi
    where pc.user_a = pi.owner_id or pc.user_b = pi.owner_id
  ),
  -- Get last message time for each conversation
  last_messages as (
    select
      m.conversation_id,
      max(m.created_at) as last_message_time
    from public.messages m
    where m.conversation_id in (select conversation_id from contact_users)
    group by m.conversation_id
  )
  -- Return user details with last message time
  select
    cu.contact_user_id as user_id,
    au.email as user_email,
    up.display_name,
    up.profile_picture,
    lm.last_message_time
  from contact_users cu
  left join auth.users au on au.id = cu.contact_user_id
  left join public.user_profiles up on up.id = cu.contact_user_id
  left join last_messages lm on lm.conversation_id = cu.conversation_id
  where cu.contact_user_id is not null
  order by lm.last_message_time desc nulls last;
$$;
