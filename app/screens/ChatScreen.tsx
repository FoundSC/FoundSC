// Chat screen renders a one-to-one conversation view with real-time updates via Supabase channels.

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
} from 'react-native';
import { TextInput, IconButton } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export default function ChatScreen({ route }: any) {
  // Route params provided by navigation when opening a conversation
  const { conversationId, otherUserId, otherUserEmail } = route.params;

  // Current authenticated user
  const { user } = useAuth();

  // Local state: message list, draft message, pull-to-refresh flag
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Initial fetch for messages in this conversation
    if (!conversationId) return;
    fetchMessages();

    // Real-time subscription: listen for new messages inserted for this conversation
    const subscription = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          // Append new message and scroll to bottom
          setMessages((prev) => [...prev, payload.new as Message]);
          flatListRef.current?.scrollToEnd();
        }
      )
      .subscribe();

    // Cleanup on unmount or conversation change
    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId]);

  // Fetch all messages for the conversation (ascending by time)
  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    setMessages(data || []);
  };

  // Pull-to-refresh handler for FlatList
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
  };

  // Insert a new message for this conversation
  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: newMessage.trim(),
    });

    if (error) {
      console.error('Error sending message:', error);
      return;
    }

    // Clear draft; the realtime subscription will add the message to the list
    setNewMessage('');
  };

  // Render a single message bubble (styles differ for own vs other messages)
  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.sender_id === user?.id;
    return (
      <View
        style={[
          styles.messageContainer,
          isOwn ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
          {item.content}
        </Text>
        <Text style={styles.messageTime}>
          {new Date(item.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    );
  };

  return (
    // KeyboardAvoidingView keeps the input visible when keyboard shows (iOS padding behavior)
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header shows the other participant's email */}
      <View style={styles.header}>
        <Text style={styles.headerText}>{otherUserEmail}</Text>
      </View>

      {/* Message list with auto-scroll to bottom on content size change and pull-to-refresh */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />

      {/* Composer row: multiline text input and send button */}
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, styles.inputGray]}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor="#6b7280"
          mode="outlined"
          multiline
          maxLength={500}
          // Ensure typed text is black across react-native-paper versions:
          textColor="#111827"             // v5+
          contentStyle={{ color: '#111827' }} // fallback for older versions
          selectionColor="#111827"        // cursor/selection color
          theme={{ colors: { text: '#111827' } }} // extra assurance
        />
        <IconButton
          icon="send"
          mode="contained"
          size={24}
          onPress={sendMessage}
          disabled={!newMessage.trim()}
          iconColor="#6d28d9"
          style={styles.sendButtonGray}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

// Simple, platform-neutral styles for chat UI
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerText: { fontSize: 18, fontWeight: '600' },
  messagesList: { padding: 16 },
  messageContainer: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  // Own messages are right-aligned with a colored background
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#caa9ffff',
  },
  // Other messages are left-aligned with a neutral background
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
  },
  messageText: { fontSize: 15, color: '#111' },
  ownMessageText: { color: '#ffffffff' },
  messageTime: { fontSize: 11, color: '#666', marginTop: 4 },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
  },
  input: { flex: 1, marginRight: 8 },
  inputGray: {
    backgroundColor: '#e9e7e7ff',
  },
  inputTextBlack: {
    color: '#111827', 
  },
  sendButtonGray: {
    backgroundColor: '#f3f4f6',
    borderRadius: 24,
  },
});