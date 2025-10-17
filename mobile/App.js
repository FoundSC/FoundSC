import 'react-native-url-polyfill/auto';
import React from 'react';
import { SafeAreaView, Text, Button, StyleSheet, View } from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>FoundSC</Text>
      <View style={styles.row}>
        <Button title="Press me" onPress={() => alert('Hello from FoundSC')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 16 },
  row: { width: '100%' },
});

