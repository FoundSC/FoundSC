import React from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider } from './app/contexts/AuthContext';
import AppNavigator from './app/navigation/AppNavigator';
import ErrorBoundary from './app/components/error-boundary';

export default function App() {
  return (
    <ErrorBoundary>
      <PaperProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </PaperProvider>
    </ErrorBoundary>
  );
}