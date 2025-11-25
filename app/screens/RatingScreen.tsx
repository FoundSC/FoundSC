import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import StarRating from '../components/star-rating';
import { getExchangeById, hasUserRated } from '../lib/exchanges';
import { submitRating } from '../lib/ratings';

/**
 * RatingScreen Component
 *
 * Allows users to rate each other after a successful exchange (like Uber/Lyft).
 * This screen is shown after the post owner marks an item as "Found".
 *
 * Flow:
 * 1. Lost/found post matched → users meet up
 * 2. Owner clicks "Found" button → creates exchange
 * 3. Both users navigate here to rate each other
 * 4. After both rate → post closes as found, ratings update user profiles
 *
 * Features:
 * - 5-star interactive rating selection
 * - Optional text comment (max 500 characters)
 * - Shows who you're rating (name, picture, rating)
 * - Prevents double-rating (can only rate once per exchange)
 * - Visual feedback during submission
 *
 * @param route - Navigation params: { exchangeId: number }
 * @param navigation - React Navigation object
 */
export default function RatingScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { exchangeId } = route.params;

  // Exchange data
  const [exchange, setExchange] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [alreadyRated, setAlreadyRated] = useState(false);

  // Rating form state
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadExchangeData();
  }, [exchangeId]);

  /**
   * Load exchange data and check if user already rated
   *
   * Process:
   * 1. Fetch exchange with post and user profile data
   * 2. Determine who the other participant is (post owner or finder)
   * 3. Check if current user already submitted a rating
   * 4. If already rated, show read-only confirmation
   */
  const loadExchangeData = async () => {
    if (!user?.id) return;

    setLoading(true);

    // Fetch exchange details
    const { data: exchangeData, error: exchangeError } = await getExchangeById(exchangeId);

    if (exchangeError || !exchangeData) {
      console.error('Error loading exchange:', exchangeError);
      Alert.alert('Error', 'Failed to load exchange details', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      return;
    }

    setExchange(exchangeData);

    // Determine who to rate (the other person in the exchange)
    // If current user is post owner, rate the finder
    // If current user is finder, rate the post owner
    const isOwner = exchangeData.post_owner_id === user.id;
    const otherUserId = isOwner ? exchangeData.finder_id : exchangeData.post_owner_id;
    const otherUserProfile = isOwner
      ? exchangeData.finder_profile
      : exchangeData.post_owner_profile;

    setOtherUser(otherUserProfile);

    // Check if user already rated
    const { hasRated } = await hasUserRated(exchangeId, user.id);
    setAlreadyRated(hasRated);

    setLoading(false);
  };

  /**
   * Validate and submit rating
   *
   * Validation:
   * - Rating: Must be 1-5 stars (required)
   * - Comment: Optional, max 500 characters
   *
   * Process:
   * 1. Validate rating selection
   * 2. Trim and validate comment length
   * 3. Submit to database via submitRating utility
   * 4. Database trigger calculates new rating average
   * 5. Database trigger completes exchange if both users rated
   * 6. Navigate back to post detail or home
   */
  const handleSubmitRating = async () => {
    if (!user?.id || !otherUser?.id) return;

    // Validate rating selection (1-5 stars required)
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating');
      return;
    }

    // Validate comment length if provided
    // 500 characters max prevents database overflow and encourages conciseness
    if (comment.trim().length > 500) {
      Alert.alert('Comment Too Long', 'Comment must be less than 500 characters');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await submitRating(
        exchangeId,
        user.id,
        otherUser.id,
        rating,
        comment.trim() || undefined
      );

      if (error) {
        console.error('Error submitting rating:', error);
        Alert.alert('Error', error.message || 'Failed to submit rating');
        setSubmitting(false);
        return;
      }

      // On success show confirmation and navigate away
      Alert.alert(
        'Rating Submitted',
        'Thank you for your feedback! Your rating has been saved.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to previous screen (probably post detail)
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6d28d9" />
        <Text style={styles.loadingText}>Loading exchange details...</Text>
      </View>
    );
  }

  if (alreadyRated) {
    // User already rated - show confirmation screen
    return (
      <View style={styles.container}>
        <View style={styles.alreadyRatedContainer}>
          <MaterialCommunityIcons name="check-circle" size={80} color="#4CAF50" />
          <Text style={styles.alreadyRatedTitle}>Rating Submitted</Text>
          <Text style={styles.alreadyRatedText}>
            You've already rated this exchange. Thank you for your feedback!
          </Text>
          <Text style={styles.alreadyRatedHint}>
            Waiting for the other person to rate...
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={styles.doneButton}
            buttonColor="#6d28d9"
          >
            Done
          </Button>
        </View>
      </View>
    );
  }

  if (!exchange || !otherUser) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={64} color="#f44336" />
        <Text style={styles.errorText}>Exchange not found</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header Section - Explains what's happening */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="star-circle" size={48} color="#FFD700" />
          <Text style={styles.title}>Rate Your Exchange</Text>
          <Text style={styles.subtitle}>
            How was your experience with{' '}
            {otherUser.display_name || 'this user'}?
          </Text>
        </View>

        {/* Exchange Context - Shows what item this is about */}
        {exchange.post && (
          <View style={styles.contextCard}>
            <MaterialCommunityIcons name="package-variant" size={24} color="#666" />
            <View style={styles.contextInfo}>
              <Text style={styles.contextLabel}>Item</Text>
              <Text style={styles.contextText}>{exchange.post.title}</Text>
            </View>
          </View>
        )}

        {/* User Being Rated Card */}
        <View style={styles.userCard}>
          <Text style={styles.sectionTitle}>Rating</Text>

          {/* User Avatar and Name */}
          <View style={styles.userInfo}>
            {otherUser.profile_picture ? (
              <Image
                source={{ uri: otherUser.profile_picture }}
                style={styles.userAvatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <MaterialCommunityIcons name="account" size={40} color="#999" />
              </View>
            )}

            <View style={styles.userDetails}>
              <Text style={styles.userName}>
                {otherUser.display_name || 'Anonymous User'}
              </Text>
              {/* Show their existing rating if they have one */}
              {otherUser.rating_count > 0 && (
                <View style={styles.existingRating}>
                  <MaterialCommunityIcons name="star" size={14} color="#FFD700" />
                  <Text style={styles.ratingText}>
                    {otherUser.rating_avg?.toFixed(1)} ({otherUser.rating_count})
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Interactive Star Rating */}
          <View style={styles.ratingSection}>
            <Text style={styles.ratingLabel}>
              {rating === 0
                ? 'Tap to rate'
                : `${rating} star${rating !== 1 ? 's' : ''}`}
            </Text>
            <StarRating
              rating={rating}
              maxRating={5}
              size={48} // Large stars (48px) for easy tapping
              interactive={true}
              onRatingChange={setRating}
              color="#FFD700" // Gold color
            />
          </View>

          {/* Rating Guidelines - Help users understand the scale */}
          <View style={styles.guidelinesSection}>
            <Text style={styles.guidelinesTitle}>Rating Guide:</Text>
            <Text style={styles.guidelineItem}>⭐ Poor - Major issues</Text>
            <Text style={styles.guidelineItem}>⭐⭐ Fair - Some problems</Text>
            <Text style={styles.guidelineItem}>⭐⭐⭐ Good - Met expectations</Text>
            <Text style={styles.guidelineItem}>⭐⭐⭐⭐ Very Good - Exceeded expectations</Text>
            <Text style={styles.guidelineItem}>⭐⭐⭐⭐⭐ Excellent - Outstanding experience</Text>
          </View>
        </View>

        {/* Comment Section (Optional) */}
        <View style={styles.commentCard}>
          <Text style={styles.sectionTitle}>Comment (Optional)</Text>
          <Text style={styles.sectionHint}>
            Share more about your experience
          </Text>

          <TextInput
            style={styles.commentInput}
            placeholder="E.g., Very friendly and punctual!"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            maxLength={500} // Enforce at input level
            textAlignVertical="top" // Align text to top in multiline input
          />

          {/* Character counter */}
          <Text style={styles.charCounter}>
            {comment.length}/500 characters
          </Text>
        </View>

        {/* Submit Button */}
        <Button
          mode="contained"
          onPress={handleSubmitRating}
          loading={submitting}
          disabled={submitting || rating === 0}
          style={styles.submitButton}
          buttonColor="#6d28d9"
          icon="send"
        >
          Submit Rating
        </Button>

        {/* Help Text */}
        <View style={styles.helpSection}>
          <MaterialCommunityIcons name="information-outline" size={16} color="#999" />
          <Text style={styles.helpText}>
            Your rating helps maintain a safe and reliable community
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 24, // Standard padding for consistency
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginVertical: 16,
  },

  // Already rated screen
  alreadyRatedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  alreadyRatedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    marginTop: 16,
    marginBottom: 8,
  },
  alreadyRatedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  alreadyRatedHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  doneButton: {
    borderRadius: 8,
    paddingHorizontal: 32,
  },

  // Header section
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Exchange context card
  contextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  contextInfo: {
    marginLeft: 12,
    flex: 1,
  },
  contextLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  contextText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },

  // User card - shows who you're rating
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  // 80x80 avatar - large enough to recognize person
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  existingRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },

  // Star rating section
  ratingSection: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },

  // Rating guidelines - helps users choose appropriate rating
  guidelinesSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#fafafa',
    borderRadius: 8,
  },
  guidelinesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  guidelineItem: {
    fontSize: 12,
    color: '#666',
    marginVertical: 2,
    lineHeight: 18,
  },

  // Comment section
  commentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionHint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  // Multiline input for comment - 120px height gives ~4-5 lines
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#fff',
    minHeight: 120, // Room for several lines of text
    marginBottom: 8,
  },
  charCounter: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },

  // Submit button
  submitButton: {
    borderRadius: 8,
    paddingVertical: 6,
    marginBottom: 12,
  },

  // Help section at bottom
  helpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  helpText: {
    fontSize: 13,
    color: '#999',
    marginLeft: 6,
  },
});
