import React from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider } from './app/contexts/AuthContext';
import { AddPostProvider } from './app/contexts/AddPostContext';
import AppNavigator from './app/navigation/AppNavigator';
import ErrorBoundary from './app/components/error-boundary';

export default function App() {
  return (
    <ErrorBoundary>
      <PaperProvider>
        <AuthProvider>
          <AddPostProvider>
            <AppNavigator />
          </AddPostProvider>
        </AuthProvider>
      </PaperProvider>
    </ErrorBoundary>
  );
}