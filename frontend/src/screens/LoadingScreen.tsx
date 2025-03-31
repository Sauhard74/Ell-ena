import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { getTheme } from '../styles/theme';

const LoadingScreen = () => {
  const { isDark } = useTheme();
  const currentTheme = getTheme(isDark);

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
      <ActivityIndicator size="large" color={currentTheme.colors.primary} />
      <Text style={[styles.text, { color: currentTheme.colors.text }]}>
        Loading...
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 10,
    fontSize: 16,
  }
});

export default LoadingScreen; 