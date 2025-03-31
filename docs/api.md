# Ell-ena API Documentation

This document outlines the RESTful API endpoints available in the Ell-ena backend service.

## Base URL

```
https://api.ell-ena.app/v1
```

## Authentication

All API requests require authentication using a JWT token.

Include the token in the Authorization header:

```
Authorization: Bearer <your_token>
```

## Endpoints

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

Log in an existing user.

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

### User Management

#### GET /users/me

Get the current user profile.

**Response:**
```json
{
  "userId": "user-123",
  "email": "user@example.com",
  "fullName": "John Doe",
  "createdAt": "2025-01-01T00:00:00Z",
  "workspaces": [
    {
      "id": "workspace-456",
      "name": "Personal"
    },
    {
      "id": "workspace-789",
      "name": "Work"
    }
  ]
}
```

#### PUT /users/me

Update the current user profile.

**Request:**
```json
{
  "fullName": "John Smith",
  "preferences": {
    "theme": "dark",
    "notifications": true
  }
}
```

**Response:**
```json
{
  "userId": "user-123",
  "email": "user@example.com",
  "fullName": "John Smith",
  "preferences": {
    "theme": "dark",
    "notifications": true
  },
  "updatedAt": "2025-01-15T00:00:00Z"
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

#### POST /workspaces

Create a new workspace.

**Request:**
```json
{
  "name": "Project X",
  "description": "Special project workspace"
}
```

**Response:**
```json
{
  "id": "workspace-101",
  "name": "Project X",
  "description": "Special project workspace",
  "createdAt": "2025-01-20T00:00:00Z",
  "ownerId": "user-123"
}
```

#### GET /workspaces/{workspaceId}

Get details for a specific workspace.

**Response:**
```json
{
  "id": "workspace-456",
  "name": "Personal",
  "description": "My personal tasks",
  "createdAt": "2025-01-01T00:00:00Z",
  "ownerId": "user-123",
  "members": [
    {
      "userId": "user-123",
      "fullName": "John Doe",
      "role": "owner"
    }
  ]
}
```

#### PUT /workspaces/{workspaceId}

Update a workspace.

**Request:**
```json
{
  "name": "Personal 2.0",
  "description": "Updated personal workspace"
}
```

**Response:**
```json
{
  "id": "workspace-456",
  "name": "Personal 2.0",
  "description": "Updated personal workspace",
  "updatedAt": "2025-01-25T00:00:00Z"
}
```

#### DELETE /workspaces/{workspaceId}

Delete a workspace.

**Response:**
```
Status: 204 No Content
```

### Tasks

#### GET /tasks

Get tasks for the current user, optionally filtered by workspace.

**Query Parameters:**
- `workspaceId` (optional): Filter by workspace
- `status` (optional): Filter by status (active, completed, archived)
- `type` (optional): Filter by task type (todo, reminder, milestone, etc.)
- `page` (optional): Page number for pagination
- `limit` (optional): Number of tasks per page

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
    "limit": 10,
    "pages": 5
  }
}
```

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

#### GET /tasks/{taskId}

Get details for a specific task.

**Response:**
```json
{
  "id": "task-123",
  "type": "todo",
  "title": "Submit assignment",
  "description": "Send it to professor after submission",
  "dueDate": "2025-04-04T18:00:00Z",
  "status": "active",
  "priority": "high",
  "workspaceId": "workspace-456",
  "createdAt": "2025-03-30T15:43:22Z",
  "updatedAt": "2025-03-30T15:43:22Z",
  "createdBy": "user-123",
  "assignee": "user-123",
  "relatedTasks": [
    {
      "id": "task-126",
      "title": "Research assignment topic",
      "relationship": "prerequisite"
    }
  ]
}
```

#### PUT /tasks/{taskId}

Update a task.

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

**Response:**
```
Status: 204 No Content
```

### Natural Language Processing

#### POST /parse

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

### Meeting Transcription

#### POST /transcribe

Transcribe audio and extract tasks.

**Request:**
```
Content-Type: multipart/form-data

{
  "audio": [binary data],
  "workspaceId": "workspace-789",
  "meetingTitle": "Weekly Team Sync",
  "participants": ["John", "Sarah", "Mike"]
}
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

### Context & Memory

#### GET /context

Get contextual information based on a query.

**Query Parameters:**
- `query` (required): The context query
- `workspaceId` (optional): Limit context to a specific workspace

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

## Error Responses

### 400 Bad Request

```json
{
  "error": "Bad Request",
  "message": "Invalid request parameters",
  "details": {
    "field": "email",
    "issue": "must be a valid email address"
  }
}
```

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Authentication token is invalid or expired"
}
```

### 403 Forbidden

```json
{
  "error": "Forbidden",
  "message": "You do not have permission to access this resource"
}
```

### 404 Not Found

```json
{
  "error": "Not Found",
  "message": "The requested resource was not found"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

## Rate Limiting

API requests are subject to rate limiting:

- 100 requests per minute for authenticated users
- 10 requests per minute for unauthenticated users

Rate limit headers:
- `X-RateLimit-Limit`: Total number of requests allowed per minute
- `X-RateLimit-Remaining`: Number of requests remaining in the current minute
- `X-RateLimit-Reset`: Timestamp when the rate limit will reset 