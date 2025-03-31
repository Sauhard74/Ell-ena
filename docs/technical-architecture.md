# Ell-ena Technical Architecture

This document provides a detailed overview of Ell-ena's technical architecture, including component interactions, data flow, and system design decisions.

## System Architecture Overview

```
┌─────────────────────────────────────────┐
│                                         │
│            Mobile Frontend              │
│        (React Native with Expo)         │
│                                         │
└───────────────┬─────────────────────────┘
                │
                │ HTTP/REST
                │
┌───────────────▼─────────────────────────┐
│                                         │
│              Backend API                │
│           (Fastify + TypeScript)        │
│                                         │
└───┬───────────────┬───────────────────┬─┘
    │               │                   │
    │               │                   │
┌───▼───┐       ┌───▼───┐           ┌───▼───┐
│       │       │       │           │       │
│ PostgreSQL    │ Neo4j │           │ OpenAI│
│ (Relational)  │ (Graph)│           │  API  │
│       │       │       │           │       │
└───────┘       └───────┘           └───────┘
```

## Frontend Architecture

The frontend is built with React Native and Expo to support cross-platform mobile development:

```
┌──────────────────────────────────────────────────────────┐
│                     React Native App                     │
│                                                          │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐    │
│  │             │   │             │   │             │    │
│  │  Screens    │   │  Components │   │  Navigation │    │
│  │             │   │             │   │             │    │
│  └─────────────┘   └─────────────┘   └─────────────┘    │
│                                                          │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐    │
│  │             │   │             │   │             │    │
│  │  Contexts   │   │  Services   │   │  Hooks      │    │
│  │             │   │             │   │             │    │
│  └─────────────┘   └─────────────┘   └─────────────┘    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Key Frontend Components

1. **Navigation Structure**
   - **AuthStack**: Login and registration screens
   - **MainStack**: Home, Chat, Tasks, and Settings screens
   - **NavigationContainer**: Manages overall navigation state

2. **Screens**
   - **HomeScreen**: Dashboard with recent activity and summaries
   - **ChatScreen**: Conversational interface using Gifted Chat
   - **TasksScreen**: Task management with filters and actions
   - **SettingsScreen**: User preferences and profile management

3. **State Management**
   - **AuthContext**: Handles user authentication state
   - **ThemeContext**: Manages light/dark theme preferences
   - **React Hooks**: Custom hooks for business logic

4. **Services**
   - **api.ts**: Centralized API client with Axios
   - **mockApi.ts**: Mock implementations for development

## Backend Architecture

The backend follows a modular architecture with controllers, services, and data access layers:

```
┌──────────────────────────────────────────────────────────┐
│                    Fastify Server                        │
│                                                          │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐    │
│  │             │   │             │   │             │    │
│  │  Routes     │   │ Controllers │   │ Middleware  │    │
│  │             │   │             │   │             │    │
│  └─────────────┘   └─────────────┘   └─────────────┘    │
│                                                          │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐    │
│  │             │   │             │   │             │    │
│  │  Services   │   │ Data Access │   │ Utilities   │    │
│  │             │   │             │   │             │    │
│  └─────────────┘   └─────────────┘   └─────────────┘    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Key Backend Components

1. **API Routes**
   - **/api/auth**: Authentication endpoints (register, login, verify)
   - **/api/workspaces**: Workspace management
   - **/api/tasks**: Task CRUD operations
   - **/api/nlp**: Natural language processing endpoints
   - **/api/transcribe**: Audio transcription
   - **/api/context**: Context retrieval system

2. **Controllers**
   - **authController**: User authentication logic
   - **taskController**: Task management operations
   - **nlpController**: Natural language processing logic
   - **transcriptionController**: Audio processing
   - **contextController**: Graph query and context retrieval

3. **Middleware**
   - **authenticate**: JWT validation
   - **errorHandler**: Standardized error responses
   - **requestValidator**: Schema validation

4. **Services**
   - **openaiService**: Integration with OpenAI APIs
   - **graphService**: Neo4j graph operations
   - **dbService**: PostgreSQL database operations

## Database Architecture

Ell-ena uses a hybrid database approach:

### PostgreSQL Schema

