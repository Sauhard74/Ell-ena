# Frontend-Backend Integration

This document details how Ell-ena's React Native frontend integrates with the Fastify backend, focusing on the API layer, authentication flow, and data synchronization patterns.

## API Communication Layer

### Core API Service

The frontend communicates with the backend through a centralized API service located at `frontend/src/services/api.ts`. This service wraps Axios for HTTP requests and handles common concerns like authentication, error handling, and request/response formatting.

```typescript
// Simplified view of the API service
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKEN_KEY } from '../constants/storage';

// API base URL
const API_URL = 'http://10.51.7.19:3000';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem(TOKEN_KEY);
      // Redirect handled in components
    }
    return Promise.reject(error);
  }
);

// Export API endpoints
export const authAPI = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  register: (userData) => api.post('/api/auth/register', userData),
  verifyToken: () => api.get('/api/auth/verify'),
};

export const tasksAPI = {
  getTasks: (filters) => api.get('/api/tasks', { params: filters }),
  getById: (id) => api.get(`/api/tasks/${id}`),
  createTask: (task) => api.post('/api/tasks', task),
  updateTask: (id, updates) => api.put(`/api/tasks/${id}`, updates),
  deleteTask: (id) => api.delete(`/api/tasks/${id}`),
};

// More API endpoints...

export default api;
```

### Mock API Service

For development and testing, Ell-ena includes a mock API service that mimics backend responses:

```typescript
// Example of mock API implementation
export const mockTasksAPI = {
  getTasks: () => Promise.resolve({
    data: {
      tasks: [
        {
          id: 'task-1',
          title: 'Complete project proposal',
          description: 'Finalize the proposal for the client',
          status: 'active',
          priority: 'high',
          dueDate: '2025-04-15T10:00:00Z',
          createdAt: '2025-04-01T09:30:00Z',
        },
        // More mock tasks...
      ],
    },
  }),
  // Other mock methods...
};

// Toggle between real and mock APIs
export const shouldUseMock = () => {
  // Check for mock mode or API unavailability
  return process.env.USE_MOCK_API === 'true';
};
```

## Authentication Flow

### Registration and Login

The authentication flow begins with user registration or login:

```typescript
// Example login implementation in a screen component
const handleLogin = async () => {
  try {
    setIsLoading(true);
    
    const response = await authAPI.login({
      email: email.trim(),
      password: password,
    });
    
    if (response.data && response.data.token) {
      // Store authentication token and user ID
      await authContext.signIn(
        response.data.token,
        response.data.userId
      );
      
      // Navigation happens automatically via App.tsx conditional rendering
    }
  } catch (error) {
    setErrorMessage(
      error.response?.data?.message || 'Failed to login. Please try again.'
    );
  } finally {
    setIsLoading(false);
  }
};
```

### Token Management with Context API

Authentication state is managed through React Context API:

```typescript
// AuthContext.ts
import { createContext } from 'react';

export interface AuthContextType {
  signIn: (token: string, userId: string) => Promise<void>;
  signOut: () => Promise<void>;
  token: string | null;
  userId: string | null;
}

export const AuthContext = createContext<AuthContextType>({
  signIn: async () => {},
  signOut: async () => {},
  token: null,
  userId: null,
});

// App.tsx implementation
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
```

### Conditional Navigation

The app uses conditional rendering based on authentication state:

```typescript
// App.tsx navigation conditional
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
```

## Data Flow Examples

### Task Management Flow

The task management flow demonstrates how data moves between frontend and backend:

1. **Fetching Tasks**:

```typescript
// In TasksScreen.tsx
const fetchTasks = async () => {
  try {
    setIsLoading(true);
    const response = await tasksAPI.getTasks({
      workspaceId,
      status: statusFilter,
      priority: priorityFilter,
      searchTerm: searchQuery,
    });
    
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
```

2. **Creating a Task**:

```typescript
const handleCreateTask = async () => {
  if (!newTask.title.trim()) {
    Alert.alert('Error', 'Task title is required');
    return;
  }
  
  try {
    const response = await tasksAPI.createTask({
      ...newTask,
      workspaceId: currentWorkspace.id,
    });
    
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
```

3. **Updating a Task**:

```typescript
const handleUpdateTaskStatus = async (taskId, newStatus) => {
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
```

### Chat NLP Integration

The chat interface demonstrates AI integration:

