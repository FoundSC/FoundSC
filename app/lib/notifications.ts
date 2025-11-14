import { Platform } from 'react-native';
import { supabase } from './supabase';

export type NotificationSettings = {
  enabled?: boolean;
  keywords?: string[];
  radius_km?: number | null;
  category_prefs?: string[];
};

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

export async function setLostPostMatchRules(lost_post_id: number, patch: { keywords?: string[]; radius_km?: number | null; category?: string | null; location_lat?: number | null; location_lng?: number | null; }) {
  const { data: existing } = await supabase
    .from('lost_match_rules')
    .select('id')
    .eq('lost_post_id', lost_post_id)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from('lost_match_rules')
      .update(patch)
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('lost_match_rules')
      .insert([{ lost_post_id, ...patch }]);
    if (error) throw error;
  }
}
