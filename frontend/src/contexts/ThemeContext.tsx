import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_SETTINGS_KEY } from '../constants/storage';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  isDark: boolean;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  isDark: false,
});

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>('light');
  
  useEffect(() => {
    // Load saved theme preference from storage
    const loadTheme = async () => {
      try {
        const settings = await AsyncStorage.getItem(APP_SETTINGS_KEY);
        if (settings) {
          const { darkMode } = JSON.parse(settings);
          if (darkMode !== undefined) {
            setTheme(darkMode ? 'dark' : 'light');
          }
        }
      } catch (error) {
        console.error('Failed to load theme settings', error);
      }
    };
    
    loadTheme();
  }, []);
  
  const toggleTheme = async () => {
    try {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      
      // Save theme preference to storage
      const settings = await AsyncStorage.getItem(APP_SETTINGS_KEY);
      const parsedSettings = settings ? JSON.parse(settings) : {};
      
      await AsyncStorage.setItem(
        APP_SETTINGS_KEY,
        JSON.stringify({
          ...parsedSettings,
          darkMode: newTheme === 'dark',
        })
      );
    } catch (error) {
      console.error('Failed to save theme settings', error);
    }
  };
  
  return (
    <ThemeContext.Provider 
      value={{ 
        theme, 
        toggleTheme,
        isDark: theme === 'dark' 
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook for using theme
export const useTheme = () => useContext(ThemeContext); 