# Graph-based RAG System for Ell-ena

This document outlines the design and implementation of the Graph-based Retrieval-Augmented Generation (RAG) system for Ell-ena.

## Overview

The Graph RAG system enables Ell-ena to maintain context awareness across conversations and tasks, allowing for intelligent retrieval of past information and natural language understanding with contextual knowledge.

## Architecture

```
┌───────────────┐     ┌────────────────┐     ┌───────────────┐
│               │     │                │     │               │
│  User Input   │────▶│  LLM Parser    │────▶│ Task Creation │
│               │     │                │     │               │
└───────────────┘     └────────────────┘     └───────┬───────┘
                              │                      │
                              ▼                      ▼
                      ┌────────────────┐     ┌───────────────┐
                      │                │     │               │
                      │  Context Store │◀───▶│  Graph DB     │
                      │                │     │               │
                      └────────────────┘     └───────────────┘
                              │                      ▲
                              ▼                      │
                      ┌────────────────┐     ┌───────────────┐
                      │                │     │               │
                      │  Vector Store  │────▶│ Query Engine  │
                      │                │     │               │
                      └────────────────┘     └───────────────┘
```

## Components

### 1. Graph Database

We use Neo4j or Weaviate as our graph database to store and maintain relationships between entities.

#### Node Types

- **Task**: Represents a to-do, reminder, milestone, or ticket
- **User**: Represents a user of the system
- **Topic**: Represents a subject area or category
- **Time**: Represents a temporal entity (dates, events)
- **Project**: Represents a collection of related tasks or workspace
- **Meeting**: Represents a transcribed meeting or conversation

#### Relationship Types

- **RELATED_TO**: General relationship between nodes
- **ASSIGNED_TO**: Task assignment to a user
- **PART_OF**: Hierarchy relationship (task part of project)
- **DEPENDS_ON**: Task dependency relationship
- **MENTIONED_IN**: Entity mentioned in a meeting/transcript
- **FOLLOWS**: Temporal relationship between tasks
- **CREATED_BY**: Ownership relationship

### 2. Vector Database

We use a vector database to store embeddings of tasks, conversations, and other entities for semantic search.

#### Implementation Options

- **Pinecone**: For production-ready vector search
- **Faiss**: For local development and testing
- **Weaviate**: For combined graph + vector capabilities

#### Embedding Generation

We use OpenAI's embedding models to convert text into vector representations:

- `text-embedding-ada-002` for general purpose embeddings
- Custom fine-tuned embeddings for task-specific representations

### 3. Context Engine

The Context Engine is responsible for maintaining and retrieving relevant context for user interactions.

#### Features

- **Context Window Management**: Maintains a sliding window of recent interactions
- **Relevance Scoring**: Ranks retrieved context by relevance to current query
- **Entity Linking**: Connects named entities to graph nodes
- **Context Pruning**: Removes irrelevant or outdated context

### 4. Query Engine

The Query Engine allows for natural language querying of the system's knowledge.

#### Query Types Supported

- **Factual Queries**: "What did I say I'd do next week?"
- **Relational Queries**: "What tasks are related to the frontend project?"
- **Temporal Queries**: "What commitments did I make in yesterday's meeting?"
- **Task Queries**: "Show me all high-priority tasks due this month"

## Implementation Details

### Graph Schema

```cypher
// Neo4j Cypher schema definition

// Node labels
CREATE CONSTRAINT FOR (u:User) REQUIRE u.id IS UNIQUE;
CREATE CONSTRAINT FOR (t:Task) REQUIRE t.id IS UNIQUE;
CREATE CONSTRAINT FOR (p:Project) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT FOR (m:Meeting) REQUIRE m.id IS UNIQUE;
CREATE CONSTRAINT FOR (tp:Topic) REQUIRE tp.name IS UNIQUE;

// Example relationship creation
MATCH (t:Task {id: 'task-123'})
MATCH (u:User {id: 'user-456'})
CREATE (t)-[:ASSIGNED_TO]->(u)
```

