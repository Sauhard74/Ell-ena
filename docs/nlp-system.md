# Natural Language Processing in Ell-ena

## My Journey into NLP

When I started building Ell-ena, I had a basic understanding of how Large Language Models (LLMs) worked, but I'd never built a production system that relied on them. The journey from "I want to parse tasks from text" to a reliable NLP system was filled with challenges, experiments, and many "aha" moments.

> **Personal Note:** I still remember the excitement when I got my first successful task extraction working. I texted my roommate at 2 AM: "IT WORKS! IT ACTUALLY UNDERSTANDS ME!" That moment showed me the real power of what I was building.

## The Task Extraction Challenge

The core NLP challenge in Ell-ena is seemingly simple: **convert natural language instructions into structured task objects**. But this apparent simplicity hides multiple complexities:

1. Understanding different ways people express the same intent
2. Extracting temporal expressions ("next Friday," "tomorrow at noon")
3. Identifying priorities from subtle language cues
4. Recognizing related entities and context
5. Handling ambiguity gracefully

## NLP Pipeline Architecture

After several iterations, I developed a multi-stage pipeline that reliably processes natural language:

```
User Input
    │
    ▼
┌─────────────────┐
│ Context         │
│ Collection      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Intent          │
│ Detection       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Entity          │
│ Extraction      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Structured      │
│ Output          │
└────────┬────────┘
         │
         ▼
    Task Object
```

### 1. Context Collection

Before processing any user message, the system gathers context:

```typescript
// Simplified example of context collection
const collectContext = async (userId: string, workspaceId: string) => {
  // Get user timezone
  const user = await userService.getUserById(userId);
  const timezone = user.preferences.timezone || 'UTC';
  
  // Get recent conversations (last 5 messages)
  const recentMessages = await messageService.getRecentMessages(userId, 5);
  
  // Get active tasks for reference
  const activeTasks = await taskService.getActiveTasks(userId, workspaceId);
  
  return {
    timezone,
    recentMessages,
    activeTasks: activeTasks.slice(0, 3) // Limit to 3 most recent
  };
};
```

> **Learning Experience:** I initially skipped the context collection step, assuming the LLM could extract tasks with just the current message. When I tested with friends, they would say things like "Move that deadline to Friday" and the system would fail. That's when I realized providing conversation history was crucial.

### 2. Intent Detection

The system needs to determine what the user is trying to do:

- Create a new task
- Update an existing task
- Query about tasks
- Something unrelated to tasks

I implemented this as a classification step using a simple prompt:

```typescript
const detectIntent = async (text: string, context: Context) => {
  const prompt = `
    You are a task assistant. Classify the user's intent from this message:
    "${text}"
    
    Possible intents:
    1. CREATE_TASK - User wants to create a new task or reminder
    2. UPDATE_TASK - User wants to modify an existing task
    3. QUERY_TASKS - User is asking about tasks
    4. OTHER - Message is unrelated to tasks
    
    Return only the intent label, nothing else.
  `;
  
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
  });
  
  return response.choices[0].message.content.trim();
};
```

### 3. Entity Extraction

Once the intent is determined, the system extracts relevant entities. For task creation, this includes:

- Action/title
- Due date/time
- Priority
- Related people or projects
- Location/context

This step was the trickiest to get right, and required careful prompt engineering:

```typescript
const extractTaskEntities = async (text: string, context: Context) => {
  // Format recent messages for context
  const conversationContext = context.recentMessages
    .map(m => `${m.sender}: ${m.text}`)
    .join('\n');
  
  const prompt = `
    You are a task extraction assistant. Extract structured task information from this text:
    "${text}"
    
    Recent conversation:
    ${conversationContext}
    
    User's timezone: ${context.timezone}
    Current time: ${new Date().toISOString()}
    
    Extract the following entities:
    - title: The main action or task
    - description: Any additional details (if present)
    - dueDate: ISO date string for when this is due (if specified)
    - priority: "high", "medium", or "low" based on urgency cues
    - people: Any people mentioned who are related to this task
    - projects: Any projects or categories this task belongs to
    
    Return as JSON. If any field is not present in the text, use null.
  `;
  
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    response_format: { type: "json_object" }
  });
  
  return JSON.parse(response.choices[0].message.content);
};
```

> **The 'ISO Date' Breakthrough:** I spent days frustrated with inconsistent date formats until I explicitly specified "ISO date string" in the prompt. This tiny change made date parsing reliable across all inputs. Never underestimate the power of specific instructions in prompts!

### 4. Structured Output Generation

The final stage transforms the extracted entities into a properly structured task object:

```typescript
const createStructuredTask = (
  entities: TaskEntities, 
  userId: string, 
  workspaceId: string
) => {
  // Generate a unique ID
  const taskId = generateId();
  
  // Create a structured task object
  const task = {
    id: taskId,
    type: determineTaskType(entities),
    title: entities.title,
    description: entities.description || '',
    dueDate: entities.dueDate,
    status: 'active',
    priority: entities.priority || 'medium',
    createdBy: userId,
    workspaceId: workspaceId,
    createdAt: new Date().toISOString(),
    relatedTo: entities.projects || []
  };
  
  return task;
};
```

## Prompt Engineering Lessons

Building this system taught me valuable lessons about prompt engineering:

### 1. Be Extremely Specific

The more specific your instructions, the better the results. Compare these two prompts:

**Initial prompt (too vague):**
```
Extract the due date from this text.
```

