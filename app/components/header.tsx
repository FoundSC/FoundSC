import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Header() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>FoundSC</Text>
      <Text style={styles.subtitle}>Reunite with your lost items</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: 18,
    paddingBottom: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
});

