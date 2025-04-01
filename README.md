# Ell-ena: AI Product Manager & Personal Assistant

Ell-ena is a mobile-first, AI-powered Product Manager and Personal Assistant designed to help users manage tasks, create tickets, transcribe meetings, and maintain contextual awareness through natural language interactions.

**Working Implementation as of 31st March 2025** :



https://github.com/user-attachments/assets/8a93a0f3-8c3e-46c5-b99b-0c617cb76a70







## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Development Journey](#development-journey)
- [Setup Instructions](#setup-instructions)
- [Best Practices & Optimizations](#best-practices--optimizations)
- [API Documentation](#api-documentation)
- [Future Enhancements](#future-enhancements)

## Project Overview

Ell-ena addresses several challenges faced by knowledge workers, students, and professionals:

- **Context Switching**: Reducing the need to move between different tools
- **Information Fragmentation**: Centralizing important details in one system
- **Cognitive Load**: Offloading the mental effort of tracking tasks and commitments
- **Enhanced AI Integration**: Leveraging modern AI capabilities for natural language understanding

Unlike traditional task managers or note-taking apps, Ell-ena functions as an intelligent assistant that understands relationships between tasks, remembers past interactions, and helps users organize their work seamlessly.

## Architecture

The application follows a client-server architecture with clear separation of concerns:

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

## Key Features

1. **Natural Language Task Creation**
   - Create tasks using everyday language
   - AI automatically extracts key details like deadlines, priority, and context

2. **Contextual Awareness**
   - System remembers past conversations and tasks
   - Maintains relationships between tasks, projects, and topics

3. **Meeting Transcription**
   - Record or upload meeting audio
   - Automatically transcribe and extract action items
   - Generate task summaries from conversations

4. **Integrated Task Management**
   - View, filter, and manage tasks across projects
   - Track deadlines, priorities, and statuses
   - Group related tasks and establish dependencies

5. **Graph-based RAG System**
   - Retrieval-Augmented Generation for improved context
   - Knowledge graph linking tasks, topics, and interactions
   - Semantic search across your knowledge base

## Tech Stack

### Frontend
- **Framework**: React Native with Expo
- **State Management**: Context API & React Hooks
- **UI Components**: Custom components with Gifted Chat for messaging
- **Navigation**: React Navigation
- **Storage**: AsyncStorage for local caching

### Backend
- **Framework**: Fastify with TypeScript
- **Authentication**: JWT with Supabase integration
- **Database**: PostgreSQL & Neo4j (graph database)
- **AI Services**: OpenAI API (GPT-4, Whisper, Embeddings)
- **API Documentation**: Swagger/OpenAPI

### DevOps
- **Version Control**: Git
- **API Testing**: Insomnia/Postman
- **Error Tracking**: Console logging (Sentry integration planned)

## Development Journey

### Phase 1: Project Foundation
1. **Requirements Analysis**
   - Identified core use cases and user flows
   - Created detailed Technical Requirements Document
   - Established architecture and technology choices

2. **Backend Setup**
   - Established Fastify server with TypeScript
   - Implemented JWT authentication
   - Created database schema and models
   - Set up mock database for development

3. **Frontend Scaffolding**
   - Initialized React Native project with Expo
   - Implemented navigation structure
   - Created API service layer with mock fallbacks
   - Built core UI components

### Phase 2: Core Functionality
1. **Authentication System**
   - Implemented user registration and login
   - Created secure token handling
   - Added persistence with AsyncStorage

2. **Task Management**
   - Developed CRUD operations for tasks
   - Implemented filtering and sorting
   - Created task visualization components
   - Added status updates and priority management

3. **Chat Interface**
   - Built conversational UI with Gifted Chat
   - Implemented message persistence
   - Created typing indicators and timestamps
   - Added support for different message types

### Phase 3: AI Integration
1. **Natural Language Processing**
   - Integrated OpenAI API for text processing
   - Developed prompt templates for task extraction
   - Implemented context-aware responses
   - Created structured parsing of natural language

2. **Audio Transcription**
   - Added audio recording capabilities
   - Integrated Whisper API for transcription
   - Implemented task extraction from transcripts
   - Developed meeting summary generation

3. **Context System**
   - Designed graph database schema
   - Implemented context retrieval system
   - Created semantic search capabilities
   - Built relationship tracking between entities

## Setup Instructions

### Prerequisites
- Node.js (v16+)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- PostgreSQL (optional for local development)
- Neo4j (optional for local development)
- OpenAI API key

### Backend Setup
1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/ell-ena.git
   cd ell-ena/backend
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env` file with the following variables:
   ```
   # Server
   PORT=3000
   NODE_ENV=development
   
   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/ellena
   
   # Neo4j
   NEO4J_URI=neo4j://localhost:7687
   NEO4J_USERNAME=neo4j
   NEO4J_PASSWORD=password
   
   # Auth
   JWT_SECRET=your-secret-key
   TOKEN_EXPIRY=7d
   
   # OpenAI
   OPENAI_API_KEY=your-openai-api-key
   ```

4. Start the development server
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate to the frontend directory
   ```bash
   cd ../frontend
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env` file with:
   ```
   API_URL=http://localhost:3000
   ```

4. Start the Expo development server
   ```bash
   npm start
   ```

5. Use Expo Go app on your mobile device or an emulator to test the app

## Best Practices & Optimizations

### Code Organization
- **Clean Architecture**: Separation of concerns with controllers, services, and data access layers
- **TypeScript**: Strong typing for reduced errors and better developer experience
- **Modular Components**: Reusable UI components with clear responsibilities

### Performance Optimizations
- **API Mocking**: Fallback to mock data when services are unavailable
- **Efficient Rendering**: List virtualization for better performance with large datasets
- **Lazy Loading**: Components loaded only when needed
- **Debounced Searches**: Reduced API calls for search operations

### Security Measures
- **JWT Authentication**: Secure token-based auth with proper expiration
- **Request Validation**: Schema validation for all API endpoints
- **Secure Storage**: Proper handling of sensitive data
- **Input Sanitization**: Protection against injection attacks

### Error Handling
- **Graceful Degradation**: Fallbacks when services are unavailable
- **User-Friendly Errors**: Meaningful error messages for users
- **Error Boundaries**: Component-level error catching in React
- **Consistent Error Responses**: Standardized API error formats

### Testing Strategy
- **Unit Testing**: Individual component testing
- **API Testing**: Endpoint validation with Postman/Insomnia
- **Manual Testing**: User flow validation on various devices

## API Documentation

### Authentication
- `POST /api/auth/register`: Register a new user
- `POST /api/auth/login`: Login with credentials
- `GET /api/auth/verify`: Verify authentication token

### Workspaces
- `GET /api/workspaces`: Get all workspaces
- `POST /api/workspaces`: Create a new workspace
- `GET /api/workspaces/:id`: Get a specific workspace
- `PUT /api/workspaces/:id`: Update a workspace
- `DELETE /api/workspaces/:id`: Delete a workspace

### Tasks
- `GET /api/tasks`: Get tasks with optional filters
- `POST /api/tasks`: Create a new task
- `GET /api/tasks/:id`: Get a specific task
- `PUT /api/tasks/:id`: Update a task
- `DELETE /api/tasks/:id`: Delete a task

### NLP & AI
- `POST /api/nlp/process-message`: Process a chat message
- `POST /api/nlp/parse-text`: Parse text into structured task
- `POST /api/transcribe`: Transcribe audio file

### Context
- `GET /api/context/search`: Search contextual information
- `GET /api/context/task/:taskId`: Get context for a specific task

## Future Enhancements

1. **Advanced Context Awareness**
   - Enhanced relationship detection between tasks
   - Automatic categorization of tasks and topics
   - Improved memory and recall of past interactions

2. **Multi-modal Inputs**
   - Image processing for text extraction
   - Document parsing and summarization
   - Voice commands and hands-free operation

3. **Integration Ecosystem**
   - Calendar integration (Google Calendar, Outlook)
   - Email processing and task extraction
   - Third-party task manager synchronization

4. **Team Collaboration**
   - Shared workspaces and task assignments
   - Team activity feeds and notifications
   - Permission management and role-based access

5. **Advanced Analytics**
   - Productivity insights and patterns
   - Task completion statistics
   - Time management recommendations

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- OpenAI for their powerful language models
- The React Native and Expo communities
- All contributors to this project 
