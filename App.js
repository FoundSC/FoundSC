import React from 'react';
import AppComponent from './app/App';
import ErrorBoundary from './app/components/error-boundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AppComponent />
    </ErrorBoundary>
  );
}