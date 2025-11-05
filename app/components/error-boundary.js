import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <ScrollView>
            <Text style={styles.title}>Something went wrong!</Text>
            <Text style={styles.error}>{this.state.error?.toString()}</Text>
            <Text style={styles.stack}>{this.state.errorInfo?.componentStack}</Text>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fee',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#c00',
    marginBottom: 10,
  },
  error: {
    fontSize: 16,
    color: '#900',
    marginBottom: 10,
  },
  stack: {
    fontSize: 12,
    color: '#600',
    fontFamily: 'monospace',
  },
});

export default ErrorBoundary;
