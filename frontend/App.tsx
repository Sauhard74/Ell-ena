import React, { useState, useEffect, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthContext } from './src/contexts/AuthContext';
import { ThemeProvider, ThemeContext } from './src/contexts/ThemeContext';
import { TOKEN_KEY, USER_ID_KEY } from './src/constants/storage';
import MainStack from './src/navigation/MainStack';
import AuthStack from './src/navigation/AuthStack';
import LoadingScreen from './src/screens/LoadingScreen';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const bootstrapAsync = async () => {
      try {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        const id = await AsyncStorage.getItem(USER_ID_KEY);
        
        // Set the user token and id if they exist
        setUserToken(token);
        setUserId(id);
      } catch (error) {
        console.error('Error retrieving auth token', error);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  // Authentication context
  const authContext = useMemo(
    () => ({
      signIn: async (token: string, id: string) => {
        try {
          await AsyncStorage.setItem(TOKEN_KEY, token);
          await AsyncStorage.setItem(USER_ID_KEY, id);
          setUserToken(token);
          setUserId(id);
        } catch (error) {
          console.error('Error storing auth token', error);
        }
      },
      signOut: async () => {
        try {
          await AsyncStorage.removeItem(TOKEN_KEY);
          await AsyncStorage.removeItem(USER_ID_KEY);
          setUserToken(null);
          setUserId(null);
        } catch (error) {
          console.error('Error removing auth token', error);
        }
      },
      token: userToken,
      userId: userId,
    }),
    [userToken, userId]
  );

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider>
      <ThemeContext.Consumer>
        {({ isDark }) => (
          <SafeAreaProvider>
            <AuthContext.Provider value={authContext}>
              <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
                {userToken ? <MainStack /> : <AuthStack />}
              </NavigationContainer>
            </AuthContext.Provider>
            <StatusBar style={isDark ? "light" : "dark"} />
          </SafeAreaProvider>
        )}
      </ThemeContext.Consumer>
    </ThemeProvider>
  );
} 