```typescript
// In ChatScreen.tsx
const handleSend = async () => {
  if (!inputText.trim()) return;
  
  // Dismiss keyboard
  Keyboard.dismiss();
  
  const userMessage = {
    id: Date.now().toString(),
    text: inputText.trim(),
    sender: 'user',
    timestamp: new Date().toISOString()
  };
  
  const updatedMessages = [...messages, userMessage];
  setMessages(updatedMessages);
  setInputText('');
  
  // Save to local storage
  saveChatHistory(updatedMessages);
  
  // Set loading state for AI response
  setIsLoading(true);
  
  try {
    // Call API to get AI response
    const response = await nlpAPI.processMessage({
      message: userMessage.text,
      context: messages.slice(-5).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }))
    });
    
    if (response.data && response.data.response) {
      const aiMessage = {
        id: Date.now().toString(),
        text: response.data.response,
        sender: 'ai',
        timestamp: new Date().toISOString()
      };
      
      const newMessages = [...updatedMessages, aiMessage];
      setMessages(newMessages);
      
      // If a task was created, update the task list
      if (response.data.createdTask) {
        // Handle task creation notification
      }
      
      // Save to local storage
      saveChatHistory(newMessages);
    }
  } catch (error) {
    console.error('Error getting AI response', error);
    
    // Add error message
    const errorMessage = {
      id: Date.now().toString(),
      text: "I'm sorry, I couldn't process your request. Please try again.",
      sender: 'ai',
      timestamp: new Date().toISOString()
    };
    
    const newMessages = [...updatedMessages, errorMessage];
    setMessages(newMessages);
    saveChatHistory(newMessages);
  } finally {
    setIsLoading(false);
  }
};
```

## Error Handling Patterns

### Frontend Error Handling

Consistent error handling patterns are used throughout the app:

```typescript
// Standard error handling pattern
try {
  // API call or other operation
} catch (error) {
  // 1. Log the error
  console.error('Operation failed', error);
  
  // 2. Extract meaningful error message
  const errorMessage = error.response?.data?.message 
    || error.message 
    || 'An unexpected error occurred';
  
  // 3. Present user-friendly message
  Alert.alert('Error', errorMessage);
  
  // 4. Update UI state if needed
  setIsError(true);
  setErrorMessage(errorMessage);
} finally {
  // 5. Reset loading states
  setIsLoading(false);
}
```

### Offline Support

The app includes mechanisms for handling offline scenarios:

```typescript
// Check network connectivity
const checkNetworkStatus = async () => {
  const isConnected = await NetInfo.fetch().then(state => state.isConnected);
  
  if (!isConnected) {
    // Switch to offline mode
    setIsOffline(true);
    
    // Load cached data
    const cachedData = await AsyncStorage.getItem(CACHE_KEY);
    if (cachedData) {
      setCachedItems(JSON.parse(cachedData));
    }
  } else if (isOffline) {
    // Reconnected - sync pending changes
    setIsOffline(false);
    syncPendingChanges();
  }
};

// Sync pending changes when connection is restored
const syncPendingChanges = async () => {
  const pendingChanges = await AsyncStorage.getItem(PENDING_CHANGES_KEY);
  
  if (pendingChanges) {
    const changes = JSON.parse(pendingChanges);
    
    for (const change of changes) {
      try {
        // Process each pending change
        switch (change.type) {
          case 'create':
            await tasksAPI.createTask(change.data);
            break;
          case 'update':
            await tasksAPI.updateTask(change.id, change.data);
            break;
          case 'delete':
            await tasksAPI.deleteTask(change.id);
            break;
        }
      } catch (error) {
        console.error('Error syncing change', error);
      }
    }
    
    // Clear pending changes after sync
    await AsyncStorage.removeItem(PENDING_CHANGES_KEY);
  }
};
```

## Route Mapping

### API Route Alignment

The following table shows how frontend API calls map to backend routes:

