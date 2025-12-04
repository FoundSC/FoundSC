// MessagesScreen: shows a list of one-to-one conversations for the current user.
// Pulls conversation metadata via a Supabase RPC, subscribes to new messages to refresh,
// and navigates to ChatScreen when a conversation is tapped.

import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Avatar, Divider } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Conversation list item with metadata returned by get_user_conversations
interface Conversation {
  id: string;                      // conversation/thread id
  other_user_id: string;           // the other participant's user id
  other_user_email: string;        // the other participant's email (for display)
  last_message: string;            // most recent message content
  last_message_time: string;       // timestamp of the most recent message
  unread_count: number;            // unread messages count for the current user
  post_id: number;                 // optional: source post id, if conversation was created from a post
  post_title: string | null;       // optional: source post title
}

export default function MessagesScreen({ navigation }: any) {
  const { user } = useAuth(); // current authenticated user from context
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false); // pull-to-refresh state

  useEffect(() => {
    if (!user) return;
    fetchConversations();

    // Realtime subscription: refresh the list when a new message is inserted anywhere.
    // We keep it simple and refetch; alternatively we could update the specific conversation in place.
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

  // Load conversations for the current user 
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

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  };

  // Render a single conversation row with avatar, email, optional post title, last message, time, and unread badge
  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => navigation.navigate('Chat', {
        conversationId: item.id,
        otherUserId: item.other_user_id,
        otherUserEmail: item.other_user_email,
      })}
    >
      {/* Avatar from first letter of other user's email */}
      <Avatar.Text
        size={50}
        label={item.other_user_email?.charAt(0).toUpperCase() || 'U'}
      />
      <View style={styles.conversationContent}>
        <Text style={styles.conversationEmail}>{item.other_user_email}</Text>
        {/* Show the source post title if present */}
        {item.post_title ? (
          <Text style={styles.postTitle} numberOfLines={1}>{item.post_title}</Text>
        ) : null}
        {/* Last message preview */}
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.last_message}
        </Text>
        {/* Human-readable date for last message */}
        <Text style={styles.timestamp}>
          {new Date(item.last_message_time).toLocaleDateString()}
        </Text>
      </View>
      {/* Unread count badge */}
      {item.unread_count > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{item.unread_count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Screen header */}
      <Text style={styles.header}>Messages</Text>

      {/* Conversations list with separators, empty state, and pull-to-refresh */}
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