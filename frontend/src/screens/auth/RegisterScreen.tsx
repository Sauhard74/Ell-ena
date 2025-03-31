import React, { useState } from 'react';
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
import { authAPI } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { getTheme } from '../../styles/theme';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

const RegisterScreen = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    confirmPassword: '' 
  });
  
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const { isDark } = useTheme();
  const currentTheme = getTheme(isDark);
  
  const validateForm = () => {
    let valid = true;
    const newErrors = { 
      name: '', 
      email: '', 
      password: '', 
      confirmPassword: '' 
    };
    
    // Name validation
    if (!name.trim()) {
      newErrors.name = 'Name is required';
      valid = false;
    }
    
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
    
    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      valid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      valid = false;
    }
    
    setErrors(newErrors);
    return valid;
  };
  
  const handleRegister = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      await authAPI.register({ name, email, password });
      Alert.alert(
        'Registration Successful',
        'Your account has been created. You can now log in.',
        [
          { 
            text: 'OK', 
            onPress: () => navigation.navigate('Login')
          }
        ]
      );
    } catch (error: any) {
      if (error.response && error.response.data) {
        // Handle specific error responses from the server
        if (error.response.status === 409) {
          Alert.alert('Registration Failed', 'An account with this email already exists');
        } else {
          Alert.alert('Registration Failed', error.response.data.message || 'An error occurred during registration');
        }
      } else {
        Alert.alert('Registration Error', 'An unexpected error occurred');
        console.error('Register error:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const navigateToLogin = () => {
    navigation.navigate('Login');
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
          <Text style={[styles.title, { color: currentTheme.colors.primary }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: currentTheme.colors.textSecondary }]}>Join Ell-ena today</Text>
        </View>
        
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: currentTheme.colors.textSecondary }]}>Name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: currentTheme.colors.border,
                  backgroundColor: isDark ? currentTheme.colors.card : '#f8f9fa',
                  color: currentTheme.colors.text
                }
              ]}
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor={currentTheme.colors.textSecondary}
              autoCapitalize="words"
            />
            {errors.name ? <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{errors.name}</Text> : null}
          </View>
          
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
              placeholder="Create a password"
              placeholderTextColor={currentTheme.colors.textSecondary}
              secureTextEntry
            />
            {errors.password ? <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{errors.password}</Text> : null}
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: currentTheme.colors.textSecondary }]}>Confirm Password</Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: currentTheme.colors.border,
                  backgroundColor: isDark ? currentTheme.colors.card : '#f8f9fa',
                  color: currentTheme.colors.text
                }
              ]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your password"
              placeholderTextColor={currentTheme.colors.textSecondary}
              secureTextEntry
            />
            {errors.confirmPassword ? <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{errors.confirmPassword}</Text> : null}
          </View>
          
          <TouchableOpacity 
            style={[styles.registerButton, { backgroundColor: currentTheme.colors.primary }]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.registerButtonText}>Sign Up</Text>
            )}
          </TouchableOpacity>
          
          <View style={styles.loginContainer}>
            <Text style={[styles.loginText, { color: currentTheme.colors.textSecondary }]}>Already have an account? </Text>
            <TouchableOpacity onPress={navigateToLogin}>
              <Text style={[styles.loginLink, { color: currentTheme.colors.primary }]}>Sign In</Text>
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
  registerButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  loginText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default RegisterScreen; 