```
┌─────────────────┐       ┌─────────────────┐
│                 │       │                 │
│      Users      │◄─────►│   Workspaces    │
│                 │       │                 │
└────────┬────────┘       └────────┬────────┘
         │                         │
         │                         │
         │                         │
┌────────▼────────┐       ┌────────▼────────┐
│                 │       │                 │
│      Tasks      │◄─────►│  Transcripts    │
│                 │       │                 │
└────────┬────────┘       └─────────────────┘
         │
         │
┌────────▼────────┐
│                 │
│ TaskRelationships│
│                 │
└─────────────────┘
```

### Neo4j Graph Model

```
(User)-[:OWNS]->(Workspace)-[:CONTAINS]->(Task)
                              |
(Task)-[:ASSIGNED_TO]->(User)
  |
  └─[:RELATED_TO]─┐
                  │
(Task)<──[:DEPENDS_ON]──>(Task)
  |
  └─[:MENTIONED_IN]─>(Transcript)
                        |
(Topic)<──[:APPEARS_IN]─┘
```

## AI Integration

The system uses several AI components:

```
┌───────────────────────────────────────────────────┐
│                                                   │
│                   OpenAI API                      │
│                                                   │
├───────────────────┬───────────────┬───────────────┤
│                   │               │               │
│    GPT-4 Model    │  Whisper API  │  Embeddings   │
│                   │               │               │
└───────────────────┴───────────────┴───────────────┘
          │                  │              │
          ▼                  ▼              ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│               │    │               │    │               │
│ Task Parsing  │    │ Transcription │    │ Vector Search │
│               │    │               │    │               │
└───────────────┘    └───────────────┘    └───────────────┘
```

### NLP Pipeline

The NLP pipeline processes natural language input:

```
User Message
    │
    ▼
┌─────────────────┐
│ Message Context │
│ Extraction      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Intent          │
│ Classification  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Entity          │
│ Recognition     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Task Object     │
│ Construction    │
└────────┬────────┘
         │
         ▼
  Structured Task
```

## Security Architecture

Security measures implemented in the system:

```
┌───────────────────────────────────────────────────┐
│                   API Security                    │
├───────────────────┬───────────────┬───────────────┤
│                   │               │               │
│    JWT Tokens     │   CORS Policy │   Rate Limits │
│                   │               │               │
└───────────────────┴───────────────┴───────────────┘

┌───────────────────────────────────────────────────┐
│                  Data Security                    │
├───────────────────┬───────────────┬───────────────┤
│                   │               │               │
│ Password Hashing  │   Row-Level   │   Input       │
│    (bcrypt)       │   Security    │   Validation  │
│                   │               │               │
└───────────────────┴───────────────┴───────────────┘
```

## Error Handling Strategy

```
┌───────────────────────────────────────────────────┐
│                  Error Handling                   │
├───────────────────┬───────────────┬───────────────┤
│                   │               │               │
│  Global Handler   │ Service-Level │ Client-Side   │
│                   │ Try/Catch     │ Error States  │
│                   │               │               │
└───────────────────┴───────────────┴───────────────┘
```

## Data Flow: Creating a Task from Natural Language

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│          │    │          │    │          │    │          │
│  User    │───►│  Chat UI │───►│  NLP API │───►│  OpenAI  │
│          │    │          │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                      │
                                                      ▼
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│          │    │          │    │          │    │          │
│  Task UI │◄───│  Task API│◄───│  Task    │◄───│ Structured│
│          │    │          │    │  Service │    │  JSON     │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

## Design Decisions and Rationale

1. **Why Fastify?**
   - Performance-focused Node.js framework with low overhead
   - Built-in TypeScript support
   - Schema validation with automatic documentation

2. **Why Neo4j + PostgreSQL?**
   - PostgreSQL for structured relational data
   - Neo4j for complex relationship modeling and graph queries
   - Complementary strengths for different data access patterns

3. **Why React Native + Expo?**
   - Cross-platform mobile development
   - Rapid prototyping capabilities
   - Access to native features while maintaining a unified codebase

4. **Mock-First Development**
   - Allows development without dependency on external services
   - Enables testing edge cases and failure scenarios
   - Simplifies local development environment setup 