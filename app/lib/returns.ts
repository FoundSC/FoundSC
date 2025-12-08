import { supabase } from './supabase';

export interface SuccessfulReturn {
  id: number;
  post_id: number;
  owner_id: string;
  finder_id: string;
  created_at: string;
}

/**
 * Create a successful return record and mark post as found
 * This is called when the post owner selects who helped them find their item
 */
export async function createSuccessfulReturn(
  postId: number,
  ownerId: string,
  finderId: string
): Promise<{ data: SuccessfulReturn | null; error: any }> {
  try {
    // 1. Create the successful return record
    const { data: returnData, error: returnError } = await supabase
      .from('successful_returns')
      .upsert(
        {
          post_id: postId,
          owner_id: ownerId,
          finder_id: finderId,
        },
        { onConflict: 'post_id' }
      )
      .select()
      .single();

    if (returnError) {
      console.error('Error creating successful return:', returnError);
      return { data: null, error: returnError };
    }

    // 2. Mark the post as found and inactive
    const { error: postError } = await supabase
      .from('posts')
      .update({
        is_found: true,
        active: false,
      })
      .eq('id', postId)
      .eq('user_id', ownerId);

    if (postError) {
      console.error('Error updating post:', postError);
      // Don't fail - the return was created successfully
    }

    return { data: returnData, error: null };
  } catch (err) {
    console.error('Exception creating successful return:', err);
    return { data: null, error: err };
  }
}

/**
 * Submit a rating for the finder
 * Called after createSuccessfulReturn when the owner rates the finder
 */
export async function rateUser(
  raterId: string,
  rateeId: string,
  postId: number,
  rating: number,
  comment?: string
): Promise<{ success: boolean; error: any }> {
  try {
    const { error } = await supabase
      .from('ratings')
      .upsert(
        {
          rater_id: raterId,
          ratee_id: rateeId,
          post_id: postId,
          rating,
          comment: comment || null,
          exchange_id: null, // Not using exchanges anymore
        },
        { onConflict: 'post_id,rater_id' }
      );

    if (error) {
      console.error('Error submitting rating:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Exception submitting rating:', err);
    return { success: false, error: err };
  }
}

/**
 * Check if user has already rated for a specific post
 */
export async function hasUserRatedPost(
  raterId: string,
  postId: number
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('ratings')
      .select('id')
      .eq('rater_id', raterId)
      .eq('post_id', postId)
      .maybeSingle();

    return !!data;
  } catch {
    return false;
  }
}

/**
 * Get successful return record for a post (if exists)
 */
export async function getSuccessfulReturn(postId: number) {
  const { data, error } = await supabase
    .from('successful_returns')
    .select(`
      *,
      finder:user_profiles!successful_returns_finder_id_fkey(
        id, display_name, profile_picture, rating_avg, rating_count
      )
    `)
    .eq('post_id', postId)
    .maybeSingle();

  return { data, error };
}

/**
 * Get all successful returns for a user (as finder)
 * Shows how many items they've helped return
 */
export async function getUserSuccessfulReturns(userId: string) {
  const { data, error } = await supabase
    .from('successful_returns')
    .select(`
      *,
      post:posts(id, title, category, image_url),
      owner:user_profiles!successful_returns_owner_id_fkey(
        id, display_name, profile_picture
      )
    `)
    .eq('finder_id', userId)
    .order('created_at', { ascending: false });

  return { data, error };
}