### Vector Storage

```javascript
// Example of storing a task embedding
const { OpenAIEmbeddings } = require('langchain/embeddings/openai');
const { PineconeStore } = require('langchain/vectorstores/pinecone');

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  model: 'text-embedding-ada-002'
});

// Store task in vector database
async function storeTaskEmbedding(task) {
  const text = `${task.title} ${task.description}`;
  const metadata = {
    id: task.id,
    type: 'task',
    workspace: task.workspaceId,
    created: task.createdAt
  };
  
  await PineconeStore.fromTexts(
    [text],
    [metadata],
    embeddings,
    {
      pineconeIndex: pineconeIndex,
      namespace: task.workspaceId
    }
  );
}
```

### Context Retrieval

```javascript
// Example of retrieving context for a query
async function getRelevantContext(query, userId, workspaceId) {
  // 1. Convert query to embedding
  const queryEmbedding = await embeddings.embedQuery(query);
  
  // 2. Retrieve similar vectors
  const vectorResults = await vectorStore.similaritySearch(query, 5, {
    userId: userId,
    workspaceId: workspaceId
  });
  
  // 3. Query graph for connected entities
  const graphResults = await graphDB.query(`
    MATCH (u:User {id: $userId})-[r]-(n)
    WHERE n.workspaceId = $workspaceId
    RETURN n, r, type(r)
    LIMIT 10
  `, { userId, workspaceId });
  
  // 4. Combine and rank results
  const combinedContext = mergeAndRankResults(vectorResults, graphResults);
  
  return combinedContext;
}
```

### LLM Integration

```javascript
// Example of enhancing LLM with context
const { OpenAI } = require('langchain/llms/openai');
const { PromptTemplate } = require('langchain/prompts');

async function generateContextualResponse(query, userId, workspaceId) {
  // Get relevant context
  const context = await getRelevantContext(query, userId, workspaceId);
  
  // Create prompt with context
  const promptTemplate = PromptTemplate.fromTemplate(`
    You are Ell-ena, an AI assistant with access to the following context:
    
    {context}
    
    Based on this context, please answer the following question:
    Question: {query}
  `);
  
  const prompt = await promptTemplate.format({
    context: formatContextForPrompt(context),
    query: query
  });
  
  // Generate response with LLM
  const llm = new OpenAI({
    temperature: 0.7,
    model: 'gpt-4'
  });
  
  const response = await llm.call(prompt);
  return response;
}
```

## Performance Optimizations

### Caching

We implement multi-level caching to improve performance:

- **In-memory cache**: For frequently accessed nodes and embeddings
- **Redis cache**: For distributed caching across services
- **Query result cache**: For common queries with short TTL

### Batch Processing

- Background jobs for embedding generation
- Batch updates to graph database
- Periodic index optimization

### Query Optimization

- Graph query optimization with proper indexing
- Vector pruning for large collections
- Hybrid retrieval strategies (combine graph + vector results)

## Scaling Considerations

### Horizontal Scaling

- Separate services for graph and vector operations
- Read replicas for graph database
- Sharding strategy for vector database

### Vertical Scaling

- Optimize memory usage for graph operations
- GPU acceleration for embedding generation
- Index compression techniques

## Privacy & Security

- **Data isolation**: Strict workspace boundaries for multi-tenant setup
- **Access control**: Graph-level permissions for sensitive operations
- **Encryption**: Encrypt sensitive data at rest and in transit
- **Auditing**: Track all context retrievals for compliance

## Future Enhancements

### Short-term

- Implement context-aware task suggestions
- Add semantic similarity between tasks
- Support for team awareness in context

### Long-term

- Self-improving context ranking based on user feedback
- Automatic knowledge graph construction from meetings
- Multi-modal context (images, links, documents)
- Federated knowledge graphs across teams and organizations 