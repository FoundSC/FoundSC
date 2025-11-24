import { supabase } from './supabase';

/**
 * Rating management utilities for the reputation system
 */

export interface Rating {
  id: number;
  exchange_id: number;
  rater_id: string;
  ratee_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface RatingWithProfiles extends Rating {
  rater?: any;
  ratee?: any;
}

/**
 * Submit a rating for an exchange
 */
export async function submitRating(
  exchangeId: number,
  raterId: string,
  rateeId: string,
  rating: number,
  comment?: string
) {
  try {
    // Validate rating
    if (rating < 1 || rating > 5) {
      return { data: null, error: { message: 'Rating must be between 1 and 5' } };
    }

    const { data, error } = await supabase
      .from('ratings')
      .insert({
        exchange_id: exchangeId,
        rater_id: raterId,
        ratee_id: rateeId,
        rating: rating,
        comment: comment?.trim() || null,
      })
      .select()
      .single();

    return { data, error };
  } catch (err) {
    console.error('Error submitting rating:', err);
    return { data: null, error: err };
  }
}

/**
 * Get ratings for a specific exchange
 */
export async function getExchangeRatings(exchangeId: number) {
  try {
    const { data, error } = await supabase
      .from('ratings')
      .select(`
        *,
        rater:user_profiles!ratings_rater_id_fkey(*),
        ratee:user_profiles!ratings_ratee_id_fkey(*)
      `)
      .eq('exchange_id', exchangeId)
      .order('created_at', { ascending: true });

    return { data, error };
  } catch (err) {
    console.error('Error fetching exchange ratings:', err);
    return { data: null, error: err };
  }
}

/**
 * Get ratings received by a user
 */
export async function getUserRatingsReceived(userId: string, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('ratings')
      .select(`
        *,
        rater:user_profiles!ratings_rater_id_fkey(id, display_name, profile_picture),
        exchange:exchanges(post:posts(title, category))
      `)
      .eq('ratee_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return { data, error };
  } catch (err) {
    console.error('Error fetching user ratings:', err);
    return { data: null, error: err };
  }
}

/**
 * Get ratings given by a user
 */
export async function getUserRatingsGiven(userId: string, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('ratings')
      .select(`
        *,
        ratee:user_profiles!ratings_ratee_id_fkey(id, display_name, profile_picture),
        exchange:exchanges(post:posts(title, category))
      `)
      .eq('rater_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return { data, error };
  } catch (err) {
    console.error('Error fetching ratings given:', err);
    return { data: null, error: err };
  }
}

/**
 * Check if both users have rated in an exchange
 */
export async function checkExchangeRatingStatus(exchangeId: number) {
  try {
    const { data, error } = await supabase
      .from('ratings')
      .select('rater_id')
      .eq('exchange_id', exchangeId);

    if (error) {
      return { bothRated: false, raters: [], error };
    }

    const raters = data.map(r => r.rater_id);
    return {
      bothRated: data.length === 2,
      raters: raters,
      error: null,
    };
  } catch (err) {
    console.error('Error checking rating status:', err);
    return { bothRated: false, raters: [], error: err };
  }
}

/**
 * Get user profile with ratings
 */
export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    return { data, error };
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return { data: null, error: err };
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: {
    display_name?: string;
    profile_picture?: string;
  }
) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    return { data, error };
  } catch (err) {
    console.error('Error updating user profile:', err);
    return { data: null, error: err };
  }
}

/**
 * Search user by ID
 */
export async function searchUserById(userId: string) {
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return { data: null, error: { message: 'Invalid user ID format' } };
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, display_name, profile_picture, rating_avg, rating_count')
      .eq('id', userId)
      .single();

    return { data, error };
  } catch (err) {
    console.error('Error searching user:', err);
    return { data: null, error: err };
  }
}

/**
 * Get suggested users who commented on a post
 */
export async function getSuggestedFinders(postId: number) {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        author_id,
        user_profiles!comments_author_id_fkey(
          id,
          display_name,
          profile_picture,
          rating_avg,
          rating_count
        )
      `)
      .eq('post_id', postId)
      .not('author_id', 'is', null);

    if (error) {
      return { data: [], error };
    }

    // Deduplicate by author_id and flatten
    const uniqueUsers = Array.from(
      new Map(
        data
          .filter(c => c.user_profiles)
          .map(c => [c.author_id, c.user_profiles])
      ).values()
    );

    return { data: uniqueUsers, error: null };
  } catch (err) {
    console.error('Error fetching suggested finders:', err);
    return { data: [], error: err };
  }
}

/**
 * Calculate rating statistics
 */
export function getRatingStats(ratingAvg: number, ratingCount: number) {
  return {
    stars: ratingAvg,
    fullStars: Math.floor(ratingAvg),
    hasHalfStar: ratingAvg % 1 >= 0.5,
    count: ratingCount,
    display: ratingCount > 0 ? `${ratingAvg.toFixed(1)} (${ratingCount})` : 'No ratings yet',
  };
}
