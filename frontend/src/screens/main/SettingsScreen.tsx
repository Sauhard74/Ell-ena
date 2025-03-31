import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../../contexts/AuthContext';
import { ThemeContext, useTheme } from '../../contexts/ThemeContext';
import { userAPI } from '../../services/api';
import { getTheme } from '../../styles/theme';
import { APP_SETTINGS_KEY } from '../../constants/storage';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface AppSettings {
  notifications: boolean;
  darkMode: boolean;
  soundEffects: boolean;
  autoSaveChat: boolean;
}

const defaultSettings: AppSettings = {
  notifications: true,
  darkMode: false,
  soundEffects: true,
  autoSaveChat: true,
};

const SettingsScreen = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const auth = useContext(AuthContext);
  const { isDark, toggleTheme } = useTheme();
  
  // Use dynamic theme based on current theme mode
  const currentTheme = getTheme(isDark);
  
  useEffect(() => {
    loadUserProfile();
    loadSettings();
  }, []);
  
  const loadUserProfile = async () => {
    try {
      const response = await userAPI.getProfile();
      if (response.data && response.data.user) {
        setUserProfile(response.data.user);
      }
    } catch (error) {
      console.error('Error loading user profile', error);
      Alert.alert('Error', 'Failed to load user profile');
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadSettings = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem(APP_SETTINGS_KEY);
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
    } catch (error) {
      console.error('Error loading settings', error);
    }
  };
  
  const saveSettings = async (updatedSettings: AppSettings) => {
    try {
      await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Error saving settings', error);
    }
  };
  
  const handleToggleSetting = (key: keyof AppSettings) => {
    const updatedSettings = {
      ...settings,
      [key]: !settings[key]
    };
    
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
    
    // If dark mode is toggled, also update the theme context
    if (key === 'darkMode') {
      toggleTheme();
    }
  };
  
  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Logout',
          onPress: () => {
            auth.signOut();
          }
        }
      ]
    );
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={currentTheme.colors.primary} />
        <Text style={[styles.loadingText, { color: currentTheme.colors.text }]}>Loading settings...</Text>
      </View>
    );
  }
  
  return (
    <ScrollView style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
      {/* User Profile Section */}
      <View style={[styles.profileSection, { backgroundColor: currentTheme.colors.card }]}>
        <View style={styles.profileHeader}>
          <View style={[styles.avatarContainer, { backgroundColor: currentTheme.colors.primary }]}>
            <Text style={styles.avatarText}>
              {userProfile?.name.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: currentTheme.colors.text }]}>{userProfile?.name || 'User'}</Text>
            <Text style={[styles.profileEmail, { color: currentTheme.colors.textSecondary }]}>{userProfile?.email || 'email@example.com'}</Text>
          </View>
        </View>
        
        <TouchableOpacity style={[styles.profileButton, { backgroundColor: currentTheme.colors.primary }]}>
          <Text style={styles.profileButtonText}>Edit Profile</Text>
        </TouchableOpacity>
        
        <View style={styles.memberSince}>
          <Text style={[styles.memberSinceText, { color: currentTheme.colors.textSecondary }]}>
            Member since {userProfile ? formatDate(userProfile.createdAt) : 'Invalid Date'}
          </Text>
        </View>
      </View>
      
      {/* App Settings Section */}
      <View style={[styles.section, { backgroundColor: currentTheme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>App Settings</Text>
        
        <SettingItem 
          icon="notifications-outline"
          title="Notifications"
          description="Receive push notifications"
          value={settings.notifications}
          onToggle={() => handleToggleSetting('notifications')}
          theme={currentTheme}
        />
        
        <SettingItem 
          icon="moon-outline"
          title="Dark Mode"
          description="Use dark theme"
          value={isDark}
          onToggle={() => handleToggleSetting('darkMode')}
          theme={currentTheme}
        />
        
        <SettingItem 
          icon="musical-notes-outline"
          title="Sound Effects"
          description="Play sounds for notifications and actions"
          value={settings.soundEffects}
          onToggle={() => handleToggleSetting('soundEffects')}
          theme={currentTheme}
        />
        
        <SettingItem 
          icon="save-outline"
          title="Auto-save Chat"
          description="Automatically save chat history"
          value={settings.autoSaveChat}
          onToggle={() => handleToggleSetting('autoSaveChat')}
          theme={currentTheme}
        />
      </View>
      
      {/* Support Section */}
      <View style={[styles.section, { backgroundColor: currentTheme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Support</Text>
        
        <TouchableOpacity style={styles.supportItem}>
          <View style={styles.supportItemIconContainer}>
            <Ionicons name="help-circle-outline" size={24} color={currentTheme.colors.primary} />
          </View>
          <View style={styles.supportItemContent}>
            <Text style={[styles.supportItemTitle, { color: currentTheme.colors.text }]}>Help Center</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={currentTheme.colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.supportItem}>
          <View style={styles.supportItemIconContainer}>
            <Ionicons name="document-text-outline" size={24} color={currentTheme.colors.primary} />
          </View>
          <View style={styles.supportItemContent}>
            <Text style={[styles.supportItemTitle, { color: currentTheme.colors.text }]}>Terms of Service</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={currentTheme.colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.supportItem}>
          <View style={styles.supportItemIconContainer}>
            <Ionicons name="shield-outline" size={24} color={currentTheme.colors.primary} />
          </View>
          <View style={styles.supportItemContent}>
            <Text style={[styles.supportItemTitle, { color: currentTheme.colors.text }]}>Privacy Policy</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={currentTheme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      
      {/* Account Section */}
      <View style={[styles.section, { backgroundColor: currentTheme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Account</Text>
        
        <TouchableOpacity style={styles.supportItem}>
          <View style={styles.supportItemIconContainer}>
            <Ionicons name="key-outline" size={24} color={currentTheme.colors.primary} />
          </View>
          <View style={styles.supportItemContent}>
            <Text style={[styles.supportItemTitle, { color: currentTheme.colors.text }]}>Change Password</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={currentTheme.colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.supportItem} onPress={handleLogout}>
          <View style={styles.supportItemIconContainer}>
            <Ionicons name="log-out-outline" size={24} color={currentTheme.colors.error} />
          </View>
          <View style={styles.supportItemContent}>
            <Text style={[styles.supportItemTitle, { color: currentTheme.colors.error }]}>Logout</Text>
          </View>
        </TouchableOpacity>
      </View>
      
      <View style={styles.versionContainer}>
        <Text style={[styles.versionText, { color: currentTheme.colors.textLight }]}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
};

interface SettingItemProps {
  icon: string;
  title: string;
  description: string;
  value: boolean;
  onToggle: () => void;
  theme: any;
}

const SettingItem = ({ icon, title, description, value, onToggle, theme }: SettingItemProps) => {
  return (
    <View style={styles.settingItem}>
      <View style={styles.settingIconContainer}>
        <Ionicons name={icon as any} size={24} color={theme.colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: theme.colors.text }]}>{title}</Text>
        <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#767577', true: theme.colors.primary + '80' }}
        thumbColor={value ? theme.colors.primary : '#f4f3f4'}
        ios_backgroundColor="#3e3e3e"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  profileSection: {
    padding: 16,
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    marginLeft: 15,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
  },
  profileButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  profileButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  memberSince: {
    alignItems: 'center',
  },
  memberSinceText: {
    fontSize: 14,
  },
  section: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  settingIconContainer: {
    width: 32,
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  supportItemIconContainer: {
    width: 32,
    alignItems: 'center',
  },
  supportItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  supportItemTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  versionContainer: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  versionText: {
    fontSize: 14,
  },
});

export default SettingsScreen; 