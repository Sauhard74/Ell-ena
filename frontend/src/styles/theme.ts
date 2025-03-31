// App theme and style constants

// Colors for light mode
export const lightColors = {
  primary: '#0066cc',
  secondary: '#34c759',
  accent: '#5856d6',
  background: '#ffffff',
  card: '#f8f9fa',
  text: '#333333',
  textSecondary: '#666666',
  textLight: '#999999',
  border: '#e1e4e8',
  error: '#ff3b30',
  warning: '#ff9500',
  success: '#34c759',
  info: '#5ac8fa',
  
  // Task priorities
  priorityHigh: '#ff3b30',
  priorityMedium: '#ff9500',
  priorityLow: '#34c759',
  
  // Task status
  statusActive: '#0066cc',
  statusCompleted: '#34c759',
  statusArchived: '#999999',
};

// Colors for dark mode
export const darkColors = {
  primary: '#0a84ff',
  secondary: '#30d158',
  accent: '#5e5ce6',
  background: '#1c1c1e',
  card: '#2c2c2e',
  text: '#ffffff',
  textSecondary: '#ebebf5',
  textLight: '#8e8e93',
  border: '#38383a',
  error: '#ff453a',
  warning: '#ff9f0a',
  success: '#30d158',
  info: '#64d2ff',
  
  // Task priorities
  priorityHigh: '#ff453a',
  priorityMedium: '#ff9f0a',
  priorityLow: '#30d158',
  
  // Task status
  statusActive: '#0a84ff',
  statusCompleted: '#30d158',
  statusArchived: '#8e8e93',
};

// Typography
export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    tiny: 12,
    small: 14,
    medium: 16,
    large: 18,
    xl: 22,
    xxl: 28,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    loose: 1.8,
  },
};

// Spacing
export const spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
};

// Border radius
export const borderRadius = {
  small: 4,
  medium: 8,
  large: 16,
  round: 9999,
};

// Shadows for light mode
export const lightShadows = {
  light: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  strong: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};

// Shadows for dark mode (more subtle)
export const darkShadows = {
  light: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  strong: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
};

// Function to get the theme based on mode
export const getTheme = (isDark: boolean = false) => ({
  colors: isDark ? darkColors : lightColors,
  typography,
  spacing,
  borderRadius,
  shadows: isDark ? darkShadows : lightShadows,
});

// Default is light theme
const theme = getTheme(false);
export default theme; 