import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, FlatList } from 'react-native';
import { Button } from 'react-native-paper';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { supabase } from '../lib/supabase';

// Minimal type aligned with your reports table
type Report = {
  id: number;
  reporter_user_id: string | null;
  reported_user_id: string;
  post_id: number | null;
  reason: string;
  message: string | null;
  status: 'open' | 'reviewed' | 'dismissed';
  created_at: string;
};

export default function AdminReportsScreen() {
  const { isAdmin, loading } = useIsAdmin();
  const [busy, setBusy] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);

  const loadReports = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('id, reporter_user_id, reported_user_id, post_id, reason, message, status, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReports((data as Report[]) || []);
    } catch (e) {
      console.warn('[admin] loadReports failed', (e as any)?.message || e);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!loading && isAdmin) {
      loadReports();
    }
  }, [loading, isAdmin]);

  const setStatus = async (id: number, status: Report['status']) => {
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      setReports(prev => prev.map(r => (r.id === id ? (data as Report) : r)));
    } catch (e) {
      console.warn('[admin] update status failed', (e as any)?.message || e);
    } finally {
      setBusy(false);
    }
  };

  if (loading || busy) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={{ padding: 16 }}>
        <Text>Not authorized</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12 }}>User Reports</Text>
      <FlatList
        data={reports}
        keyExtractor={(r) => String(r.id)}
        renderItem={({ item }) => (
          <View style={{ padding: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginBottom: 10 }}>
            <Text style={{ fontWeight: '600' }}>Report #{item.id}</Text>
            <Text>Reporter: {item.reporter_user_id ?? 'anonymous'}</Text>
            <Text>Reported: {item.reported_user_id}</Text>
            {item.post_id != null ? <Text>Post ID: {item.post_id}</Text> : null}
            <Text>Reason: {item.reason}</Text>
            {item.message ? <Text>Message: {item.message}</Text> : null}
            <Text>Status: {item.status}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Button mode="outlined" onPress={() => setStatus(item.id, 'reviewed')}>Mark Reviewed</Button>
              <Button mode="outlined" onPress={() => setStatus(item.id, 'dismissed')}>Dismiss</Button>
              <Button mode="outlined" onPress={() => setStatus(item.id, 'open')}>Reopen</Button>
            </View>
          </View>
        )}
      />
    </View>
  );
}
