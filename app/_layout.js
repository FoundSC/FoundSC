import { Stack } from 'expo-router';
import { AuthProvider } from './contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Sign In' }} />
        <Stack.Screen name="signup" options={{ title: 'Create Account' }} />
      </Stack>
    </AuthProvider>
  );
}
