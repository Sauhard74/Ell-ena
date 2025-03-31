# Ell-ena Backend API

Backend for Ell-ena - AI Product Manager & Personal Assistant

## Features

- User authentication and management
- Workspace management
- Task management with relationship graph
- NLP processing for task extraction from text
- Audio transcription and processing
- Context retrieval for task assistance
- Activity logging

## Technology Stack

- **Framework**: Fastify
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Graph Database**: Neo4j
- **Authentication**: JWT
- **File Storage**: Supabase
- **AI Services**: OpenAI

## Prerequisites

- Node.js 18+
- PostgreSQL
- Neo4j
- OpenAI API key
- Supabase account (for file storage)

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
cd ell-ena/backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the `backend` directory by copying `.env.example`:

```bash
cp .env.example .env
```

Then fill in the required environment variables:

- `JWT_SECRET`: Secret key for JWT authentication
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: Your OpenAI API key
- `SUPABASE_URL` and `SUPABASE_KEY`: Your Supabase project URL and anon key
- `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`: Neo4j connection details

### 4. Database Setup

Run the SQL schema to create the database tables:

```bash
psql -U <username> -d <database> -f src/utils/schema.sql
```

### 5. Run the development server

```bash
npm run dev
```

The server will be running at `http://localhost:3000` by default.

### 6. Build for production

```bash
npm run build
npm start
```

## API Documentation

When the server is running, you can access the Swagger API documentation at:

```
http://localhost:3000/documentation
```

## Project Structure

```
src/
├── config/         # Configuration files
├── controllers/    # API route controllers
├── middleware/     # Middleware functions
├── models/         # Type definitions
├── routes/         # API route definitions
├── services/       # Business logic services
├── utils/          # Utility functions
├── app.ts          # Application setup
└── index.ts        # Entry point
```

## Authentication

The API uses JWT authentication. To authenticate requests, include a bearer token in the `Authorization` header:

```
Authorization: Bearer <your-token>
```

## License

[ISC License](LICENSE) 