# API Reference: Ell-ena's Backend Services

## Overview

The Ell-ena API follows RESTful principles with JSON as the primary data format. This document outlines the key endpoints, authentication mechanisms, and examples of usage.

> **API Design Philosophy**: I designed this API to be intuitive and predictable. Each resource has consistent CRUD operations, clear error responses, and follows a nested structure that reflects the relationships between entities. My goal was to make it easy for future contributors (and my future self) to understand and extend.

## Base URL

```
https://api.ell-ena.app/v1
```

## Authentication

All API requests (except registration and login) require authentication using JWT tokens.

```
Authorization: Bearer <your_token>
```

> **Security Note**: I initially planned to use API keys, but after a security consultation with a senior student, I switched to JWTs for better security and the ability to include user information directly in the token payload.

## Core Endpoints

### Authentication

#### POST /auth/register

Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure_password",
  "fullName": "John Doe"
}
```

**Response:**
```json
{
  "userId": "user-123",
  "email": "user@example.com",
  "fullName": "John Doe",
  "token": "jwt_token_here"
}
```

#### POST /auth/login

Authenticate an existing user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "userId": "user-123",
  "email": "user@example.com",
  "fullName": "John Doe",
  "token": "jwt_token_here"
}
```

### Tasks

#### GET /tasks

Retrieve tasks, with optional filtering.

**Query Parameters:**
- `workspaceId` (optional): Filter by workspace
- `status` (optional): Filter by status (active, completed, archived)
- `priority` (optional): Filter by priority (high, medium, low)
- `page` (optional): Pagination page number
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "tasks": [
    {
      "id": "task-123",
      "type": "todo",
      "title": "Submit assignment",
      "description": "Send it to professor after submission",
      "dueDate": "2025-04-04T18:00:00Z",
      "status": "active",
      "priority": "high",
      "workspaceId": "workspace-456",
      "createdAt": "2025-03-30T15:43:22Z"
    },
    {
      "id": "task-124",
      "type": "reminder",
      "title": "Team meeting",
      "dueDate": "2025-04-05T10:00:00Z",
      "status": "active",
      "workspaceId": "workspace-789",
      "createdAt": "2025-03-31T09:12:45Z"
    }
  ],
  "pagination": {
    "total": 46,
    "page": 1,
    "limit": 20,
    "pages": 3
  }
}
```

> **Pagination Implementation**: I struggled with pagination initially. First, I tried offset-based pagination but ran into performance issues with large datasets. Switching to cursor-based pagination using the task's creation timestamp significantly improved query performance.

#### POST /tasks

Create a new task.

**Request:**
```json
{
  "type": "todo",
  "title": "Review pull request",
  "description": "Check code quality and tests",
  "dueDate": "2025-04-06T17:00:00Z",
  "priority": "medium",
  "workspaceId": "workspace-789"
}
```

**Response:**
```json
{
  "id": "task-125",
  "type": "todo",
  "title": "Review pull request",
  "description": "Check code quality and tests",
  "dueDate": "2025-04-06T17:00:00Z",
  "status": "active",
  "priority": "medium",
  "workspaceId": "workspace-789",
  "createdAt": "2025-04-01T11:22:33Z"
}
```

#### PUT /tasks/{taskId}

Update an existing task.

**Request:**
```json
{
  "title": "Submit final assignment",
  "status": "completed",
  "completedAt": "2025-04-03T14:30:00Z"
}
```

**Response:**
```json
{
  "id": "task-123",
  "type": "todo",
  "title": "Submit final assignment",
  "description": "Send it to professor after submission",
  "dueDate": "2025-04-04T18:00:00Z",
  "status": "completed",
  "completedAt": "2025-04-03T14:30:00Z",
  "priority": "high",
  "workspaceId": "workspace-456",
  "updatedAt": "2025-04-03T14:30:00Z"
}
```

#### DELETE /tasks/{taskId}

Delete a task.

**Response:** 204 No Content

### NLP Endpoints

#### POST /nlp/parse

Parse natural language into structured task objects.

**Request:**
```json
{
  "text": "Remind me to submit the assignment by 6pm Friday and send it to my prof.",
  "workspaceId": "workspace-456",
  "timezone": "America/New_York"
}
```

**Response:**
```json
{
  "parsed": {
    "type": "todo",
    "title": "Submit assignment",
    "description": "Send it to professor after submission",
    "dueDate": "2025-04-04T18:00:00Z",
    "relatedTo": "College > Semester 4",
    "priority": "high"
  },
  "confidence": 0.92,
  "alternatives": [
    {
      "type": "reminder",
      "title": "Submit assignment and send to professor",
      "dueDate": "2025-04-04T18:00:00Z"
    }
  ]
}
```

> **The Confidence Score**: Adding a confidence score was a late addition that came from user testing. Users were frustrated when the system misinterpreted them but didn't indicate any uncertainty. Now, when confidence is below 0.85, the UI shows alternative interpretations and asks for confirmation.

### Audio Transcription

#### POST /transcribe

Transcribe audio and extract tasks.

**Request:**
```
multipart/form-data

