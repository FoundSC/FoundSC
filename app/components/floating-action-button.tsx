import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * FloatingActionButton (FAB) Component
 *
 * A fixed-position circular button that floats above all content.
 * Used for the primary action - creating a new post.
 *
 * Design specifications:
 * - Position: Bottom-right corner, right above navigation tabs
 * - Size: 56x56px (standard FAB size)
 * - Color: Teal (#00B3B3) matching app theme
 * - Icon: Plus (+) symbol in white
 * - Shadow: Elevated appearance for prominence
 *
 * @param onPress - Function to call when FAB is pressed (opens add post modal)
 */

interface FloatingActionButtonProps {
  onPress: () => void;
}

export default function FloatingActionButton({ onPress }: FloatingActionButtonProps) {
  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <MaterialCommunityIcons name="plus" size={28} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // FAB positioned in bottom-right corner, right above navigation tabs
  fab: {
    position: 'absolute',
    right: 20,            // 20px from right edge
    bottom: 14,           // 14px from bottom - lowered by button height (70 - 56 = 14)
    width: 56,            // Standard FAB size
    height: 56,           // Standard FAB size
    borderRadius: 28,     // Half of width/height for perfect circle
    backgroundColor: '#00B3B3', // Teal color matching AddPostButton
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow for elevation (makes FAB appear floating)
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,     // Android elevation for shadow
      },
    }),
  },
});
