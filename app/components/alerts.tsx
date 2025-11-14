import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, Portal, Text, Button, TextInput, Switch, Checkbox, HelperText } from 'react-native-paper';
import { upsertUserNotificationSettings } from '../lib/notifications';

const CATEGORY_OPTIONS = ['Electronics', 'Pets', 'Accessories', 'Clothing', 'Other'];

export default function AlertsModal({ visible, onDismiss }) {
  const [enabled, setEnabled] = useState(true);
  const [keywords, setKeywords] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [radiusKm, setRadiusKm] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleCategory = (cat: string) => {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  const onSave = async () => {
    try {
      setSaving(true);
      const kw = keywords
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const radius = radiusKm.trim() ? Number(radiusKm) : null;
      await upsertUserNotificationSettings({
        enabled,
        keywords: kw,
        radius_km: Number.isFinite(radius as number) ? (radius as number) : null,
        category_prefs: categories,
      });
      onDismiss?.();
    } catch (e) {
      console.warn('[alerts] save failed', e?.message || e);
    } finally {
      setSaving(false);
    }
  };

  const radiusInvalid = radiusKm.trim().length > 0 && Number.isNaN(Number(radiusKm));

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
        <Text style={styles.title}>Alerts</Text>
        <Text style={styles.subtitle}>Get notified about potential matches</Text>

        <View style={styles.rowBetween}> 
          <Text style={styles.label}>Enable alerts</Text>
          <Switch value={enabled} onValueChange={setEnabled} />
        </View>

        <Text style={styles.label}>Keywords (comma-separated)</Text>
        <TextInput
          mode="outlined"
          placeholder="iphone, backpack, hydro flask"
          value={keywords}
          onChangeText={setKeywords}
          style={styles.input}
        />

        <Text style={styles.label}>Categories</Text>
        <View style={{ marginBottom: 8 }}>
          {CATEGORY_OPTIONS.map((c) => (
            <View key={c} style={styles.checkRow}>
              <Checkbox
                status={categories.includes(c) ? 'checked' : 'unchecked'}
                onPress={() => toggleCategory(c)}
              />
              <Text>{c}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.label}>Radius (km, optional)</Text>
        <TextInput
          mode="outlined"
          placeholder="e.g. 5"
          value={radiusKm}
          onChangeText={setRadiusKm}
          keyboardType="decimal-pad"
          style={styles.input}
        />
        <HelperText type="error" visible={radiusInvalid}>
          Enter a valid number
        </HelperText>

        <View style={styles.actions}>
          <Button mode="text" onPress={onDismiss} style={{ marginRight: 8 }}>
            Cancel
          </Button>
          <Button mode="contained" onPress={onSave} loading={saving} disabled={radiusInvalid || saving}>
            Save
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { marginBottom: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  checkRow: { flexDirection: 'row', alignItems: 'center' },
});
