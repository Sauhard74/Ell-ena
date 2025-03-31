import React, { useState, useContext } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthContext } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { authAPI } from '../../services/api';
import { getTheme } from '../../styles/theme';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });
  
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const auth = useContext(AuthContext);
  const { isDark } = useTheme();
  const currentTheme = getTheme(isDark);
  
  const validateForm = () => {
    let valid = true;
    const newErrors = { email: '', password: '' };
    
    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email is required';
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email format is invalid';
      valid = false;
    }
    
    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
      valid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      valid = false;
    }
    
    setErrors(newErrors);
    return valid;
  };
  
  const handleLogin = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const response = await authAPI.login({ email, password });
      
      if (response.data && response.data.token) {
        // Call the signIn method from AuthContext
        auth.signIn(response.data.token, response.data.userId);
      } else {
        Alert.alert('Login Error', 'Invalid response from server');
      }
    } catch (error: any) {
      // Handle specific error responses
      if (error.response && error.response.status === 401) {
        Alert.alert('Authentication Failed', 'Invalid email or password');
      } else {
        Alert.alert('Login Error', 'An error occurred while logging in');
        console.error('Login error:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const navigateToRegister = () => {
    navigation.navigate('Register');
  };
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: currentTheme.colors.background }]}
    >
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { padding: currentTheme.spacing.l }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerContainer}>
          <Text style={[styles.title, { color: currentTheme.colors.primary }]}>Welcome to Ell-ena</Text>
          <Text style={[styles.subtitle, { color: currentTheme.colors.textSecondary }]}>Sign in to continue</Text>
        </View>
        
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: currentTheme.colors.textSecondary }]}>Email</Text>
            <TextInput
              style={[
                styles.input, 
                { 
                  borderColor: currentTheme.colors.border,
                  backgroundColor: isDark ? currentTheme.colors.card : '#f8f9fa',
                  color: currentTheme.colors.text
                }
              ]}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={currentTheme.colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.email ? <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{errors.email}</Text> : null}
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: currentTheme.colors.textSecondary }]}>Password</Text>
            <TextInput
              style={[
                styles.input, 
                { 
                  borderColor: currentTheme.colors.border,
                  backgroundColor: isDark ? currentTheme.colors.card : '#f8f9fa',
                  color: currentTheme.colors.text
                }
              ]}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={currentTheme.colors.textSecondary}
              secureTextEntry
            />
            {errors.password ? <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{errors.password}</Text> : null}
          </View>
          
          <TouchableOpacity 
            style={[styles.loginButton, { backgroundColor: currentTheme.colors.primary }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
          
          <View style={styles.registerContainer}>
            <Text style={[styles.registerText, { color: currentTheme.colors.textSecondary }]}>Don't have an account? </Text>
            <TouchableOpacity onPress={navigateToRegister}>
              <Text style={[styles.registerLink, { color: currentTheme.colors.primary }]}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  headerContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  errorText: {
    marginTop: 4,
    fontSize: 14,
  },
  loginButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  registerText: {
    fontSize: 14,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default LoginScreen; 