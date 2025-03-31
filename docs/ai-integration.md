# AI Integration in Ell-ena

This document details the AI components integrated into Ell-ena, explaining how language models, audio processing, and knowledge graphs work together to create an intelligent assistant experience.

## Overview of AI Components

Ell-ena incorporates several AI technologies:

1. **Large Language Models (LLMs)**: For natural language understanding and generation
2. **Speech-to-Text**: For audio transcription and meeting summaries
3. **Knowledge Graph**: For contextual awareness and relationship tracking
4. **Vector Embeddings**: For semantic search and similarity matching

## Natural Language Processing Pipeline

### Task Extraction from Natural Language

One of Ell-ena's core features is the ability to parse natural language into structured task objects:

```
User: "Remind me to send the proposal to Sarah by next Friday at 5pm"
```

This input goes through the following pipeline:

1. **Context Collection**:
   - Retrieve relevant past messages
   - Get workspace information
   - Identify user's timezone

2. **Intent Detection**:
   - Classify the message type (task creation, query, update, etc.)
   - For task creation, identify the task type (reminder, to-do, meeting, etc.)

3. **Entity Extraction**:
   - Extract action ("send the proposal")
   - Extract recipient ("Sarah")
   - Extract deadline ("next Friday at 5pm")
   - Identify importance/priority cues

4. **Structured Output Generation**:
   ```json
   {
     "type": "reminder",
     "title": "Send the proposal to Sarah",
     "description": "",
     "dueDate": "2025-04-04T17:00:00Z",
     "priority": "medium",
     "assignee": "self",
     "relatedTo": "Proposals"
   }
   ```

### Implementation Details

The task extraction is implemented in `backend/src/controllers/nlpController.ts` using OpenAI's GPT models:

```typescript
// Simplified example of task parsing with OpenAI
const parseText = async (text: string, workspaceId: string, timezone: string) => {
  const prompt = `
    You are a task parsing assistant. Extract structured task information from this text:
    "${text}"
    
    Consider the user's timezone: ${timezone}
    
    Return a JSON object with these fields:
    - type: "todo", "reminder", "milestone", or "meeting"
    - title: A clear, concise title for the task
    - description: Additional details (if any)
    - dueDate: ISO date string for the deadline (if specified)
    - priority: "high", "medium", or "low" based on urgency cues
    - assignee: Who should complete this task
    - tags: Array of relevant categories
  `;
  
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: text }
    ],
    temperature: 0.3,
    response_format: { type: "json_object" }
  });
  
  return JSON.parse(response.choices[0].message.content);
};
```

## Audio Transcription System

### Meeting Transcription Pipeline

Ell-ena can process audio recordings of meetings and extract tasks:

1. **Audio Processing**:
   - Receive audio file (MP3, WAV, M4A)
   - Prepare for transcription (format check, noise reduction if needed)

2. **Speech-to-Text**:
   - Use OpenAI's Whisper API for accurate transcription
   - Generate timestamped transcript with speaker diarization (when available)

3. **Summary Generation**:
   - Create concise meeting summary from transcript
   - Identify key topics and decisions

4. **Task Extraction**:
   - Identify commitments and action items
   - Extract who, what, and when
   - Create structured task objects

### Implementation Details

The transcription flow is implemented in `backend/src/controllers/transcriptionController.ts`:

```typescript
// Simplified example of audio transcription and task extraction
const transcribeAudio = async (audioBuffer: Buffer, workspaceId: string) => {
  // Step 1: Transcribe audio with Whisper
  const transcriptionResponse = await openai.audio.transcriptions.create({
    file: audioBuffer,
    model: "whisper-1",
    language: "en",
    response_format: "verbose_json",
    timestamp_granularities: ["segment"]
  });
  
  const transcript = transcriptionResponse.text;
  
  // Step 2: Generate summary and extract tasks
  const summaryAndTasksResponse = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { 
        role: "system", 
        content: `You are a meeting assistant that summarizes transcripts 
                 and extracts action items and tasks. Create a summary and
                 list all tasks mentioned with their assignees and deadlines.` 
      },
      { role: "user", content: transcript }
    ],
    temperature: 0.5,
    response_format: { type: "json_object" }
  });
  
  const { summary, tasks } = JSON.parse(
    summaryAndTasksResponse.choices[0].message.content
  );
  
  // Step 3: Save transcript, summary, and tasks
  // ... implementation details
  
  return { transcript, summary, tasks };
};
```

## Graph-based RAG System

### Context Awareness with Knowledge Graph

Ell-ena maintains contextual awareness through a knowledge graph that tracks relationships between entities:

1. **Graph Construction**:
   - Nodes: Users, Tasks, Projects, Topics, Meetings
   - Edges: Relationships like "assigned_to", "part_of", "mentioned_in"
   - Properties: Timestamps, relevance scores, interaction counts

2. **Context Retrieval**:
   - When receiving a user message, query the graph for relevant context
   - Retrieve related tasks, recent interactions, and project information
   - Build contextual prompt for the LLM

3. **Response Generation with RAG**:
   - Augment LLM prompt with retrieved context
   - Generate responses that demonstrate awareness of past interactions
   - Reference relevant past tasks and commitments

### Implementation Details

The context system is implemented in `backend/src/controllers/contextController.ts`:

