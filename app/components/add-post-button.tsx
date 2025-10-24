import React from 'react';
import { StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';

export function AddPostButton({ onAddPost }) {
  return (
    <Button
      mode="contained"
      onPress={onAddPost}
      icon="plus"
      style={styles.button}
      labelStyle={styles.label}
      contentStyle={styles.content}
    >
      Add Post
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#00B3B3', // teal color
    borderRadius: 8,
    alignSelf: 'center',
    marginVertical: 10,
  },
  content: {
    flexDirection: 'row-reverse', // puts "+" before text
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  label: {
    fontWeight: 'bold',
    color: '#fff',
    fontSize: 16,
  },
});



/*import React, { useState } from "react";
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

interface AddPostButtonProps {
  onAddPost: (title: string, content: string) => void;
}

export function AddPostButton({ onAddPost }: AddPostButtonProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleCreate = () => {
    if (title.trim() && content.trim()) {
      onAddPost(title.trim(), content.trim());
      setTitle("");
      setContent("");
      setOpen(false);
    }
  };

  return (
    <View>
      {/* Button to trigger modal *//*}
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={styles.triggerText}>＋ Add Post</Text>
      </Pressable>

      {/* Modal for creating a new post *//*}
      <Modal
        visible={open}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalWrapper}
          >
            <View style={styles.modalCard}>
              <ScrollView contentContainerStyle={styles.modalContent}>
                <Text style={styles.modalTitle}>Create New Post</Text>
                <Text style={styles.modalDesc}>
                  Add a new post to share with the community.
                </Text>

                <View style={styles.field}>
                  <Text style={styles.label}>Title</Text>
                  <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Enter post title"
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Content</Text>
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    value={content}
                    onChangeText={setContent}
                    placeholder="Write your post content..."
                    multiline
                    textAlignVertical="top"
                  />
                </View>

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
  triggerText: {
    color: "#fff",
    fontWeight: "bold",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
  },
  modalWrapper: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    maxHeight: "90%",
    overflow: "hidden",
  },
  modalContent: {
    padding: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 14,
    color: "#444",
    marginBottom: 12,
  },
  field: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  textarea: {
    height: 120,
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
  btnPrimary: {
    backgroundColor: "#0ea5a4",
  },
  btnPrimaryText: {
    color: "#fff",
    fontWeight: "bold",
  },
  btnOutline: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  btnOutlineText: {
    color: "#111",
    fontWeight: "bold",
  },
});
*/