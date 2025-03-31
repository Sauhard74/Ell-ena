import { FastifyRequest, FastifyReply } from 'fastify';
import OpenAI from 'openai';
import config from '../config/config';
import db from '../utils/db';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

// Search for contextual information
export const searchContext = async (
  request: FastifyRequest<{
    Querystring: {
      query: string;
      workspaceId?: string;
    };
  }>,
  reply: FastifyReply
) => {
  try {
    const { query, workspaceId } = request.query;
    const userId = request.userId;
    
    if (!query) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Query parameter is required'
      });
    }
    
    // Build query constraints
    const whereConditions = [];
    const taskConditions = [`(t.created_by = $1 OR t.assignee = $1)`];
    const transcriptConditions = [`tr.created_by = $1`];
    const queryParams = [userId];
    let paramIndex = 2;
    
    if (workspaceId) {
      // Check if user has access to this workspace
      const accessResult = await db.query(
        `SELECT 1 FROM workspace_members 
         WHERE workspace_id = $1 AND user_id = $2`,
        [workspaceId, userId]
      );
      
      if (accessResult.rows.length === 0) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'You do not have access to this workspace'
        });
      }
      
      taskConditions.push(`t.workspace_id = $${paramIndex}`);
      transcriptConditions.push(`tr.workspace_id = $${paramIndex}`);
      queryParams.push(workspaceId);
      paramIndex++;
    }
    
    // If no OpenAI API key, perform simple text search
    if (!config.openai.apiKey) {
      console.warn('No OpenAI API key provided. Using simple text search.');
      
      // Add text search condition for tasks
      const taskWhereClause = taskConditions.join(' AND ');
      const taskTextCondition = `(
        t.title ILIKE $${paramIndex} OR 
        t.description ILIKE $${paramIndex}
      )`;
      
      // Add text search condition for transcripts
      const transcriptWhereClause = transcriptConditions.join(' AND ');
      const transcriptTextCondition = `(
        tr.content ILIKE $${paramIndex} OR 
        tr.summary ILIKE $${paramIndex}
      )`;
      
      const searchTerm = `%${query}%`;
      queryParams.push(searchTerm);
      
      // Search tasks
      const taskResults = await db.query(
        `SELECT 
          t.id, 'task' as type, t.title, t.description as snippet, 
          1.0 as relevance
        FROM tasks t
        WHERE ${taskWhereClause} AND ${taskTextCondition}
        LIMIT 5`,
        queryParams
      );
      
      // Search transcripts
      const transcriptResults = await db.query(
        `SELECT 
          tr.id, 'transcript' as type, tr.meeting_title as title, 
          CASE
            WHEN tr.content ILIKE $${paramIndex}
            THEN substring(tr.content from position($${paramIndex+1} in lower(tr.content)) - 50 for 200)
            ELSE tr.summary
          END as snippet,
          1.0 as relevance
        FROM transcripts tr
        WHERE ${transcriptWhereClause} AND ${transcriptTextCondition}
        LIMIT 5`,
        [...queryParams, searchTerm.replace(/%/g, '')]
      );
      
      // Combine results
      const results = [
        ...taskResults.rows,
        ...transcriptResults.rows
      ].map(row => ({
        type: row.type,
        id: row.id,
        title: row.title,
        snippet: row.snippet,
        relevance: row.relevance
      }));
      
      return reply.code(200).send({ results });
    }
    
    // Get embedding for search query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query
    });
    
    const queryEmbedding = embeddingResponse.data[0].embedding;
    
    // Ideally we would use vector search here, but as a simpler alternative
    // we'll use similarity scoring in application code
    
    // Get tasks for matching
    const taskWhereClause = taskConditions.join(' AND ');
    const taskResults = await db.query(
      `SELECT 
        t.id, t.title, t.description, t.status, t.priority, t.due_date
      FROM tasks t
      WHERE ${taskWhereClause}
      ORDER BY t.created_at DESC
      LIMIT 20`,
      queryParams
    );
    
    // Get transcripts for matching
    const transcriptWhereClause = transcriptConditions.join(' AND ');
    const transcriptResults = await db.query(
      `SELECT 
        tr.id, tr.meeting_title, tr.content, tr.summary
      FROM transcripts tr
      WHERE ${transcriptWhereClause}
      ORDER BY tr.created_at DESC
      LIMIT 10`,
      queryParams
    );
    
    // For each item, get embedding and calculate similarity
    const results = [];
    
    // Process tasks
    for (const task of taskResults.rows) {
      const taskText = `${task.title} ${task.description || ''}`;
      
      try {
        const taskEmbedding = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: taskText
        });
        
        const similarity = cosineSimilarity(
          queryEmbedding,
          taskEmbedding.data[0].embedding
        );
        
        if (similarity > 0.5) { // Threshold for relevance
          results.push({
            type: 'task',
            id: task.id,
            title: task.title,
            snippet: task.description || '',
            relevance: similarity
          });
        }
      } catch (error) {
        console.error('Error getting embedding for task:', error);
      }
    }
    
    // Process transcripts
    for (const transcript of transcriptResults.rows) {
      // For transcripts, we'll use the summary to get embedding
      const transcriptText = transcript.summary || transcript.meeting_title;
      
      try {
        const transcriptEmbedding = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: transcriptText
        });
        
        const similarity = cosineSimilarity(
          queryEmbedding,
          transcriptEmbedding.data[0].embedding
        );
        
        if (similarity > 0.5) { // Threshold for relevance
          // Find a relevant snippet from the content
          let snippet = transcript.summary;
          
          if (transcript.content) {
            // Use OpenAI to find the most relevant part of the transcript
            const snippetPrompt = `
              Given this query: "${query}"
              
              Find the most relevant section (maximum 200 characters) from this transcript:
              """
              ${transcript.content.substring(0, 10000)} // Limit to first 10K chars
              """
              
              Return ONLY the relevant section, no additional text.
            `;
            
            try {
              const snippetResponse = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: snippetPrompt }],
                temperature: 0,
                max_tokens: 100
              });
              
              snippet = snippetResponse.choices[0]?.message?.content || snippet;
            } catch (error) {
              console.error('Error getting transcript snippet:', error);
            }
          }
          
          results.push({
            type: 'transcript',
            id: transcript.id,
            title: transcript.meeting_title,
            snippet: snippet,
            relevance: similarity
          });
        }
      } catch (error) {
        console.error('Error getting embedding for transcript:', error);
      }
    }
    
    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);
    
    // Limit to top 10 results
    return reply.code(200).send({
      results: results.slice(0, 10)
    });
  } catch (error) {
    console.error('Error searching context:', error);
    
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'An error occurred while searching context'
    });
  }
};

