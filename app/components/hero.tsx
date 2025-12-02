import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import FeaturesModal from './features-modal';

/**
 * Hero Component
 *
 * Main landing section displaying:
 * - FoundSC branding heading
 * - Intro text explaining the app's purpose
 * - "Learn More" button that opens features modal
 *
 * Removed elements (as per user request):
 * - "Now Available" badge with pinging animation
 * - "Start Searching" button
 * - "Report Found Item" button
 */
export function Hero() {
  // State to control features modal visibility
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      {/* Heading - "Discover What's Been Found" */}
      <Text style={styles.heading}>
        Discover What's Been <Text style={styles.accent}>Found</Text>
      </Text>

      {/* Intro text explaining the app's purpose */}
      <Text style={styles.subheading}>
        Connect lost items with their owners. A modern platform designed to reunite people with their belongings through community-driven discovery.
      </Text>

      {/* "Learn More" button - Opens modal with 4 feature cards */}
      <Button
        mode="outlined"
        style={styles.learnMoreButton}
        onPress={() => setModalVisible(true)}
        textColor="#0ea5a4"
      >
        Learn More
      </Button>

      {/* Features Modal - Shows when Learn More is clicked */}
      <FeaturesModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Container with reduced padding for compact layout, content appears right under header
  container: {
    paddingVertical: 16,     // Reduced from 40px to 16px to move content up
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  // Main heading - 32px for prominence
  heading: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  // Accent color for "Found" text - teal (#0ea5a4)
  accent: {
    color: '#0ea5a4',
  },
  // Intro text with 16px font size, centered
  subheading: {
    fontSize: 16,
    textAlign: 'center',
    color: '#555',
    marginBottom: 20,
  },
  // "Learn More" button - outlined style with teal color
  // marginTop: 8px provides spacing from intro text
  learnMoreButton: {
    marginTop: 8,
    borderRadius: 8,
    borderColor: '#0ea5a4',
  },
});
