// screens/AddPostScreen.js
import { useState } from 'react';
import { View, TextInput, Button, Text, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

export default function AddPostScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('lost'); // simple toggle in UI
  const [category, setCategory] = useState('');
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8
    });
    if (!res.canceled) {
      setImage(res.assets[0]);
    }
  };

  const uploadImageIfAny = async () => {
    if (!image) return null;
    const ext = image.fileName?.split('.').pop() || 'jpg';
    const path = `items/${Date.now()}.${ext}`;

    const file = await fetch(image.uri);
    const blob = await file.blob();

    const { error } = await supabase.storage.from('items').upload(path, blob, {
      upsert: false,
      contentType: blob.type || 'image/jpeg'
    });
    if (error) throw error;

    const { data } = supabase.storage.from('items').getPublicUrl(path);
    return data.publicUrl;
  };

  const onSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Validation', 'Title and description are required');
      return;
    }
    setSubmitting(true);
    try {
      const imageUrl = await uploadImageIfAny();
      const { error } = await supabase.from('posts').insert({
        title,
        description,
        type,
        category,
        image_url: imageUrl
      });
      if (error) throw error;
      Alert.alert('Success', 'Post created');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ padding: 16, gap: 8 }}>
      <TextInput placeholder="Title" value={title} onChangeText={setTitle} />
      <TextInput placeholder="Description" value={description} onChangeText={setDescription} multiline />
      <TextInput placeholder="Type lost or found" value={type} onChangeText={setType} />
      <TextInput placeholder="Category" value={category} onChangeText={setCategory} />
      <Button title="Pick Image" onPress={pickImage} />
      {image && <Image source={{ uri: image.uri }} style={{ width: 160, height: 160 }} />}
      <Button title={submitting ? 'Submitting…' : 'Create Post'} onPress={onSubmit} disabled={submitting} />
    </View>
  );
}
