import { supabase } from './supabase';

/**
 * Exchange management utilities for the reputation system
 */

export interface Exchange {
  id: number;
  post_id: number;
  post_owner_id: string;
  finder_id: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  cancellation_reason?: string;
  initiated_at: string;
  completed_at?: string;
  created_at: string;
}

export interface ExchangeWithDetails extends Exchange {
  post?: any;
  post_owner?: any;
  finder?: any;
}

/**
 * Create a new exchange when post owner marks item as found
 */
export async function createExchange(
  postId: number,
  postOwnerId: string,
  finderId: string
) {
  try {
    // Create the exchange first (RLS policy requires post status = 'active')
    const { data, error } = await supabase
      .from('exchanges')
      .insert({
        post_id: postId,
        post_owner_id: postOwnerId,
        finder_id: finderId,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating exchange:', error);
      return { data: null, error };
    }

    // Note: Legacy status update removed - now using active/is_found fields instead
    return { data, error: null };
  } catch (err) {
    console.error('Exception creating exchange:', err);
    return { data: null, error: err };
  }
}

/**
 * Get exchange by ID with related data
 */
export async function getExchangeById(exchangeId: number) {
  try {
    const { data, error } = await supabase
      .from('exchanges')
      .select(`
        *,
        post:posts(*),
        post_owner:user_profiles!exchanges_post_owner_id_fkey(*),
        finder:user_profiles!exchanges_finder_id_fkey(*)
      `)
      .eq('id', exchangeId)
      .single();

    return { data, error };
  } catch (err) {
    console.error('Error fetching exchange:', err);
    return { data: null, error: err };
  }
}

/**
 * Get all exchanges for a user (as owner or finder)
 */
export async function getUserExchanges(userId: string) {
  try {
    const { data, error } = await supabase
      .from('exchanges')
      .select(`
        *,
        post:posts(*),
        post_owner:user_profiles!exchanges_post_owner_id_fkey(*),
        finder:user_profiles!exchanges_finder_id_fkey(*)
      `)
      .or(`post_owner_id.eq.${userId},finder_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    return { data, error };
  } catch (err) {
    console.error('Error fetching user exchanges:', err);
    return { data: null, error: err };
  }
}

/**
 * Get exchange by post ID
 */
export async function getExchangeByPostId(postId: number) {
  try {
    const { data, error } = await supabase
      .from('exchanges')
      .select(`
        *,
        post:posts(*),
        post_owner:user_profiles!exchanges_post_owner_id_fkey(*),
        finder:user_profiles!exchanges_finder_id_fkey(*)
      `)
      .eq('post_id', postId)
      .single();

    return { data, error };
  } catch (err) {
    console.error('Error fetching exchange by post:', err);
    return { data: null, error: err };
  }
}

/**
 * Update exchange status
 */
export async function updateExchangeStatus(
  exchangeId: number,
  status: 'confirmed' | 'cancelled',
  cancellationReason?: string
) {
  try {
    const updateData: any = { status };
    if (cancellationReason) {
      updateData.cancellation_reason = cancellationReason;
    }

    const { data, error } = await supabase
      .from('exchanges')
      .update(updateData)
      .eq('id', exchangeId)
      .select()
      .single();

    // Note: Legacy status revert removed - now using active/is_found fields instead

    return { data, error };
  } catch (err) {
    console.error('Error updating exchange status:', err);
    return { data: null, error: err };
  }
}

/**
 * Check if user has rated in an exchange
 */
export async function hasUserRated(exchangeId: number, userId: string) {
  try {
    const { data, error } = await supabase
      .from('ratings')
      .select('id')
      .eq('exchange_id', exchangeId)
      .eq('rater_id', userId)
      .single();

    return { hasRated: !!data, error };
  } catch (err) {
    return { hasRated: false, error: err };
  }
}

/**
 * Get the other participant in an exchange
 */
export function getOtherParticipant(exchange: Exchange, currentUserId: string) {
  return exchange.post_owner_id === currentUserId
    ? exchange.finder_id
    : exchange.post_owner_id;
}

/**
 * Check if exchange is ready for rating (both parties confirmed)
 */
export function canRate(exchange: Exchange) {
  return exchange.status === 'pending' || exchange.status === 'confirmed';
}
