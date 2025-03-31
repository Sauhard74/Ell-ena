import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { getTheme } from '../../styles/theme';
import { tasksAPI, userAPI } from '../../services/api';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface TaskSummary {
  total: number;
  completed: number;
  inProgress: number;
  highPriority: number;
}

interface RecentActivity {
  id: string;
  title: string;
  type: 'task_completed' | 'task_created' | 'message_sent';
  timestamp: string;
}

const HomeScreen = () => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const [taskSummary, setTaskSummary] = useState<TaskSummary>({
    total: 0,
    completed: 0,
    inProgress: 0,
    highPriority: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const { isDark } = useTheme();
  const currentTheme = getTheme(isDark);
  const insets = useSafeAreaInsets();
  
  const fetchDashboardData = async () => {
    try {
      // Fetch user profile
      const userResponse = await userAPI.getProfile();
      if (userResponse.data && userResponse.data.user) {
        setUserName(userResponse.data.user.name);
      }
      
      // Fetch task summary
      const taskResponse = await tasksAPI.getSummary();
      if (taskResponse.data) {
        setTaskSummary(taskResponse.data);
      }
      
      // Fetch recent activity
      const activityResponse = await tasksAPI.getRecentActivity();
      if (activityResponse.data) {
        setRecentActivity(activityResponse.data.activities);
      }
    } catch (error) {
      console.error('Error fetching dashboard data', error);
      // Could show an error message here
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  
  useEffect(() => {
    fetchDashboardData();
  }, []);
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchDashboardData();
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getActivityIcon = (type: string) => {
    switch(type) {
      case 'task_completed':
        return <Ionicons name="checkmark-circle" size={24} color={currentTheme.colors.success} />;
      case 'task_created':
        return <Ionicons name="add-circle" size={24} color={currentTheme.colors.primary} />;
      case 'message_sent':
        return <Ionicons name="chatbubble" size={24} color={currentTheme.colors.accent} />;
      default:
        return <Ionicons name="ellipse" size={24} color={currentTheme.colors.textSecondary} />;
    }
  };
  
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: currentTheme.colors.background }]}>
        <ActivityIndicator size="large" color={currentTheme.colors.primary} />
        <Text style={[styles.loadingText, { color: currentTheme.colors.text }]}>Loading your dashboard...</Text>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: currentTheme.colors.background }]}>
      <ScrollView 
        style={[styles.container, { backgroundColor: currentTheme.colors.background }]}
        contentContainerStyle={{ paddingBottom: insets.bottom }}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={handleRefresh}
            colors={[currentTheme.colors.primary]} 
            tintColor={currentTheme.colors.primary}
            progressBackgroundColor={currentTheme.colors.card}
          />
        }
      >
        {/* Header Section */}
        <View style={[styles.header, { marginTop: 8 }]}>
          <View>
            <Text style={[styles.welcomeText, { color: currentTheme.colors.textSecondary }]}>Welcome back,</Text>
            <Text style={[styles.userName, { color: currentTheme.colors.text }]}>{userName}</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('Settings' as never)}
          >
            <Ionicons name="person-circle-outline" size={40} color={currentTheme.colors.primary} />
          </TouchableOpacity>
        </View>
        
        {/* Task Summary Section */}
        <View style={[styles.summaryContainer, { backgroundColor: currentTheme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Task Summary</Text>
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: currentTheme.colors.primary }]}>
              <Text style={styles.statNumber}>{taskSummary.total}</Text>
              <Text style={styles.statLabel}>Total Tasks</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: currentTheme.colors.success }]}>
              <Text style={styles.statNumber}>{taskSummary.completed}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: currentTheme.colors.accent }]}>
              <Text style={styles.statNumber}>{taskSummary.inProgress}</Text>
              <Text style={styles.statLabel}>In Progress</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: currentTheme.colors.warning }]}>
              <Text style={styles.statNumber}>{taskSummary.highPriority}</Text>
              <Text style={styles.statLabel}>High Priority</Text>
            </View>
          </View>
        </View>
        
        {/* Quick Actions */}
        <View style={[styles.actionsContainer, { backgroundColor: currentTheme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Quick Actions</Text>
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: isDark ? currentTheme.colors.card : '#f8f9fa', borderColor: currentTheme.colors.border }]}
              onPress={() => navigation.navigate('Tasks' as never)}
            >
              <Ionicons name="add-circle" size={28} color={currentTheme.colors.primary} />
              <Text style={[styles.actionButtonText, { color: currentTheme.colors.text }]}>New Task</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: isDark ? currentTheme.colors.card : '#f8f9fa', borderColor: currentTheme.colors.border }]}
              onPress={() => navigation.navigate('Chat' as never)}
            >
              <Ionicons name="chatbubble" size={28} color={currentTheme.colors.primary} />
              <Text style={[styles.actionButtonText, { color: currentTheme.colors.text }]}>Chat with Ell-ena</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: isDark ? currentTheme.colors.card : '#f8f9fa', borderColor: currentTheme.colors.border }]}
              onPress={() => {/* Navigate to voice command screen */}}
            >
              <Ionicons name="mic" size={28} color={currentTheme.colors.primary} />
              <Text style={[styles.actionButtonText, { color: currentTheme.colors.text }]}>Voice Command</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Recent Activity */}
        <View style={[styles.activityContainer, { backgroundColor: currentTheme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Recent Activity</Text>
          {recentActivity.length > 0 ? (
            recentActivity.map(activity => (
              <View key={activity.id} style={[styles.activityItem, { borderColor: currentTheme.colors.border }]}>
                <View style={styles.activityIconContainer}>
                  {getActivityIcon(activity.type)}
                </View>
                <View style={styles.activityContent}>
                  <Text style={[styles.activityTitle, { color: currentTheme.colors.text }]}>{activity.title}</Text>
                  <Text style={[styles.activityTime, { color: currentTheme.colors.textSecondary }]}>{formatDate(activity.timestamp)}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyActivityContainer}>
              <Text style={[styles.emptyActivityText, { color: currentTheme.colors.textSecondary }]}>No recent activity</Text>
            </View>
          )}
        </View>
        
        {/* Tips Section */}
        <View style={[styles.tipsContainer, { backgroundColor: currentTheme.colors.background }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Productivity Tip</Text>
          <View style={[styles.tipCard, { 
            backgroundColor: currentTheme.colors.card,
            ...isDark ? {} : styles.lightModeShadow
          }]}>
            <Ionicons name="bulb-outline" size={24} color={currentTheme.colors.warning} />
            <Text style={[styles.tipText, { color: currentTheme.colors.text }]}>
              Try using voice commands to quickly add tasks while you're on the go!
            </Text>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: currentTheme.colors.textLight }]}>Ell-ena • Your AI Product Manager</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  welcomeText: {
    fontSize: 16,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  profileButton: {
    padding: 8,
  },
  summaryContainer: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '23%',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 4,
  },
  actionsContainer: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '31%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionButtonText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  activityContainer: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  activityItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  activityIconContainer: {
    marginRight: 12,
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 14,
  },
  emptyActivityContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyActivityText: {
    fontSize: 16,
  },
  tipsContainer: {
    padding: 16,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
  },
  lightModeShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tipText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
});

export default HomeScreen;