import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
} from 'react-native';
import { Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StarRatingDisplay } from './star-rating';
import { searchUserById, getSuggestedFinders } from '../lib/ratings';

interface UserSelectorModalProps {
  visible: boolean;
  postId: number;
  currentUserId: string;
  onSelectUser: (userId: string, userName: string) => void;
  onCancel: () => void;
}

interface UserProfile {
  id: string;
  display_name: string;
  profile_picture?: string;
  rating_avg: number;
  rating_count: number;
}

export default function UserSelectorModal({
  visible,
  postId,
  currentUserId,
  onSelectUser,
  onCancel,
}: UserSelectorModalProps) {
  const [searchUserId, setSearchUserId] = useState('');
  const [searchedUser, setSearchedUser] = useState<UserProfile | null>(null);
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    if (visible) {
      loadSuggestedUsers();
    } else {
      // Reset state when modal closes
      setSearchUserId('');
      setSearchedUser(null);
      setSelectedUser(null);
      setSearchError('');
    }
  }, [visible, postId]);

  const loadSuggestedUsers = async () => {
    setLoading(true);
    const { data, error } = await getSuggestedFinders(postId);
    if (!error && data) {
      // Filter out current user
      const filtered = data.filter((u: any) => u.id !== currentUserId);
      setSuggestedUsers(filtered);
    }
    setLoading(false);
  };

  const handleSearchUser = async () => {
    if (!searchUserId.trim()) {
      setSearchError('Please enter a user ID');
      return;
    }

    setSearching(true);
    setSearchError('');
    setSearchedUser(null);

    const { data, error } = await searchUserById(searchUserId.trim());

    setSearching(false);

    if (error || !data) {
      setSearchError('User not found. Please check the ID and try again.');
      return;
    }

    if (data.id === currentUserId) {
      setSearchError("You can't select yourself!");
      return;
    }

    setSearchedUser(data);
  };

  const handleSelectUser = (user: UserProfile) => {
    setSelectedUser(user);
  };

  const handleConfirm = () => {
    if (selectedUser) {
      onSelectUser(selectedUser.id, selectedUser.display_name || 'User');
    }
  };

  const renderUserCard = (user: UserProfile, isSearched = false) => {
    const isSelected = selectedUser?.id === user.id;

    return (
      <TouchableOpacity
        key={user.id}
        style={[styles.userCard, isSelected && styles.userCardSelected]}
        onPress={() => handleSelectUser(user)}
      >
        <View style={styles.userCardContent}>
          <View style={styles.userAvatar}>
            {user.profile_picture ? (
              <Image
                source={{ uri: user.profile_picture }}
                style={styles.avatarImage}
              />
            ) : (
              <MaterialCommunityIcons name="account-circle" size={50} color="#ccc" />
            )}
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.display_name || 'Anonymous'}</Text>
            {isSearched && (
              <Text style={styles.userId} numberOfLines={1}>
                ID: {user.id}
              </Text>
            )}
            <StarRatingDisplay
              rating={user.rating_avg || 0}
              count={user.rating_count}
              size={14}
            />
          </View>

          {isSelected && (
            <MaterialCommunityIcons
              name="check-circle"
              size={24}
              color="#4CAF50"
              style={styles.checkIcon}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Who Found Your Item?</Text>
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* User ID Search Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Search by User ID</Text>
              <Text style={styles.sectionHint}>
                Ask the person for their user ID (found on their profile)
              </Text>

              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Paste user ID here..."
                  value={searchUserId}
                  onChangeText={(text) => {
                    setSearchUserId(text);
                    setSearchError('');
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Button
                  mode="contained"
                  onPress={handleSearchUser}
                  loading={searching}
                  disabled={searching || !searchUserId.trim()}
                  style={styles.searchButton}
                >
                  Search
                </Button>
              </View>

              {searchError && (
                <View style={styles.errorContainer}>
                  <MaterialCommunityIcons name="alert-circle" size={16} color="#f44336" />
                  <Text style={styles.errorText}>{searchError}</Text>
                </View>
              )}

              {searchedUser && (
                <View style={styles.searchResults}>
                  <Text style={styles.resultsLabel}>Search Result:</Text>
                  {renderUserCard(searchedUser, true)}
                </View>
              )}
            </View>

            {/* Suggested Users Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Suggested Users</Text>
              <Text style={styles.sectionHint}>
                People who commented on this post
              </Text>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#6200ee" />
                  <Text style={styles.loadingText}>Loading suggestions...</Text>
                </View>
              ) : suggestedUsers.length > 0 ? (
                <View style={styles.suggestedList}>
                  {suggestedUsers.map((user) => renderUserCard(user))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="account-search" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>No suggested users yet</Text>
                  <Text style={styles.emptyHint}>
                    Use the search above to find who returned your item
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Confirm Button */}
          <View style={styles.footer}>
            <Button
              mode="outlined"
              onPress={onCancel}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleConfirm}
              disabled={!selectedUser}
              style={styles.confirmButton}
              buttonColor="#6d28d9"
            >
              Confirm
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    maxHeight: 500,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  searchButton: {
    justifyContent: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 8,
    backgroundColor: '#ffebee',
    borderRadius: 6,
  },
  errorText: {
    fontSize: 13,
    color: '#f44336',
    flex: 1,
  },
  searchResults: {
    marginTop: 12,
  },
  resultsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  suggestedList: {
    gap: 8,
  },
  userCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
  },
  userCardSelected: {
    borderColor: '#4CAF50',
    borderWidth: 2,
    backgroundColor: '#f1f8f4',
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    marginRight: 12,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  userId: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  checkIcon: {
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 12,
  },
  emptyHint: {
    fontSize: 13,
    color: '#aaa',
    marginTop: 4,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 1,
  },
});
