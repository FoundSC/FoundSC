import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Avatar, Divider } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Conversation {
  id: string;
  other_user_id: string;
  other_user_email: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  post_id: number;
  post_title: string | null;
}

export default function MessagesScreen({ navigation }: any) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchConversations();

    // Subscribe to new messages
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    const { data, error } = await supabase.rpc('get_user_conversations', {
      in_user_id: user.id,
    });

    if (error) {
      console.error('Error fetching conversations:', error);
      return;
    }

    setConversations(data || []);
  };

  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => navigation.navigate('Chat', {
        conversationId: item.id,
        otherUserId: item.other_user_id,
        otherUserEmail: item.other_user_email,
      })}
    >
      <Avatar.Text
        size={50}
        label={item.other_user_email?.charAt(0).toUpperCase() || 'U'}
      />
      <View style={styles.conversationContent}>
        <Text style={styles.conversationEmail}>{item.other_user_email}</Text>
        {item.post_title ? (
          <Text style={styles.postTitle} numberOfLines={1}>{item.post_title}</Text>
        ) : null}
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.last_message}
        </Text>
        <Text style={styles.timestamp}>
          {new Date(item.last_message_time).toLocaleDateString()}
        </Text>
      </View>
      {item.unread_count > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{item.unread_count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Messages</Text>
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <Divider />}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No messages yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { fontSize: 24, fontWeight: 'bold', padding: 16 },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  conversationContent: { flex: 1, marginLeft: 12 },
  conversationEmail: { fontSize: 16, fontWeight: '600' },
  postTitle: { fontSize: 13, color: '#444', marginTop: 2 },
  lastMessage: { fontSize: 14, color: '#666', marginTop: 4 },
  timestamp: { fontSize: 12, color: '#999', marginTop: 2 },
  unreadBadge: {
    backgroundColor: '#6d28d9',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  unreadText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#666' },
});