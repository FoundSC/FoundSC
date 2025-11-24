import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  showCount?: boolean;
  count?: number;
  color?: string;
}

/**
 * Star Rating Component
 * Can be used for display (read-only) or interactive (clickable)
 */
export default function StarRating({
  rating,
  maxRating = 5,
  size = 24,
  interactive = false,
  onRatingChange,
  showCount = false,
  count,
  color = '#FFD700',
}: StarRatingProps) {
  const handleStarPress = (starRating: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(starRating);
    }
  };

  const renderStar = (index: number) => {
    const starValue = index + 1;
    const isFilled = starValue <= rating;
    const isHalfFilled = !isFilled && starValue - 0.5 === rating;

    let iconName: any = 'star-outline';
    if (isFilled) {
      iconName = 'star';
    } else if (isHalfFilled) {
      iconName = 'star-half-full';
    }

    const StarComponent = interactive ? TouchableOpacity : View;

    return (
      <StarComponent
        key={index}
        onPress={() => handleStarPress(starValue)}
        disabled={!interactive}
        style={styles.starButton}
      >
        <MaterialCommunityIcons
          name={iconName}
          size={size}
          color={color}
        />
      </StarComponent>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.starsContainer}>
        {Array.from({ length: maxRating }, (_, i) => renderStar(i))}
      </View>
      {showCount && count !== undefined && (
        <Text style={styles.countText}>({count})</Text>
      )}
    </View>
  );
}

/**
 * Display-only star rating with text
 */
export function StarRatingDisplay({
  rating,
  count,
  size = 16,
}: {
  rating: number;
  count?: number;
  size?: number;
}) {
  if (count === 0 || !rating) {
    return (
      <Text style={styles.noRatingText}>No ratings yet</Text>
    );
  }

  return (
    <View style={styles.displayContainer}>
      <StarRating
        rating={rating}
        size={size}
        interactive={false}
      />
      <Text style={styles.ratingText}>
        {rating.toFixed(1)}
        {count !== undefined && ` (${count})`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starButton: {
    marginHorizontal: 2,
  },
  countText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  displayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  noRatingText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});
