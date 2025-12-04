// Screen for requesting a password reset via email.
// Uses AuthContext.resetPassword to trigger Supabase (or backend) password reset flow.

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Button } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';

export default function ForgotPasswordScreen({ navigation }: any) {
  // Local form state for email and loading feedback
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // Auth context provides resetPassword(email): Promise<{ error?: Error }>
  const { resetPassword } = useAuth();

  // Handler to validate input and invoke the reset password flow
  const handleResetPassword = async () => {
    // Simple validation: require non-empty email string
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    setLoading(true);
    // Call into AuthContext; implementation should send reset instructions
    const { error } = await resetPassword(email);
    setLoading(false);

    // Show success or error feedback
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert(
        'Success',
        'Password reset instructions have been sent to your email.',
        // After success, return the user to Login screen
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    }
  };

  return (
    // KeyboardAvoidingView ensures inputs remain visible when the keyboard opens
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Header: title and brief instructions */}
        <View style={styles.header}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your email and we'll send you instructions to reset your password
          </Text>
        </View>

        {/* Form: email input and action buttons */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          {/* Primary action: trigger reset flow; shows loading state */}
          <Button
            mode="contained"
            onPress={handleResetPassword}
            loading={loading}
            disabled={loading}
            style={styles.resetButton}
            buttonColor="#0ea5a4"
          >
            Send Reset Link
          </Button>

          {/* Secondary action: navigate back to Login */}
          <Button
            mode="text"
            onPress={() => navigation.navigate('Login')}
            style={styles.backButton}
          >
            Back to Sign In
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// Basic styles for layout and typography
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  resetButton: {
    borderRadius: 8,
    paddingVertical: 6,
    marginTop: 8,
  },
  backButton: {
    marginTop: 16,
  },
});