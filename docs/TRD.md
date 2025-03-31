# Technical Requirements Document (TRD)

## Architecture Overview

Ell-ena is designed as a mobile-first application with a backend API service. The architecture follows a client-server model with clear separation of concerns.

### Mobile Frontend (React Native + Expo)

```
Mobile (React Native)
│
├── Chat UI (Gifted Chat) 📲
│   └── Handles all user input/output
│
├── Task View UI (FlatList, Modals) 🗂️
│   └── Show tasks/tickets dynamically
│
└── Audio Transcription UI 🎤
    └── Record/upload → API → Text
```

### Backend (Fastify + TypeScript)

```
Backend (Fastify + TypeScript)
│
├── /parse (POST) 🧠
│   └── OpenAI Prompt → JSON Task
│
├── /tasks (GET/POST/PUT/DELETE) 📋
│   └── Task CRUD APIs
│
├── /transcribe (POST) 🧾
│   └── Audio file → Whisper → Summary + Tasks
│
├── /context (GET) 🧠
│   └── Return user memory graph (for RAG)
│
└── Auth (Supabase or Clerk) 🔐
    └── JWT token → User identity
```

## AI & NLP Pipeline

### Stage 1: Prompt-Based LLM Extraction (MVP)

The initial MVP will use a prompt-based approach with OpenAI's GPT model:

```
You are an AI assistant. Convert the following sentence into a structured task object.

User: "Create a to-do for submitting the UI wireframes by Monday."

Return format:
{
  "type": "todo",
  "title": "Submit UI wireframes",
  "description": "",
  "dueDate": "2025-04-01"
}
```

### Stage 2: Graph-based RAG Engine (v1)

We'll implement a graph-based Retrieval-Augmented Generation (RAG) engine using:
- Neo4j or Weaviate for storage
- LangChain for orchestration

The graph structure will include:
- **Nodes**: Tasks, Users, Topics, Times, Projects
- **Edges**: "related to", "reminded at", "owned by"

### Stage 3: Vector DB + Semantic Search

For advanced context retrieval:
- Store task embeddings in a vector database
- Implement semantic search for retrieving relevant past tasks
- Allow natural language queries about past interactions

## API Specifications

### POST /parse

Parses natural language into structured task objects.

**Request:**
```json
{
  "text": "Remind me to submit the assignment by 6pm Friday and send it to my prof.",
  "userId": "user-123",
  "workspaceId": "workspace-456"
}
```

**Response:**
```json
{
  "type": "todo",
  "title": "Submit assignment",
  "description": "Send it to professor after submission",
  "dueDate": "2025-04-04T18:00:00Z",
  "relatedTo": "College > Semester 4",
  "priority": "high"
}
```

### GET /tasks

Retrieves tasks for a user.

**Request:**
```
GET /tasks?userId=user-123&workspaceId=workspace-456&status=active
```

**Response:**
```json
{
  "tasks": [
    {
      "id": "task-789",
      "type": "todo",
      "title": "Submit assignment",
      "description": "Send it to professor after submission",
      "dueDate": "2025-04-04T18:00:00Z",
      "status": "active",
      "createdAt": "2025-03-30T15:43:22Z"
    },
    // More tasks...
  ]
}
```

### POST /transcribe

Transcribes audio and extracts tasks.

**Request:**
```
POST /transcribe
Content-Type: multipart/form-data

{
  "audio": [binary data],
  "userId": "user-123",
  "workspaceId": "workspace-456"
}
```

**Response:**
```json
{
  "transcript": "In this meeting we decided to launch the beta by May 15th. John will handle the frontend work and I'll take care of the backend deployment.",
  "tasks": [
    {
      "type": "milestone",
      "title": "Launch beta",
      "dueDate": "2025-05-15T00:00:00Z",
      "assignee": null
    },
    {
      "type": "task",
      "title": "Complete frontend work",
      "assignee": "John"
    },
    {
      "type": "task",
      "title": "Handle backend deployment",
      "assignee": "Me"
    }
  ]
}
```

## Database Schema

### PostgreSQL Schema (Supabase)

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Workspaces table
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  owner_id UUID REFERENCES users(id) NOT NULL
);

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active',
  priority TEXT,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  assignee UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task relationships (for graph connections)
CREATE TABLE task_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  target_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transcripts table
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  summary TEXT,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Security Considerations

### Authentication & Authorization

- Supabase Auth for user management
- JWT-based authentication
- Row-Level Security (RLS) policies in PostgreSQL
- Secure API endpoints with JWT verification

### Data Security

- Encrypt sensitive data at rest
- TLS encryption for data in transit
- Regular security audits
- Rate limiting to prevent abuse

## Deployment Strategy

### MVP Phase

- **Backend**: Deploy to Render or Railway
- **Mobile**: Deploy to Expo and TestFlight
- **Database**: Supabase hosted instance

### Production Phase

- **Backend**: Move to Fly.io or AWS Elastic Beanstalk
- **Mobile**: App Store and Google Play Store
- **Database**: Dedicated PostgreSQL instance with read replicas

## Performance Considerations

- Implement caching for frequently accessed data
- Optimize database queries with proper indexing
- Lazy load UI components for faster app startup
- Implement pagination for task lists

## Testing Strategy

- **Unit Tests**: Jest for backend services
- **Integration Tests**: Supertest for API endpoints
- **E2E Tests**: Detox for mobile app
- **Load Testing**: k6 for API performance

## Monitoring & Analytics

- Error tracking with Sentry
- Performance monitoring with DataDog
- User analytics with Amplitude
- API usage metrics with custom dashboards

## Internationalization

Future support for multiple languages using i18n libraries. 