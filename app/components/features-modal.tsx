import React from 'react';
import { View, Text, StyleSheet, Modal, FlatList, Pressable, ScrollView } from 'react-native';
import { Button, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * FeaturesModal Component
 *
 * Modal that displays the 4 key features of the FoundSC app.
 * Opened when user clicks "Learn More" button on the Hero section.
 *
 * Features displayed:
 * - 🔍 Smart Search
 * - 📍 Location-Based
 * - 🔔 Instant Alerts
 * - 🛡️ Secure & Private
 */

// Feature data (same as features.tsx)
const features = [
  {
    key: 'smart-search',
    icon: '🔍',
    title: 'Smart Search',
    description: 'Advanced filtering and search capabilities to quickly find what you\'re looking for.',
  },
  {
    key: 'location-based',
    icon: '📍',
    title: 'Location-Based',
    description: 'Discover found items near you with intelligent proximity matching.',
  },
  {
    key: 'instant-alerts',
    icon: '🔔',
    title: 'Instant Alerts',
    description: 'Get notified immediately when a matching item is reported found.',
  },
  {
    key: 'secure-private',
    icon: '🛡️',
    title: 'Secure & Private',
    description: 'Your information stays protected with verified users and secure messaging.',
  },
];

interface FeaturesModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function FeaturesModal({ visible, onDismiss }: FeaturesModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onDismiss}
    >
      {/* Semi-transparent backdrop */}
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Header with close button */}
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.heading}>Everything you need to reconnect</Text>
                <Text style={styles.subhead}>
                  Powerful features designed to make finding and returning lost items effortless.
                </Text>
              </View>
              <IconButton
                icon="close"
                size={24}
                onPress={onDismiss}
                style={styles.closeButton}
              />
            </View>

            {/* Features Grid */}
            <FlatList
              data={features}
              numColumns={2}
              columnWrapperStyle={styles.row}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  {/* Icon container with light teal background */}
                  <View style={styles.iconWrap}>
                    <Text style={styles.icon}>{item.icon}</Text>
                  </View>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardText}>{item.description}</Text>
                </View>
              )}
              contentContainerStyle={styles.list}
              scrollEnabled={false}
            />

            {/* Close button at bottom */}
            <Button
              mode="contained"
              onPress={onDismiss}
              style={styles.doneButton}
              buttonColor="#0ea5a4"
            >
              Got it
            </Button>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Backdrop covers entire screen with semi-transparent overlay
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal content container with white background and rounded corners
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  scrollContent: {
    padding: 20,
  },
  // Header section with title and close button
  header: {
    marginBottom: 20,
    position: 'relative',
  },
  headerText: {
    alignItems: 'center',
    paddingRight: 40, // Space for close button
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    color: '#111',
  },
  subhead: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Close button positioned in top-right corner
  closeButton: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  // Features grid layout
  list: {
    paddingTop: 8,
  },
  // Two columns with space between
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  // Individual feature card styling
  card: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  // Icon wrapper with light teal background (#eef6f6 matches original)
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#eef6f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  icon: {
    fontSize: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    color: '#111',
  },
  cardText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  // "Got it" button at bottom of modal
  doneButton: {
    marginTop: 20,
    borderRadius: 8,
  },
});
