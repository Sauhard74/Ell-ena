// User model
export interface User {
  id: string;
  email: string;
  fullName: string;
  password?: string; // Not returned in responses
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme?: 'light' | 'dark';
  notifications?: boolean;
  [key: string]: any; // Allow for additional preferences
}

// Workspace model
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface WorkspaceMember {
  userId: string;
  workspaceId: string;
  role: 'owner' | 'member' | 'viewer';
  joinedAt: string;
}

// Task model
export interface Task {
  id: string;
  type: 'todo' | 'reminder' | 'milestone' | 'ticket';
  title: string;
  description?: string;
  dueDate?: string;
  status: 'active' | 'completed' | 'archived';
  priority?: 'high' | 'medium' | 'low';
  workspaceId: string;
  createdBy: string;
  assignee?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TaskRelationship {
  id: string;
  sourceTaskId: string;
  targetTaskId: string;
  relationshipType: 'prerequisite' | 'related' | 'subtask';
  createdAt: string;
}

// Transcript model
export interface Transcript {
  id: string;
  meetingTitle?: string;
  content: string;
  summary?: string;
  duration?: number;
  workspaceId: string;
  createdBy: string;
  createdAt: string;
}

// Activity model
export interface Activity {
  id: string;
  type: 'task_created' | 'task_completed' | 'task_updated' | 'message_sent' | 'transcript_created';
  title: string;
  entityId: string; // ID of the related entity (task, message, etc.)
  entityType: 'task' | 'message' | 'transcript';
  userId: string;
  workspaceId?: string;
  timestamp: string;
}

// Authentication
export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  user: {
    email: string;
    fullName: string;
  };
}

// NLP Processing
export interface ProcessMessageRequest {
  message: string;
  context: Array<{ role: string; content: string }>;
}

export interface ProcessMessageResponse {
  response: string;
  actions?: Array<{
    type: string;
    data: any;
  }>;
}

export interface ParseTextRequest {
  text: string;
  workspaceId: string;
  timezone?: string;
}

export interface ParseTextResponse {
  parsed: {
    type: string;
    title: string;
    description?: string;
    dueDate?: string;
    priority?: string;
    relatedTo?: string;
  };
  confidence: number;
  alternatives?: Array<{
    type: string;
    title: string;
    dueDate?: string;
  }>;
}

// Context
export interface ContextSearchRequest {
  query: string;
  workspaceId?: string;
}

export interface ContextSearchResponse {
  results: Array<{
    type: string;
    id: string;
    title: string;
    snippet?: string;
    relevance: number;
  }>;
} 