// Get relevant context for a specific task
export const getTaskContext = async (
  request: FastifyRequest<{ Params: { taskId: string } }>,
  reply: FastifyReply
) => {
  try {
    const { taskId } = request.params;
    const userId = request.userId;
    
    // Get task details
    const taskResult = await db.query(
      `SELECT t.*, w.name as workspace_name
       FROM tasks t
       JOIN workspaces w ON t.workspace_id = w.id
       WHERE t.id = $1
       AND (
         t.created_by = $2 
         OR t.assignee = $2
         OR EXISTS (
           SELECT 1 FROM workspace_members wm 
           WHERE wm.workspace_id = t.workspace_id 
           AND wm.user_id = $2
         )
       )`,
      [taskId, userId]
    );
    
    if (taskResult.rows.length === 0) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'Task not found or you do not have access to it'
      });
    }
    
    const task = taskResult.rows[0];
    
    // If no OpenAI API key, return simple related items
    if (!config.openai.apiKey) {
      console.warn('No OpenAI API key provided. Using simple related items.');
      
      // Get related tasks (same workspace, similar title)
      const relatedTasksResult = await db.query(
        `SELECT 
          t.id, 'task' as type, t.title, t.description as snippet, 
          1.0 as relevance
        FROM tasks t
        WHERE t.id != $1
        AND t.workspace_id = $2
        AND (
          t.title ILIKE $3
          OR t.description ILIKE $3
        )
        AND (t.created_by = $4 OR t.assignee = $4)
        LIMIT 5`,
        [taskId, task.workspace_id, `%${task.title.split(' ')[0]}%`, userId]
      );
      
      // Get transcripts that might mention this task
      const transcriptsResult = await db.query(
        `SELECT 
          tr.id, 'transcript' as type, tr.meeting_title as title, 
          tr.summary as snippet, 1.0 as relevance
        FROM transcripts tr
        WHERE tr.workspace_id = $1
        AND (
          tr.content ILIKE $2
          OR tr.summary ILIKE $2
        )
        AND tr.created_by = $3
        LIMIT 3`,
        [task.workspace_id, `%${task.title.split(' ')[0]}%`, userId]
      );
      
      // Combine results
      const results = [
        ...relatedTasksResult.rows,
        ...transcriptsResult.rows
      ].map(row => ({
        type: row.type,
        id: row.id,
        title: row.title,
        snippet: row.snippet,
        relevance: row.relevance
      }));
      
      return reply.code(200).send({ results });
    }
    
    // Get embedding for task
    const taskText = `${task.title} ${task.description || ''}`;
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: taskText
    });
    
    const taskEmbedding = embeddingResponse.data[0].embedding;
    
    // Get other tasks from the same workspace
    const otherTasksResult = await db.query(
      `SELECT 
        t.id, t.title, t.description
      FROM tasks t
      WHERE t.id != $1
      AND t.workspace_id = $2
      AND (t.created_by = $3 OR t.assignee = $3)
      ORDER BY t.created_at DESC
      LIMIT 20`,
      [taskId, task.workspace_id, userId]
    );
    
    // Get transcripts from the same workspace
    const transcriptsResult = await db.query(
      `SELECT 
        tr.id, tr.meeting_title, tr.content, tr.summary
      FROM transcripts tr
      WHERE tr.workspace_id = $1
      AND tr.created_by = $2
      ORDER BY tr.created_at DESC
      LIMIT 10`,
      [task.workspace_id, userId]
    );
    
    // For each item, get embedding and calculate similarity
    const results = [];
    
    // Process other tasks
    for (const otherTask of otherTasksResult.rows) {
      const otherTaskText = `${otherTask.title} ${otherTask.description || ''}`;
      
      try {
        const otherTaskEmbedding = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: otherTaskText
        });
        
        const similarity = cosineSimilarity(
          taskEmbedding,
          otherTaskEmbedding.data[0].embedding
        );
        
        if (similarity > 0.6) { // Higher threshold for task-to-task relevance
          results.push({
            type: 'task',
            id: otherTask.id,
            title: otherTask.title,
            snippet: otherTask.description || '',
            relevance: similarity
          });
        }
      } catch (error) {
        console.error('Error getting embedding for related task:', error);
      }
    }
    
    // Process transcripts
    for (const transcript of transcriptsResult.rows) {
      const transcriptText = transcript.summary || transcript.meeting_title;
      
      try {
        const transcriptEmbedding = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: transcriptText
        });
        
        const similarity = cosineSimilarity(
          taskEmbedding,
          transcriptEmbedding.data[0].embedding
        );
        
        if (similarity > 0.5) {
          // If task title appears in transcript, try to find that specific snippet
          let snippet = transcript.summary;
          
          if (transcript.content && 
              transcript.content.toLowerCase().includes(task.title.toLowerCase())) {
            
            const titlePos = transcript.content.toLowerCase().indexOf(task.title.toLowerCase());
            const start = Math.max(0, titlePos - 100);
            const end = Math.min(transcript.content.length, titlePos + task.title.length + 100);
            
            snippet = transcript.content.substring(start, end);
          }
          
          results.push({
            type: 'transcript',
            id: transcript.id,
            title: transcript.meeting_title,
            snippet: snippet,
            relevance: similarity
          });
        }
      } catch (error) {
        console.error('Error getting embedding for transcript:', error);
      }
    }
    
    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);
    
    // Limit to top 10 results
    return reply.code(200).send({
      results: results.slice(0, 8)
    });
  } catch (error) {
    console.error('Error getting task context:', error);
    
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'An error occurred while getting task context'
    });
  }
};

// Helper function to calculate cosine similarity between two vectors
function cosineSimilarity(vector1: number[], vector2: number[]): number {
  const dotProduct = vector1.reduce((sum, value, i) => sum + value * vector2[i], 0);
  
  const magnitude1 = Math.sqrt(vector1.reduce((sum, value) => sum + value * value, 0));
  const magnitude2 = Math.sqrt(vector2.reduce((sum, value) => sum + value * value, 0));
  
  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }
  
  return dotProduct / (magnitude1 * magnitude2);
} 