```typescript
// Simplified example of context retrieval from the graph
const getRelevantContext = async (query: string, userId: string, workspaceId: string) => {
  // Step 1: Generate vector embedding for the query
  const embedding = await getEmbedding(query);
  
  // Step 2: Retrieve vector-similar nodes from the graph
  const vectorResults = await neo4j.run(`
    MATCH (n)
    WHERE n.workspace_id = $workspaceId
    WITH n, gds.similarity.cosine(n.embedding, $embedding) AS score
    WHERE score > 0.7
    RETURN n, score
    ORDER BY score DESC
    LIMIT 5
  `, { workspaceId, embedding });
  
  // Step 3: Get graph relationships
  const graphResults = await neo4j.run(`
    MATCH (u:User {id: $userId})-[*1..2]-(n)
    WHERE n.workspace_id = $workspaceId
    RETURN n
    LIMIT 10
  `, { userId, workspaceId });
  
  // Step 4: Combine and format context for the LLM
  const context = formatContextForLLM([...vectorResults, ...graphResults]);
  
  return context;
};

// Generate response with context
const generateContextualResponse = async (query: string, context: string) => {
  const prompt = `
    You are Ell-ena, an AI assistant with access to the following context:
    
    ${context}
    
    Based on this context, please answer the following question:
    ${query}
  `;
  
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: query }
    ],
    temperature: 0.7
  });
  
  return response.choices[0].message.content;
};
```

## Vector Embeddings for Semantic Search

### Semantic Task Search

Ell-ena uses vector embeddings to enable semantic search over tasks and conversations:

1. **Embedding Generation**:
   - Generate embeddings for task titles, descriptions, and conversations
   - Store embeddings in a vector database or alongside graph nodes
   - Update embeddings when items are modified

2. **Semantic Queries**:
   - Convert natural language queries to embeddings
   - Find semantically similar tasks and conversations
   - Rank results by relevance and recency

3. **Search Applications**:
   - "Find tasks similar to this one"
   - "What did we discuss about the marketing plan?"
   - "Show me everything related to the client meeting"

### Implementation Details

Vector embeddings are implemented through the OpenAI Embeddings API:

```typescript
// Simplified example of semantic search implementation
const searchTasks = async (query: string, workspaceId: string) => {
  // Step 1: Generate embedding for the search query
  const queryEmbedding = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: query
  });
  
  // Step 2: Search for similar tasks in the database
  const tasks = await db.query(`
    SELECT id, title, description, status, priority, due_date,
           embedding_similarity(embedding, $embedding) as similarity
    FROM tasks
    WHERE workspace_id = $workspaceId
    ORDER BY similarity DESC
    LIMIT 10
  `, { workspaceId, embedding: queryEmbedding.data[0].embedding });
  
  return tasks.rows;
};
```

## Prompt Engineering

### Effective Prompt Patterns

Throughout Ell-ena, carefully crafted prompts improve AI performance:

1. **Role-Based Prompting**:
   ```
   You are a specialized task extraction assistant for a productivity app.
   ```

2. **Few-Shot Examples**:
   ```
   Input: "Meeting with John about project timeline tomorrow at 3pm"
   Output: {
     "type": "meeting",
     "title": "Project Timeline Discussion with John",
     "dueDate": "2025-04-01T15:00:00Z"
   }
   ```

3. **Format Specification**:
   ```
   Return your response in valid JSON format with these exact fields:
   - type: string (one of "todo", "meeting", "reminder")
   - title: string
   - description: string
   - dueDate: ISO datetime string or null
   ```

4. **Chain-of-Thought Reasoning**:
   ```
   Step 1: Identify the core action in the request.
   Step 2: Determine if there's a deadline mentioned.
   Step 3: Check for priority indicators.
   Step 4: Construct a clear, concise title.
   ```

## AI Fallback Mechanisms

### Graceful Degradation

To ensure reliability, Ell-ena includes several fallback mechanisms:

1. **Model Fallbacks**:
   - Try GPT-4 first, fall back to GPT-3.5 if quota exceeded
   - Progressively simplify complex queries if needed

2. **Confidence Thresholds**:
   - Only use AI-generated structured data if confidence is high
   - Request user verification for low-confidence interpretations

3. **Manual Override**:
   - Always allow users to manually edit AI-generated content
   - Provide clear UI for correcting misinterpretations

4. **Offline Mode**:
   - Store recent context locally for basic functionality when offline
   - Queue API requests for when connectivity is restored

## Responsible AI Practices

### Privacy and Ethics

Ell-ena implements several responsible AI practices:

1. **Data Minimization**:
   - Only send necessary context to external AI services
   - Anonymize sensitive information when possible

2. **User Control**:
   - Allow users to delete their data and AI-generated content
   - Provide transparency about what data is used for training

3. **Bias Mitigation**:
   - Regularly audit for biased outputs or recommendations
   - Implement diverse test cases for evaluation

4. **Explainability**:
   - Make AI reasoning transparent when appropriate
   - Clearly indicate when content is AI-generated

## Future AI Enhancements

### Roadmap for AI Features

Future enhancements to Ell-ena's AI capabilities include:

1. **Multi-modal Understanding**:
   - Process images and documents for additional context
   - Extract text from screenshots and photos

2. **Personalized Language Model**:
   - Fine-tune models on user's writing style and preferences
   - Learn individual terminology and domain-specific language

3. **Proactive Suggestions**:
   - Suggest task prioritization based on deadlines and importance
   - Recommend meeting schedules based on participant availability

4. **Advanced Conversation Capabilities**:
   - Handle multi-turn complex conversations more naturally
   - Maintain longer context windows for extended discussions 