**Improved prompt (specific):**
```
Extract the due date as an ISO 8601 string (YYYY-MM-DDThh:mm:ssZ) from this text. 
Consider the user's timezone: America/New_York. 
Current time is 2025-03-30T14:30:00Z.
If no specific time is mentioned but a day is specified, use 9:00 AM.
```

### 2. Use Few-Shot Examples

After numerous tests, I found that including examples significantly improved accuracy:

```typescript
const getFewShotExamples = () => `
Example 1:
User: "Remind me to submit the report by tomorrow at 5pm"
Output: {
  "title": "Submit the report",
  "dueDate": "2025-03-31T17:00:00Z",
  "priority": "medium"
}

Example 2:
User: "I need to call Sarah about the project ASAP"
Output: {
  "title": "Call Sarah about the project",
  "dueDate": null,
  "priority": "high"
}
`;
```

### 3. Control Temperature Based on Task

I learned to vary the temperature parameter based on what I needed:

- **Low temperature (0.1-0.3)** for structured extraction where consistency is key
- **Medium temperature (0.4-0.7)** for generating natural-sounding responses
- **High temperature (0.8-1.0)** for creative suggestions and alternatives

> **A Hard Lesson:** I started with temperature=1.0 for everything because I thought "more creativity is better." This led to wildly inconsistent outputs that sometimes invented information. After switching to temperature=0.3 for structured extraction, reliability improved dramatically.

### 4. Chain-of-Thought Reasoning

For complex parsing, I found that guiding the model through steps improved results:

```
To extract task information, follow these steps:
1. Identify the core action in the request.
2. Determine if there's a deadline mentioned.
3. Check for priority indicators like "urgent," "ASAP," or "when you can."
4. Look for associated people or projects.
5. Construct a clear, concise title.
```

## Handling Edge Cases

Natural language is messy, and users rarely express themselves consistently. Here are some edge cases I encountered and how I solved them:

### Ambiguous Dates

```
User: "Meeting next Friday"
```

Is that this coming Friday or the Friday after? I solved this with explicit date disambiguation:

```typescript
const disambiguateDate = (text: string, parsedDate: string) => {
  const prompt = `
    Original text: "${text}"
    Initially parsed date: ${parsedDate}
    
    Is this date ambiguous? If so, what is the most likely interpretation?
    Consider these alternatives and pick the most likely one based on natural language usage.
    
    Return the disambiguated date as an ISO string.
  `;
  
  // Implementation details...
};
```

### Implicit Tasks

Users often imply tasks without stating them directly:

```
User: "Jane needs the presentation slides tomorrow"
```

Is this a task for the user or a note about Jane? I implemented an "implicit task detector":

```typescript
const detectImplicitTask = (text: string) => {
  const prompt = `
    Text: "${text}"
    
    This text may contain an implicit task. Determine:
    1. Is this a task that the user needs to do? (yes/no)
    2. If yes, what is the implied task?
    3. Who is responsible for this task?
    
    Return as JSON.
  `;
  
  // Implementation details...
};
```

## Continuous Learning & Improvement

I implemented a feedback loop system that helps improve the NLP over time:

1. **User Corrections**: When users edit a parsed task, the system records the original text and the corrected version.

2. **Manual Review**: I periodically review these corrections to identify patterns.

3. **Prompt Refinement**: Based on these patterns, I adjust the prompts or add new few-shot examples.

This approach has steadily improved the accuracy of the system, especially for domain-specific language and edge cases.

## Code Implementation

The NLP controller brings everything together:

```typescript
// Simplified NLP controller
export const parseText = async (req, reply) => {
  try {
    const { text, userId, workspaceId } = req.body;
    
    // 1. Collect context
    const context = await collectContext(userId, workspaceId);
    
    // 2. Detect intent
    const intent = await detectIntent(text, context);
    
    // 3. Process based on intent
    let response;
    
    switch (intent) {
      case 'CREATE_TASK':
        const entities = await extractTaskEntities(text, context);
        const task = createStructuredTask(entities, userId, workspaceId);
        const savedTask = await taskService.createTask(task);
        
        response = {
          type: 'task_created',
          task: savedTask,
          confidence: calculateConfidence(entities)
        };
        break;
        
      case 'UPDATE_TASK':
        // Handle task updates...
        break;
        
      case 'QUERY_TASKS':
        // Handle task queries...
        break;
        
      default:
        // Handle general conversation...
        break;
    }
    
    return reply.code(200).send(response);
  } catch (error) {
    console.error('Error parsing text:', error);
    return reply.code(500).send({ error: 'Failed to parse text' });
  }
};
```

## Future Improvements

I'm continuously working to improve the NLP system:

1. **Fine-tuned Models**: I'm exploring fine-tuning models on task extraction specifically

2. **Multi-Modal Input**: Expanding to understand tasks from images (e.g., photos of whiteboards)

3. **Proactive Suggestions**: Having the system suggest related tasks or optimal scheduling

4. **Fallback Chain**: Creating a multi-model fallback system to balance cost and accuracy

## Lessons for Other Developers

If you're implementing your own NLP system, here's what I've learned:

1. **Start Simple**: Begin with the most common use cases and expand gradually

2. **Test with Real Users**: What seems clear to you might be used very differently by others

3. **Iterate on Prompts**: Prompt engineering is more art than science; expect to refine them many times

4. **Provide Confidence Scores**: Always give users a way to understand how confident the system is

5. **Build Feedback Mechanisms**: Make it easy for users (and yourself) to identify and correct mistakes

In the next document, I'll explore how Ell-ena's context system works to enable long-term memory and relationship awareness. 