| Frontend Service | Frontend Method | Backend Route | HTTP Method | Purpose |
|------------------|-----------------|---------------|-------------|---------|
| `authAPI` | `login` | `/api/auth/login` | POST | User authentication |
| `authAPI` | `register` | `/api/auth/register` | POST | User registration |
| `authAPI` | `verifyToken` | `/api/auth/verify` | GET | Token validation |
| `userAPI` | `getProfile` | `/api/users/me` | GET | Get user profile |
| `userAPI` | `updateProfile` | `/api/users/me` | PUT | Update user profile |
| `workspacesAPI` | `getAll` | `/api/workspaces` | GET | List all workspaces |
| `workspacesAPI` | `getById` | `/api/workspaces/:id` | GET | Get workspace details |
| `workspacesAPI` | `create` | `/api/workspaces` | POST | Create workspace |
| `workspacesAPI` | `update` | `/api/workspaces/:id` | PUT | Update workspace |
| `workspacesAPI` | `delete` | `/api/workspaces/:id` | DELETE | Delete workspace |
| `tasksAPI` | `getTasks` | `/api/tasks` | GET | List tasks with filters |
| `tasksAPI` | `getById` | `/api/tasks/:id` | GET | Get task details |
| `tasksAPI` | `createTask` | `/api/tasks` | POST | Create new task |
| `tasksAPI` | `updateTask` | `/api/tasks/:id` | PUT | Update task |
| `tasksAPI` | `deleteTask` | `/api/tasks/:id` | DELETE | Delete task |
| `nlpAPI` | `processMessage` | `/api/nlp/process-message` | POST | Process chat message |
| `nlpAPI` | `parseText` | `/api/nlp/parse-text` | POST | Parse text to task |
| `transcriptionAPI` | `transcribe` | `/api/transcribe` | POST | Transcribe audio |
| `contextAPI` | `search` | `/api/context/search` | GET | Search context |
| `contextAPI` | `getRelevantContext` | `/api/context/task/:id` | GET | Get task context |

## State Management Patterns

### React Context for Global State

The app uses React Context API for managing global state:

```typescript
// ThemeContext.tsx example
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME_KEY } from '../constants/storage';

type ThemeContextType = {
  isDark: boolean;
  toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Load saved theme preference
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_KEY);
        if (savedTheme) {
          setIsDark(savedTheme === 'dark');
        }
      } catch (error) {
        console.error('Error loading theme', error);
      }
    };

    loadTheme();
  }, []);

  const toggleTheme = async () => {
    try {
      const newTheme = !isDark;
      setIsDark(newTheme);
      await AsyncStorage.setItem(THEME_KEY, newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
```

### Local Component State

Individual screens manage their own local state:

```typescript
// Example of local state in TasksScreen
const [tasks, setTasks] = useState<Task[]>([]);
const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [isRefreshing, setIsRefreshing] = useState(false);
const [modalVisible, setModalVisible] = useState(false);
const [statusFilter, setStatusFilter] = useState<string>('active');
const [priorityFilter, setPriorityFilter] = useState<string>('all');
const [searchQuery, setSearchQuery] = useState('');
```

## Connection Optimizations

### Performance Optimizations

The frontend implements several optimizations for API communication:

1. **Debounced Searches**:
   ```typescript
   const debouncedSearch = useCallback(
     debounce((text: string) => {
       setSearchQuery(text);
     }, 500),
     []
   );
   ```

2. **Pagination**:
   ```typescript
   const loadMoreTasks = async () => {
     if (isLoadingMore || !hasMoreTasks) return;
     
     setIsLoadingMore(true);
     try {
       const response = await tasksAPI.getTasks({
         ...filters,
         page: currentPage + 1,
         limit: PAGE_SIZE,
       });
       
       if (response.data.tasks.length > 0) {
         setTasks(prev => [...prev, ...response.data.tasks]);
         setCurrentPage(prev => prev + 1);
       } else {
         setHasMoreTasks(false);
       }
     } catch (error) {
       console.error('Error loading more tasks', error);
     } finally {
       setIsLoadingMore(false);
     }
   };
   ```

3. **Optimistic Updates**:
   ```typescript
   const handleToggleTaskStatus = async (taskId, currentStatus) => {
     // Optimistically update UI
     const newStatus = currentStatus === 'completed' ? 'active' : 'completed';
     setTasks(prev => 
       prev.map(task => 
         task.id === taskId ? { ...task, status: newStatus } : task
       )
     );
     
     try {
       // Actually update on server
       await tasksAPI.updateTask(taskId, { status: newStatus });
     } catch (error) {
       // Revert optimistic update if it fails
       setTasks(prev => 
         prev.map(task => 
           task.id === taskId ? { ...task, status: currentStatus } : task
         )
       );
       Alert.alert('Error', 'Failed to update task status');
     }
   };
   ```

## Conclusion

The integration between Ell-ena's frontend and backend demonstrates several modern patterns for mobile app development:

1. **Centralized API Layer**: A single service that handles all API communication
2. **Context-based Auth**: Authentication state managed through React Context
3. **Mock/Real Switching**: Support for development with or without a backend
4. **Error Handling**: Consistent patterns for handling API errors
5. **Offline Support**: Mechanisms for dealing with intermittent connectivity
6. **Optimistic Updates**: Immediate UI updates with server confirmation

These patterns create a responsive, reliable user experience while maintaining clean separation between frontend and backend concerns. 