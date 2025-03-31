import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { getTheme } from '../../styles/theme';
import { tasksAPI } from '../../services/api';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'archived';
  priority: 'high' | 'medium' | 'low';
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

const TasksScreen = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { isDark } = useTheme();
  const currentTheme = getTheme(isDark);
  const insets = useSafeAreaInsets();
  
  // New task form state
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: null,
  });
  
  const fetchTasks = async () => {
    try {
      const response = await tasksAPI.getTasks();
      if (response.data) {
        setTasks(response.data.tasks);
      }
    } catch (error) {
      console.error('Error fetching tasks', error);
      Alert.alert('Error', 'Failed to load tasks. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  
  useEffect(() => {
    fetchTasks();
  }, []);
  
  useEffect(() => {
    applyFilters();
  }, [tasks, statusFilter, priorityFilter, searchQuery]);
  
  const applyFilters = () => {
    let result = [...tasks];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(task => task.status === statusFilter);
    }
    
    // Apply priority filter
    if (priorityFilter !== 'all') {
      result = result.filter(task => task.priority === priorityFilter);
    }
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        task => 
          task.title.toLowerCase().includes(query) || 
          task.description.toLowerCase().includes(query)
      );
    }
    
    // Sort by priority and then by due date
    result.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      
      return 0;
    });
    
    setFilteredTasks(result);
  };
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTasks();
  };
  
  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      Alert.alert('Error', 'Task title is required');
      return;
    }
    
    try {
      const response = await tasksAPI.createTask(newTask);
      if (response.data) {
        const createdTask = response.data.task;
        setTasks(prev => [createdTask, ...prev]);
        setModalVisible(false);
        resetNewTaskForm();
      }
    } catch (error) {
      console.error('Error creating task', error);
      Alert.alert('Error', 'Failed to create task. Please try again.');
    }
  };
  
  const handleUpdateTaskStatus = async (taskId: string, newStatus: 'active' | 'completed' | 'archived') => {
    try {
      await tasksAPI.updateTask(taskId, { status: newStatus });
      setTasks(prev => 
        prev.map(task => 
          task.id === taskId 
            ? { ...task, status: newStatus, updatedAt: new Date().toISOString() } 
            : task
        )
      );
    } catch (error) {
      console.error('Error updating task status', error);
      Alert.alert('Error', 'Failed to update task. Please try again.');
    }
  };
  
  const resetNewTaskForm = () => {
    setNewTask({
      title: '',
      description: '',
      priority: 'medium',
      dueDate: null,
    });
  };
  
  const renderPriorityBadge = (priority: string) => {
    let backgroundColor;
    switch (priority) {
      case 'high':
        backgroundColor = currentTheme.colors.priorityHigh;
        break;
      case 'medium':
        backgroundColor = currentTheme.colors.priorityMedium;
        break;
      case 'low':
        backgroundColor = currentTheme.colors.priorityLow;
        break;
      default:
        backgroundColor = currentTheme.colors.textLight;
    }
    
    return (
      <View style={[styles.priorityBadge, { backgroundColor }]}>
        <Text style={styles.priorityText}>{priority}</Text>
      </View>
    );
  };
  
  const renderTask = ({ item }: { item: Task }) => {
    return (
      <View style={[styles.taskItem, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.border }]}>
        <TouchableOpacity 
          style={styles.statusCheckbox}
          onPress={() => handleUpdateTaskStatus(item.id, item.status === 'completed' ? 'active' : 'completed')}
        >
          <Ionicons 
            name={item.status === 'completed' ? 'checkmark-circle' : 'ellipse-outline'} 
            size={24} 
            color={item.status === 'completed' ? currentTheme.colors.success : currentTheme.colors.primary} 
          />
        </TouchableOpacity>
        
        <View style={styles.taskContent}>
          <Text 
            style={[
              styles.taskTitle, 
              { color: currentTheme.colors.text },
              item.status === 'completed' && styles.completedTaskTitle
            ]}
          >
            {item.title}
          </Text>
          
          {item.description ? (
            <Text 
              style={[
                styles.taskDescription, 
                { color: currentTheme.colors.textSecondary },
                item.status === 'completed' && styles.completedTaskText
              ]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          ) : null}
          
          <View style={styles.taskFooter}>
            {renderPriorityBadge(item.priority)}
            
            {item.dueDate && (
              <Text style={[styles.dueDate, { color: currentTheme.colors.textSecondary }]}>
                Due: {new Date(item.dueDate).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>
        
        <TouchableOpacity style={styles.taskActions}>
          <Ionicons 
            name="ellipsis-vertical" 
            size={20} 
            color={currentTheme.colors.textSecondary} 
          />
        </TouchableOpacity>
      </View>
    );
  };
  
  const renderFilterOptions = () => {
    const statusOptions = [
      { id: 'active', label: 'Active' },
      { id: 'completed', label: 'Completed' },
      { id: 'all', label: 'All' }
    ];
    
    const priorityOptions = [
      { id: 'all', label: 'All' },
      { id: 'high', label: 'High' },
      { id: 'medium', label: 'Medium' },
      { id: 'low', label: 'Low' }
    ];
    
    return (
      <View>
        <View style={styles.filterSection}>
          <Text style={[styles.filterLabel, { color: currentTheme.colors.textSecondary }]}>Status</Text>
          <ScrollableFilterButtons
            options={statusOptions}
            selectedId={statusFilter}
            onSelect={setStatusFilter}
          />
        </View>
        
        <View style={styles.filterSection}>
          <Text style={[styles.filterLabel, { color: currentTheme.colors.textSecondary }]}>Priority</Text>
          <ScrollableFilterButtons
            options={priorityOptions}
            selectedId={priorityFilter}
            onSelect={setPriorityFilter}
          />
        </View>
      </View>
    );
  };
  
  const ScrollableFilterButtons = ({ 
    options, 
    selectedId, 
    onSelect 
  }: { 
    options: Array<{id: string, label: string}>, 
    selectedId: string, 
    onSelect: (id: string) => void 
  }) => {
    return (
      <View style={styles.filterButtonsContainer}>
        {options.map(option => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.filterButton,
              option.id === selectedId 
                ? [styles.selectedFilterButton, { backgroundColor: currentTheme.colors.primary }] 
                : { backgroundColor: isDark ? currentTheme.colors.card : '#f0f0f0', borderColor: currentTheme.colors.border }
            ]}
            onPress={() => onSelect(option.id)}
          >
            <Text 
              style={[
                styles.filterButtonText, 
                option.id === selectedId 
                  ? styles.selectedFilterButtonText 
                  : { color: currentTheme.colors.text }
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };
  
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
        <ActivityIndicator size="large" color={currentTheme.colors.primary} />
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: currentTheme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: currentTheme.colors.text }]}>Tasks</Text>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: currentTheme.colors.primary }]}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>
      
      <View style={[styles.searchBar, { backgroundColor: isDark ? currentTheme.colors.card : '#f0f0f0' }]}>
        <Ionicons name="search" size={20} color={currentTheme.colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: currentTheme.colors.text }]}
          placeholder="Search tasks..."
          placeholderTextColor={currentTheme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={currentTheme.colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>
      
      {renderFilterOptions()}
      
      {filteredTasks.length > 0 ? (
        <FlatList
          data={filteredTasks}
          renderItem={renderTask}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.tasksList}
          refreshControl={
            <RefreshControl 
              refreshing={isRefreshing} 
              onRefresh={handleRefresh} 
              colors={[currentTheme.colors.primary]}
              tintColor={currentTheme.colors.primary}
              progressBackgroundColor={currentTheme.colors.card}
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="list" size={60} color={currentTheme.colors.textSecondary} />
          <Text style={[styles.emptyText, { color: currentTheme.colors.textSecondary }]}>
            {searchQuery 
              ? 'No tasks found matching your search' 
              : statusFilter === 'active' 
                ? 'No active tasks. Time to add some!' 
                : statusFilter === 'completed' 
                  ? 'No completed tasks yet' 
                  : 'No tasks yet. Add your first task!'}
          </Text>
        </View>
      )}
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          resetNewTaskForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalView, { backgroundColor: currentTheme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.colors.text }]}>Create New Task</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setModalVisible(false);
                  resetNewTaskForm();
                }}
              >
                <Ionicons name="close" size={24} color={currentTheme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: currentTheme.colors.textSecondary }]}>Title *</Text>
              <TextInput
                style={[styles.formInput, { 
                  backgroundColor: isDark ? currentTheme.colors.background : '#ffffff',
                  color: currentTheme.colors.text,
                  borderColor: currentTheme.colors.border
                }]}
                placeholder="Task title"
                placeholderTextColor={currentTheme.colors.textSecondary}
                value={newTask.title}
                onChangeText={(text) => setNewTask(prev => ({ ...prev, title: text }))}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: currentTheme.colors.textSecondary }]}>Description</Text>
              <TextInput
                style={[styles.formInput, { 
                  backgroundColor: isDark ? currentTheme.colors.background : '#ffffff',
                  color: currentTheme.colors.text,
                  borderColor: currentTheme.colors.border,
                  textAlignVertical: 'top',
                  height: 100
                }]}
                placeholder="Task description"
                placeholderTextColor={currentTheme.colors.textSecondary}
                value={newTask.description}
                onChangeText={(text) => setNewTask(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={4}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: currentTheme.colors.textSecondary }]}>Priority</Text>
              <View style={styles.priorityButtons}>
                {['low', 'medium', 'high'].map(priority => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityButton,
                      { 
                        backgroundColor: newTask.priority === priority 
                          ? getPriorityColor(priority, currentTheme)
                          : isDark ? currentTheme.colors.background : '#f0f0f0',
                        borderColor: getPriorityColor(priority, currentTheme)
                      }
                    ]}
                    onPress={() => setNewTask(prev => ({ ...prev, priority }))}
                  >
                    <Text
                      style={[
                        styles.priorityButtonText,
                        { 
                          color: newTask.priority === priority 
                            ? '#ffffff' 
                            : getPriorityColor(priority, currentTheme)
                        }
                      ]}
                    >
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: currentTheme.colors.primary }]}
              onPress={handleCreateTask}
            >
              <Text style={styles.submitButtonText}>Create Task</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      <View style={{ paddingBottom: insets.bottom }}>
        {/* This padding ensures content doesn't get cut off by home indicator or bottom bar */}
      </View>
    </SafeAreaView>
  );
};

const getPriorityColor = (priority: string, theme: any) => {
  switch (priority) {
    case 'high':
      return theme.colors.priorityHigh;
    case 'medium':
      return theme.colors.priorityMedium;
    case 'low':
      return theme.colors.priorityLow;
    default:
      return theme.colors.primary;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    margin: 16,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filterSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  filterLabel: {
    marginBottom: 8,
    fontSize: 14,
  },
  filterButtonsContainer: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  selectedFilterButton: {
    borderWidth: 0,
  },
  filterButtonText: {
    fontSize: 14,
  },
  selectedFilterButtonText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  tasksList: {
    padding: 16,
    paddingBottom: 100,
  },
  taskItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
  },
  statusCheckbox: {
    marginRight: 12,
    alignSelf: 'flex-start',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  completedTaskTitle: {
    textDecorationLine: 'line-through',
    opacity: 0.8,
  },
  taskDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  completedTaskText: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  priorityText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  dueDate: {
    fontSize: 12,
  },
  taskActions: {
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '90%',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    marginBottom: 8,
    fontSize: 14,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  priorityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TasksScreen; 