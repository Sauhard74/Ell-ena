import { Platform } from 'react-native';

// Mock user data
const MOCK_USERS = [
  {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123'
  }
];

// Mock tasks data
const MOCK_TASKS = [
  {
    id: '1',
    title: 'Complete Ell-ena MVP',
    description: 'Finish the minimum viable product of Ell-ena app',
    status: 'in_progress',
    priority: 'high',
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days from now
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Research competitors',
    description: 'Analyze competing AI assistant products',
    status: 'completed',
    priority: 'medium',
    dueDate: new Date(Date.now() - 86400000 * 1).toISOString(), // 1 day ago
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString() // 2 days ago
  },
  {
    id: '3',
    title: 'Prepare pitch deck',
    description: 'Create presentation for investors',
    status: 'not_started',
    priority: 'high',
    dueDate: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString() // 1 day ago
  }
];

// Mock recent activities
const MOCK_ACTIVITIES = [
  {
    id: '1',
    title: 'Completed "Research competitors" task',
    type: 'task_completed',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString() // 2 hours ago
  },
  {
    id: '2',
    title: 'Created "Prepare pitch deck" task',
    type: 'task_created',
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString() // 1 day ago
  },
  {
    id: '3',
    title: 'Message: "Schedule a meeting for tomorrow"',
    type: 'message_sent',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString() // 5 hours ago
  }
];

// Helper function to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Auth API mock
export const mockAuthAPI = {
  login: async ({ email, password }: { email: string, password: string }) => {
    // Simulate network delay
    await delay(800);
    
    // Find user
    const user = MOCK_USERS.find(u => u.email === email);
    
    if (!user || user.password !== password) {
      throw {
        response: {
          status: 401,
          data: { message: 'Invalid email or password' }
        }
      };
    }
    
    return {
      data: {
        token: 'mock-jwt-token',
        userId: user.id,
        user: { name: user.name, email: user.email }
      }
    };
  },
  
  register: async (userData: { name: string, email: string, password: string }) => {
    // Simulate network delay
    await delay(1000);
    
    // Check if user with email already exists
    const existingUser = MOCK_USERS.find(u => u.email === userData.email);
    
    if (existingUser) {
      throw {
        response: {
          status: 400,
          data: { message: 'User with this email already exists' }
        }
      };
    }
    
    // Create new user
    const newUser = {
      id: `${MOCK_USERS.length + 1}`,
      ...userData
    };
    
    MOCK_USERS.push(newUser);
    
    return {
      data: {
        token: 'mock-jwt-token',
        userId: newUser.id,
        message: 'User registered successfully'
      }
    };
  }
};

// User API mock
export const mockUserAPI = {
  getProfile: async () => {
    await delay(500);
    
    return {
      data: {
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com'
        }
      }
    };
  },
  
  updateProfile: async (data: { name?: string, email?: string }) => {
    await delay(700);
    
    return {
      data: {
        user: {
          id: '1',
          name: data.name || 'Test User',
          email: data.email || 'test@example.com'
        },
        message: 'Profile updated successfully'
      }
    };
  }
};

// Tasks API mock
export const mockTasksAPI = {
  getTasks: async () => {
    await delay(600);
    
    return {
      data: {
        tasks: MOCK_TASKS
      }
    };
  },
  
  getById: async (id: string) => {
    await delay(300);
    
    const task = MOCK_TASKS.find(t => t.id === id);
    
    if (!task) {
      throw {
        response: {
          status: 404,
          data: { message: 'Task not found' }
        }
      };
    }
    
    return {
      data: {
        task
      }
    };
  },
  
  createTask: async (taskData: any) => {
    await delay(800);
    
    const newTask = {
      id: `${MOCK_TASKS.length + 1}`,
      ...taskData,
      createdAt: new Date().toISOString()
    };
    
    MOCK_TASKS.push(newTask);
    
    return {
      data: {
        task: newTask,
        message: 'Task created successfully'
      }
    };
  },
  
  updateTask: async (id: string, updates: any) => {
    await delay(600);
    
    const taskIndex = MOCK_TASKS.findIndex(t => t.id === id);
    
    if (taskIndex === -1) {
      throw {
        response: {
          status: 404,
          data: { message: 'Task not found' }
        }
      };
    }
    
    MOCK_TASKS[taskIndex] = {
      ...MOCK_TASKS[taskIndex],
      ...updates
    };
    
    return {
      data: {
        task: MOCK_TASKS[taskIndex],
        message: 'Task updated successfully'
      }
    };
  },
  
  deleteTask: async (id: string) => {
    await delay(500);
    
    const taskIndex = MOCK_TASKS.findIndex(t => t.id === id);
    
    if (taskIndex === -1) {
      throw {
        response: {
          status: 404,
          data: { message: 'Task not found' }
        }
      };
    }
    
    MOCK_TASKS.splice(taskIndex, 1);
    
    return {
      data: {
        message: 'Task deleted successfully'
      }
    };
  },
  
  getSummary: async () => {
    await delay(400);
    
    // Calculate summary
    const total = MOCK_TASKS.length;
    const completed = MOCK_TASKS.filter(t => t.status === 'completed').length;
    const inProgress = MOCK_TASKS.filter(t => t.status === 'in_progress').length;
    const highPriority = MOCK_TASKS.filter(t => t.priority === 'high').length;
    
    return {
      data: {
        total,
        completed,
        inProgress,
        highPriority
      }
    };
  },
  
  getRecentActivity: async () => {
    await delay(500);
    
    return {
      data: {
        activities: MOCK_ACTIVITIES
      }
    };
  }
};

// NLP API mock
export const mockNlpAPI = {
  processMessage: async (data: { message: string, context: Array<{ role: string, content: string }> }) => {
    await delay(1000);
    
    // Simple echo reply for testing
    return {
      data: {
        response: `You said: "${data.message}". This is a mock response from Ell-ena.`,
        actions: []
      }
    };
  }
};

// Determine if we should use mock API (always use it in local development or testing)
export const shouldUseMock = () => {
  return (
    Platform.OS === 'android' || 
    Platform.OS === 'ios' || 
    true // Force mock mode for development
  );
}; 