- audio: [binary audio file]
- workspaceId: "workspace-789"
- meetingTitle: "Weekly Team Sync"
- participants: ["John", "Sarah", "Mike"]
```

**Response:**
```json
{
  "transcriptId": "transcript-456",
  "meetingTitle": "Weekly Team Sync",
  "duration": 1845,
  "transcript": "In this meeting we decided to launch the beta by May 15th. John will handle the frontend work and I'll take care of the backend deployment.",
  "summary": "The team discussed the beta launch timeline and assigned responsibilities for frontend and backend work.",
  "tasks": [
    {
      "id": "task-130",
      "type": "milestone",
      "title": "Launch beta",
      "dueDate": "2025-05-15T00:00:00Z",
      "workspaceId": "workspace-789"
    },
    {
      "id": "task-131",
      "type": "task",
      "title": "Complete frontend work",
      "assignee": "John",
      "workspaceId": "workspace-789"
    },
    {
      "id": "task-132",
      "type": "task",
      "title": "Handle backend deployment",
      "assignee": "Me",
      "workspaceId": "workspace-789"
    }
  ]
}
```

> **Processing Time Challenge**: Audio transcription initially had very slow response times, sometimes up to 30 seconds for a 5-minute recording. I implemented a background job system to handle transcription asynchronously, providing immediate feedback to the user with a streaming update mechanism to show progress.

### Context API

#### GET /context/search

Search across tasks, conversations, and other entities using semantic search.

**Query Parameters:**
- `query` (required): The search query
- `workspaceId` (optional): Limit search to a specific workspace
- `limit` (optional): Maximum number of results (default: 10)

**Response:**
```json
{
  "results": [
    {
      "type": "task",
      "id": "task-123",
      "title": "Submit assignment",
      "relevance": 0.92
    },
    {
      "type": "transcript",
      "id": "transcript-456",
      "meetingTitle": "Weekly Team Sync",
      "snippet": "John mentioned that the assignment deadline has been extended to Monday.",
      "relevance": 0.85
    },
    {
      "type": "task",
      "id": "task-125",
      "title": "Review pull request",
      "relevance": 0.73
    }
  ]
}
```

### Workspaces

#### GET /workspaces

Get all workspaces for the current user.

**Response:**
```json
{
  "workspaces": [
    {
      "id": "workspace-456",
      "name": "Personal",
      "createdAt": "2025-01-01T00:00:00Z",
      "taskCount": 12
    },
    {
      "id": "workspace-789",
      "name": "Work",
      "createdAt": "2025-01-02T00:00:00Z",
      "taskCount": 34
    }
  ]
}
```

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "details": {
    "field": "specific_field",
    "issue": "description of the issue"
  }
}
```

Common HTTP status codes:
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (invalid or missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error (server-side issue)

> **Error Design Philosophy**: I spent a lot of time thinking about error responses. The goal was to provide enough information for debuggability without exposing internal system details. The `details` object is only included for validation errors to help clients correct their input.

## Rate Limiting

To ensure system stability, API requests are subject to rate limiting:

- 100 requests per minute for authenticated users
- 10 requests per minute for unauthenticated endpoints

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Total requests allowed per minute
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Timestamp when the limit resets

> **Why Rate Limiting Matters**: I learned this lesson the hard way when a bug in my test script created an infinite loop of API calls that overwhelmed my development instance. Now, even in development, I include rate limiting to catch potential issues early.

## API Versioning

The API uses a simple versioning scheme with the prefix `/v1` in the URL. Future breaking changes will use new version numbers (`/v2`, `/v3`, etc.) while maintaining backward compatibility for a reasonable period.

> **Versioning Decision**: I went with URL-based versioning over header-based versioning because it's more visible and easier to test in a browser or simple tools like curl.

## Using the API with the Mobile App

The mobile app communicates with the API through a centralized service that handles authentication, error processing, and retries:

```typescript
// Simplified example of the API service in the mobile app
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: 'https://api.ell-ena.app/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors consistently
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, redirect to login
      await AsyncStorage.removeItem('auth_token');
      // Navigation logic here
    }
    
    // Format error for display
    const message = error.response?.data?.message || 'Something went wrong';
    // Show error to user
    
    return Promise.reject(error);
  }
);

// Export API endpoints
export const tasksAPI = {
  getTasks: (params) => api.get('/tasks', { params }),
  createTask: (task) => api.post('/tasks', task),
  updateTask: (id, data) => api.put(`/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/tasks/${id}`),
};

export const nlpAPI = {
  parseText: (data) => api.post('/nlp/parse', data),
};

// More API endpoints...
```

This centralized approach ensures consistent handling of authentication and errors throughout the app.

## Testing the API

During development, I created a comprehensive Postman collection to test all endpoints. This collection is available in the `/tools/postman` directory and includes environment variables for different deployment environments (development, staging, production).

For automated testing, I use Jest with Supertest to verify API behavior:

```typescript
// Example of an API test
describe('Tasks API', () => {
  it('should create a new task', async () => {
    const response = await request(app)
      .post('/v1/tasks')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        title: 'Test Task',
        workspaceId: testWorkspaceId,
        type: 'todo'
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe('Test Task');
  });
});
```

## API Future Directions

As Ell-ena evolves, I plan to enhance the API in several ways:

1. **GraphQL Endpoint**: Add a GraphQL API alongside the REST endpoints for more flexible data fetching
2. **Webhooks**: Implement webhooks for real-time notifications of changes
3. **API Key Authentication**: Add support for long-lived API keys for integration with other services
4. **OpenAPI Specification**: Generate complete OpenAPI documentation for better developer experience

The goal is to make Ell-ena not just an app but a platform that can be extended and integrated with other productivity tools. 