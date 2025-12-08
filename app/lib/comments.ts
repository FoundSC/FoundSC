import { supabase } from './supabase';

/*
  Comments client API
  - Backed by the `comments` table (see migration 20251124133000_create_comments_table.sql)
  - Used by PostsGrid and Profile screens to list/add/delete per-post comments
 */

export type Comment = {
  id: number;
  post_id: number;
  author_id: string | null;
  body: string;
  created_at: string;
};

// Fetch comments for a given post, newest first
export async function listComments(postId: number): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[comments] listComments error', error);
    throw error;
  }

  return (data as Comment[]) || [];
}

// Create a new comment for a post
// authorId is optional for now; pass the logged-in user id when available
export async function createComment(
  postId: number,
  body: string,
  authorId?: string | null,
): Promise<Comment> {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error('Comment body is required');
  }

  const payload: { post_id: number; body: string; author_id?: string | null } = {
    post_id: postId,
    body: trimmed,
  };
  if (typeof authorId !== 'undefined') {
    payload.author_id = authorId;
  }

  const { data, error } = await supabase
    .from('comments')
    .insert([payload])
    .select()
    .single();

  if (error || !data) {
    console.error('[comments] createComment error', error);
    throw error || new Error('Failed to create comment');
  }

  return data as Comment;
}

// Delete a comment by id
// RLS currently allows public delete; can be tightened later.
export async function deleteComment(id: number): Promise<void> {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[comments] deleteComment error', error);
    throw error;
  }
}
