import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

interface AddPostButtonProps {
  onAddPost: (
    title: string,
    description: string,
    type: string,
    category: string,
    image_url?: string
  ) => void;
}

export function AddPostButton({ onAddPost }: AddPostButtonProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("lost");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  
  const handleCreate = () => {
    if (!title.trim() || !description.trim() || !category.trim()) {
      alert("Please fill out all required fields.");
      return;
    }

    onAddPost(
      title.trim(),
      description.trim(),
      type,
      category.trim(),
      imageUrl.trim() || undefined
    );

    setTitle("");
    setDescription("");
    setCategory("");
    setImageUrl("");
    setType("lost");
    setOpen(false);
  };

  return (
    <View>
      {/* Trigger Button */}
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={styles.triggerText}>＋ Add Post</Text>
      </Pressable>

      {/* Modal */}
      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalWrapper}
          >
            <View style={styles.modalCard}>
              <ScrollView contentContainerStyle={styles.modalContent}>
                <Text style={styles.modalTitle}>Create Lost/Found Post</Text>
                <Text style={styles.modalDesc}>
                  Add a new item you lost or found on campus.
                </Text>

                {/* Title */}
                <View style={styles.field}>
                  <Text style={styles.label}>Title *</Text>
                  <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="E.g., Lost iPhone near library"
                  />
                </View>

                {/* Description */}
                <View style={styles.field}>
                  <Text style={styles.label}>Description *</Text>
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Describe the item..."
                    multiline
                    textAlignVertical="top"
                  />
                </View>

                {/* Type Picker */}
                <View style={styles.field}>
                  <Text style={styles.label}>Type *</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker selectedValue={type} onValueChange={(val) => setType(val)}>
                      <Picker.Item label="Lost" value="lost" />
                      <Picker.Item label="Found" value="found" />
                    </Picker>
                  </View>
                </View>

                {/* Category */}
                <View style={styles.field}>
                  <Text style={styles.label}>Category *</Text>
                  <TextInput
                    style={styles.input}
                    value={category}
                    onChangeText={setCategory}
                    placeholder="E.g., Electronics, Clothing, ID Cards"
                  />
                </View>

                {/* Image URL (optional) */}
                <View style={styles.field}>
                  <Text style={styles.label}>Image URL (optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={imageUrl}
                    onChangeText={setImageUrl}
                    placeholder="Paste image link here"
                  />
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                  <Pressable
                    style={[styles.btn, styles.btnOutline]}
                    onPress={() => setOpen(false)}
                  >
                    <Text style={styles.btnOutlineText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.btn, styles.btnPrimary]}
                    onPress={handleCreate}
                  >
                    <Text style={styles.btnPrimaryText}>Create Post</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    backgroundColor: "#0ea5a4",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  triggerText: { color: "#fff", fontWeight: "bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center" },
  modalWrapper: { flex: 1, justifyContent: "center", padding: 20 },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    maxHeight: "90%",
    overflow: "hidden",
  },
  modalContent: { padding: 16 },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 6 },
  modalDesc: { fontSize: 14, color: "#444", marginBottom: 12 },
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "bold", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  textarea: { height: 100 },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    overflow: "hidden",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginLeft: 8,
  },
  btnPrimary: { backgroundColor: "#0ea5a4" },
  btnPrimaryText: { color: "#fff", fontWeight: "bold" },
  btnOutline: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  btnOutlineText: { color: "#111", fontWeight: "bold" },
});
