import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Header Component
 *
 * Displays the app branding at the top of the Home screen:
 * - "FoundSC" title - left-aligned, compact app name
 * - Removed subtitle for cleaner, more compact design
 *
 * Background color: teal (#0ea5a4) for brand consistency
 */
export default function Header() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>FoundSC</Text>
    </View>
  );
}

// Styles for the Header component
const styles = StyleSheet.create({
  // Container with teal background, left-aligned for compact header
  container: {
    width: '100%',
    paddingTop: 16,      // 16px top padding for compact design
    paddingBottom: 16,   // 16px bottom padding for balance
    paddingHorizontal: 16,
    alignItems: 'flex-start', // Left-align instead of center
    backgroundColor: '#0ea5a4', // Teal brand color
  },
  // App title - 20px (30% smaller than 28px) for compact header
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5, // Slight letter spacing for modern look
  },
});

