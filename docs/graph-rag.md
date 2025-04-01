# Building a Graph-based RAG System: Ell-ena's "Brain"

## The Context Challenge

When I started building Ell-ena, I quickly realized that the typical "chat history as context" approach wouldn't be enough. I needed a system that could:

1. Remember conversations and tasks from weeks or months ago
2. Understand complex relationships between entities (tasks, people, projects)
3. Retrieve relevant information based on semantic meaning, not just keywords
4. Scale to thousands of items without overwhelming the context window

> **Personal Struggle:** I vividly remember testing an early prototype where I asked, "What tasks do I have related to the marketing project?" and getting the response, "I don't have any information about a marketing project." This was frustrating because I had created several marketing tasks just days before! This gap drove me to research better context management solutions.

## From Traditional RAG to Graph RAG

### Traditional RAG Limitations

I first implemented a traditional Retrieval-Augmented Generation (RAG) system using vector embeddings:

```typescript
// Early implementation with vector-only retrieval
async function getRelevantContext(query: string) {
  // Convert query to embedding
  const embedding = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: query
  });
  
  // Find similar items in vector DB
  const results = await vectorDb.similaritySearch(
    embedding.data[0].embedding,
    5  // Return top 5 results
  );
  
  return results;
}
```

This worked for simple queries but fell short in several ways:

1. **Missing Relationships**: Vector similarity couldn't capture that "Task A depends on Task B"
2. **Context Fragmentation**: Related items weren't retrieved together
3. **Recency Bias**: Older but relevant items were often missed
4. **Lack of Structure**: All items were treated equally, without hierarchy

### The Graph Database Insight

After much research, I had an "aha" moment: what if I combined vector search with graph traversal?

```
Vector Search: "What's similar to this query?"
       +
Graph Traversal: "What's connected to these results?"
       =
Comprehensive Context Retrieval
```

This insight led me to implement a hybrid "Graph RAG" system.

## Graph RAG Architecture

The Graph RAG system in Ell-ena consists of these key components:

```
┌───────────────┐     ┌────────────────┐     ┌───────────────┐
│               │     │                │     │               │
│  User Query   │────▶│  Query Engine  │────▶│  LLM Response │
│               │     │                │     │               │
└───────────────┘     └────────────────┘     └───────────────┘
                              │
                              ▼
                      ┌────────────────┐
                      │                │
                      │  Context Store │
                      │                │
                      └───────┬────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
          ┌─────────▼─────┐     ┌───────▼─────────┐
          │               │     │                 │
          │  Vector DB    │     │   Graph DB      │
          │               │     │                 │
          └───────────────┘     └─────────────────┘
```

### The Graph Schema

The heart of the system is a carefully designed graph schema in Neo4j:

```cypher
// Node types with properties
CREATE (u:User {id: "user-123", name: "John"})
CREATE (w:Workspace {id: "workspace-456", name: "Personal"})
CREATE (t:Task {id: "task-789", title: "Finish presentation", dueDate: "2025-04-15"})
CREATE (p:Project {id: "project-101", name: "Q2 Marketing"})
CREATE (m:Meeting {id: "meeting-202", title: "Team Sync", date: "2025-03-28"})

// Relationships between nodes
CREATE (u)-[:OWNS]->(w)
CREATE (w)-[:CONTAINS]->(t)
CREATE (t)-[:PART_OF]->(p)
CREATE (t)-[:MENTIONED_IN]->(m)
CREATE (t)-[:DEPENDS_ON]->(:Task {id: "task-790", title: "Gather research data"})
```

> **Design Evolution:** My initial graph schema was much simpler, with just tasks and users. But after interviewing potential users, I realized they think in terms of projects, meetings, and other higher-level contexts. Expanding the schema to match their mental model made the retrieved context much more useful.

### Vector + Graph Retrieval

The magic happens in the hybrid retrieval function:

```typescript
async function getContextualInformation(query: string, userId: string) {
  // Step 1: Vector search to find semantically similar items
  const vectorResults = await performVectorSearch(query);
  
  // Step 2: Extract the IDs of the vector results
  const seedIds = vectorResults.map(result => result.id);
  
  // Step 3: Use graph traversal to find connected items
  const graphQuery = `
    // Start with the seed nodes from vector search
    MATCH (seed)
    WHERE seed.id IN $seedIds
    
    // Find nodes connected within 2 steps
    MATCH path = (seed)-[*1..2]-(connected)
    WHERE connected.workspaceId IN $workspaceIds
    
    // Include user's recent interactions
    UNION
    MATCH (u:User {id: $userId})-[r:INTERACTED_WITH|CREATED|ASSIGNED_TO]->(item)
    WHERE r.timestamp > datetime() - duration('P7D')
    
    RETURN connected, seed, path
    LIMIT 20
  `;
  
  const graphResults = await neo4j.run(graphQuery, {
    seedIds,
    workspaceIds: [currentWorkspaceId],
    userId
  });
  
  // Step 4: Combine and rank results
  return rankAndFormatResults(vectorResults, graphResults);
}
```

This dual approach gives us the best of both worlds:

1. **Semantic Understanding**: Vector search finds relevant content even with different wording
2. **Relationship Awareness**: Graph traversal finds connected items
3. **Temporal Context**: Recent interactions are included
4. **Workspace Boundaries**: Results are filtered to the current context

## Ranking and Relevance

Not all context is equally relevant. I implemented a scoring system that considers:

```typescript
function scoreContextItem(item, query, vectorScore) {
  let score = vectorScore || 0;
  
  // Boost score based on recency
  const daysSinceCreation = daysBetween(new Date(), new Date(item.createdAt));
  score += Math.max(0, 1 - (daysSinceCreation / 30) * 0.5);  // Newer items get up to +0.5
  
  // Boost score based on relationship proximity
  score += (2 - item.distance) * 0.2;  // Direct connections get +0.2, secondary +0.1
  
  // Boost score for items explicitly mentioned in query
  if (queryMentionsItem(query, item)) {
    score += 0.3;
  }
  
  return score;
}
```

> **The Recency Trap:** In my first implementation, I weighted recency too heavily, and older but important items were consistently missed. Finding the right balance between recency and relevance took several iterations of testing with real users.

## Formatting Context for the LLM

Once relevant items are retrieved, they need to be formatted for the LLM. I experimented with several formats and found this approach most effective:

```typescript
function formatContextForLLM(items) {
  // Group items by type
  const groupedItems = groupBy(items, 'type');
  
  let formattedContext = "Here's what I know that might be relevant:";
  
  // Format tasks
  if (groupedItems.tasks?.length > 0) {
    formattedContext += "\n\nTasks:";
    groupedItems.tasks.forEach(task => {
      formattedContext += `\n- ${task.title} (${task.status}, due: ${formatDate(task.dueDate)})`;
      if (task.description) formattedContext += `\n  Details: ${task.description}`;
    });
  }
  
  // Format projects
  if (groupedItems.projects?.length > 0) {
    formattedContext += "\n\nProjects:";
    groupedItems.projects.forEach(project => {
      formattedContext += `\n- ${project.name}`;
      if (project.description) formattedContext += `\n  ${project.description}`;
    });
  }
  
  // Format relationships
  formattedContext += "\n\nRelationships:";
  items.forEach(item => {
    if (item.relationships) {
      item.relationships.forEach(rel => {
        formattedContext += `\n- ${item.title} ${rel.type} ${rel.targetTitle}`;
      });
    }
  });
  
  return formattedContext;
}
```

## Implementation Challenges

Building this system wasn't without challenges:

### 1. Neo4j vs. PostgreSQL Integration

I initially struggled with how to integrate Neo4j with my PostgreSQL database:

```typescript
// The synchronization challenge
async function syncTaskToGraph(task) {
  try {
    // Create or update task node in Neo4j
    await neo4j.run(`
      MERGE (t:Task {id: $id})
      ON CREATE SET t.title = $title, t.createdAt = datetime()
      ON MATCH SET t.title = $title, t.updatedAt = datetime(),
                  t.status = $status, t.dueDate = $dueDate
      
      WITH t
      
      // Connect to workspace
      MATCH (w:Workspace {id: $workspaceId})
      MERGE (t)-[:IN_WORKSPACE]->(w)
      
      // Connect to creator
      MATCH (u:User {id: $createdBy})
      MERGE (u)-[:CREATED]->(t)
    `, {
      id: task.id,
      title: task.title,
      status: task.status,
      dueDate: task.dueDate,
      workspaceId: task.workspaceId,
      createdBy: task.createdBy
    });
  } catch (error) {
    console.error('Failed to sync task to graph:', error);
    // Critical decision: What to do on sync failure?
    // I chose to continue without the graph data rather than fail the task creation
  }
}
```

> **My Solution:** I implemented a "write-through" pattern where changes are written to PostgreSQL first, then synced to Neo4j asynchronously. If the Neo4j sync fails, the system can still function with PostgreSQL data alone, which provides graceful degradation.

### 2. Query Performance

Early versions of my graph queries were too slow:

```cypher
// Initial inefficient query
MATCH (seed)-[*1..3]-(connected)
WHERE seed.id IN $seedIds
RETURN connected
```

I had to optimize with more specific relationship patterns and better indexing:

```cypher
// Optimized query with specific relationships and limits
MATCH (seed)
WHERE seed.id IN $seedIds
MATCH path = (seed)-[:RELATED_TO|DEPENDS_ON|PART_OF|MENTIONED_IN*1..2]-(connected)
WHERE connected.workspaceId IN $workspaceIds
RETURN connected, relationships(path)
LIMIT 15
```

### 3. Context Window Management

Even with good retrieval, I still needed to manage the LLM context window efficiently:

```typescript
function pruneContextToFit(context, maxTokens) {
  let estimatedTokens = estimateTokenCount(context);
  
  if (estimatedTokens <= maxTokens) {
    return context;
  }
  
  // Sort items by score
  const sortedItems = [...context.items].sort((a, b) => b.score - a.score);
  
  // Keep removing lowest-scored items until we fit
  while (estimatedTokens > maxTokens && sortedItems.length > 0) {
    sortedItems.pop();
    const prunedContext = formatContextForLLM(sortedItems);
    estimatedTokens = estimateTokenCount(prunedContext);
  }
  
  return formatContextForLLM(sortedItems);
}
```

## Real-World Impact

The Graph RAG system dramatically improved Ell-ena's contextual awareness. Here's a real example showing the difference:

### Before Graph RAG:

```
User: "What tasks do I have for the marketing project?"
Ell-ena: "I don't have specific information about a marketing project."
```

### After Graph RAG:

```
User: "What tasks do I have for the marketing project?"
Ell-ena: "For the Q2 Marketing project, you have 3 active tasks:
1. 'Finish presentation' (due April 15th)
2. 'Review social media copy' (due April 10th)
3. 'Coordinate with design team' (due April 5th)

The presentation task depends on 'Gather research data' which was 
completed on March 25th."
```

The difference is striking - Ell-ena now understands relationships between entities and can provide rich, contextual responses.

## Future Directions

I'm continuing to evolve the Graph RAG system:

1. **Automated Relationship Discovery**: Using NLP to automatically detect and suggest relationships between entities

2. **Temporal Graphs**: Adding explicit time-based relationships to better understand sequences and dependencies

3. **Multi-hop Reasoning**: Enabling the system to make inferences across multiple graph steps

4. **User Behavior Personalization**: Adjusting ranking based on individual user interaction patterns

## Lessons for Other Developers

If you're building your own context system:

1. **Start with Clear Use Cases**: Define the specific types of context your system needs to maintain

2. **Hybrid Approaches Win**: Combining different retrieval methods often works better than any single approach

3. **Test with Real Data Scale**: Context systems that work well with 10 items often break down with 1000

4. **Consider Performance Early**: Graph queries can become expensive; optimize before they become a bottleneck

5. **Design for Graceful Degradation**: Your system should still function even if parts of the context retrieval fail

The Graph RAG system has become the cornerstone of what makes Ell-ena special - its ability to maintain persistent context and understand complex relationships between different pieces of information. 