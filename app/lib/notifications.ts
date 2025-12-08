import { Platform } from 'react-native';
import { supabase } from './supabase';

export type NotificationSettings = {
  enabled?: boolean;
  keywords?: string[];
  radius_km?: number | null;
  category_prefs?: string[];
};

/**
 * Registers or updates this device's Expo push token.
 * - Associates token with current user (if logged in) and platform
 * - Used by the Edge Function to resolve who to notify
 */
export async function registerDevicePushToken(token: string) {
  const platform: 'ios' | 'android' | 'web' = Platform.OS === 'ios'
    ? 'ios'
    : Platform.OS === 'android'
    ? 'android'
    : 'web';
  let user_id: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user_id = (data as any)?.user?.id || null;
  } catch {}
  const { error } = await supabase
    .from('device_push_tokens')
    .upsert({ token, platform, last_seen: new Date().toISOString(), user_id }, { onConflict: 'token' });
  if (error) throw error;
}

/**
 * Upserts per-user notification preferences (keywords, categories, radius, etc.).
 * Note: Similar-listing notifications are primarily driven by lost_match_rules per LOST post,
 * but these settings can be used for user-level alert UIs.
 */
export async function upsertUserNotificationSettings(patch: NotificationSettings) {
  let user_id: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user_id = (data as any)?.user?.id || null;
  } catch {}

  if (user_id) {
    const { data: existing } = await supabase
      .from('user_notification_settings')
      .select('id')
      .eq('user_id', user_id)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from('user_notification_settings')
        .update(patch)
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('user_notification_settings')
        .insert([{ user_id, enabled: true, keywords: [], category_prefs: [], ...patch }]);
      if (error) throw error;
    }
  } else {
    // Fallback: single-row settings for unauthenticated users
    const { data: existing } = await supabase
      .from('user_notification_settings')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from('user_notification_settings')
        .update(patch)
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('user_notification_settings')
        .insert([{ enabled: true, keywords: [], category_prefs: [], ...patch }]);
      if (error) throw error;
    }
  }
}

/**
 * Ensures there is a lost_match_rules row for a LOST post.
 * - The notify_on_found_post trigger reads these rules to enqueue notifications
 *   when a matching FOUND post is created.
 */
export async function setLostPostMatchRules(lost_post_id: number, patch: { keywords?: string[]; radius_km?: number | null; category?: string | null; location_lat?: number | null; location_lng?: number | null; }) {
  // look up existing rules
  const { data: existing } = await supabase
    .from('lost_match_rules')
    .select('id')
    .eq('lost_post_id', lost_post_id)
    .maybeSingle();

  // if a row exists, update it
  if (existing?.id) {
    const { error } = await supabase
      .from('lost_match_rules')
      .update(patch)
      .eq('id', existing.id);
    if (error) throw error;
    // if no row exists, create it
  } else {
    const { error } = await supabase
      .from('lost_match_rules')
      .insert([{ lost_post_id, ...patch }]);
    if (error) throw error;
  }
}
