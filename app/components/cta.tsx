import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

export default function CTA() {
  return (
    <View style={styles.section}>
      <View style={styles.card}>
        <Text style={styles.title}>Ready to get started?</Text>
        <Text style={styles.copy}>
          Join thousands of users who have successfully reunited with their lost items through FoundSC.
        </Text>
        <View style={styles.actions}>
          <Pressable style={styles.primary} onPress={() => { /* navigate or open modal */ }}>
            <Text style={styles.primaryText}>Get Started</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => { /* maybe learn more */ }}>
            <Text style={styles.secondaryText}>Learn more</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingVertical: 20, width: '100%' },
  card: {
    marginHorizontal: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#0ea5a4',
    alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8, textAlign: 'center' },
  copy: { fontSize: 14, color: 'rgba(255,255,255,0.9)', textAlign: 'center' },
  actions: { flexDirection: 'row', marginTop: 12, gap: 8 },
  primary: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginRight: 8,
  },
  primaryText: { color: '#0ea5a4', fontWeight: '700' },
  secondary: {
    borderColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  secondaryText: { color: '#fff', fontWeight: '600' },
});
