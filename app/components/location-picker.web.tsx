import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Button, Chip } from 'react-native-paper';

interface LocationPickerProps {
  onLocationSelect: (latitude: number, longitude: number) => void;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
}

export default function LocationPicker({
  onLocationSelect,
  initialLatitude,
  initialLongitude,
}: LocationPickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Location (Optional)</Text>
      <Text style={styles.hint}>
        Map features are only available on mobile devices (iOS/Android)
      </Text>

      <View style={styles.webNotice}>
        <Text style={styles.webNoticeText}>
          To add a location to your post, please use the mobile app.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  webNotice: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  webNoticeText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
