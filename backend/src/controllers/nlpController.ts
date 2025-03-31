import { FastifyRequest, FastifyReply } from 'fastify';
import OpenAI from 'openai';
import config from '../config/config';
import db from '../utils/db';
import { ProcessMessageRequest, ParseTextRequest } from '../models/types';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

// Process a chat message and respond
export const processMessage = async (
  request: FastifyRequest<{ Body: ProcessMessageRequest }>,
  reply: FastifyReply
) => {
  try {
    const { message, context } = request.body;
    const userId = request.userId;
    
    // If no OpenAI API key, return a mock response
    if (!config.openai.apiKey) {
      console.warn('No OpenAI API key provided. Using mock response.');
      return reply.code(200).send({
        response: `This is a mock response. Please set your OpenAI API key to enable real AI responses. You said: "${message}"`,
        actions: []
      });
    }
    
    // Get user info for context
    const userResult = await db.query(
      `SELECT id, full_name FROM users WHERE id = $1`,
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'User not found'
      });
    }
    
    const user = userResult.rows[0];
    
    // Get user's recent tasks for context
    const tasksResult = await db.query(
      `SELECT id, title, status, due_date
       FROM tasks
       WHERE created_by = $1 OR assignee = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [userId]
    );
    
    const recentTasks = tasksResult.rows.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      dueDate: task.due_date
    }));
    
    // Build the system prompt
    const systemPrompt = `
      You are Ell-ena, an AI Product Manager & Personal Assistant.
      
      USER INFORMATION:
      - Name: ${user.full_name}
      - ID: ${userId}
      
      USER'S RECENT TASKS:
      ${recentTasks.map((task) => 
        `- ${task.title} (${task.status}${task.dueDate ? `, due: ${task.dueDate}` : ''})`).join('\n')}
      
      Your goal is to help the user manage tasks, meetings, and provide helpful responses.
      When the user wants to create a task, extract the relevant details like title, due date, priority, etc.
      
      If you detect a request to create a task, summarize the task details in your response.
      If you detect a request for information about tasks or workspaces, provide helpful information.
      
      Always be concise, helpful, and professional. Don't be verbose or repetitive.
    `;
    
    // Build the chat messages for the API request
    const messages = [
      { role: 'system', content: systemPrompt },
      ...context.map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content })),
      { role: 'user', content: message }
    ];
    
    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 500
    });
    
    // Extract the response text
    const responseText = response.choices[0]?.message?.content || 'I\'m sorry, I couldn\'t process your request.';
    
    // Check if the message might contain a task creation intent
    const actions = [];
    if (message.toLowerCase().includes('task') || 
        message.toLowerCase().includes('remind me') || 
        message.toLowerCase().includes('to-do') || 
        message.toLowerCase().includes('todo')) {
      
      // Try to extract task information
      try {
        const taskExtractPrompt = `
          Extract task information from this text: "${message}"
          
          Return a JSON object with these fields if they can be identified:
          - title: the main task title
          - description: any additional details
          - dueDate: any due date mentioned (in ISO format)
          - priority: high, medium, or low priority
          
          If the text doesn't contain a task, return {"isTask": false}.
          Only return the JSON, no other text.
        `;
        
        const taskExtraction = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: taskExtractPrompt }],
          temperature: 0,
          response_format: { type: 'json_object' }
        });
        
        const taskInfo = JSON.parse(taskExtraction.choices[0]?.message?.content || '{}');
        
        if (taskInfo.isTask !== false && taskInfo.title) {
          actions.push({
            type: 'task_suggestion',
            data: taskInfo
          });
        }
      } catch (error) {
        console.error('Error extracting task information:', error);
      }
    }
    
    return reply.code(200).send({
      response: responseText,
      actions
    });
  } catch (error) {
    console.error('Error processing message:', error);
    
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'An error occurred while processing your message'
    });
  }
};

// Parse natural language into structured task objects
export const parseText = async (
  request: FastifyRequest<{ Body: ParseTextRequest }>,
  reply: FastifyReply
) => {
  try {
    const { text, workspaceId, timezone = 'UTC' } = request.body;
    const userId = request.userId;
    
    // Check workspace access
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
    
    // If no OpenAI API key, return a mock response
    if (!config.openai.apiKey) {
      console.warn('No OpenAI API key provided. Using mock response.');
      
      // Simple regex-based extraction for demo purposes
      const title = text.replace(/remind me to |create a task to |set a reminder to /i, '');
      
      return reply.code(200).send({
        parsed: {
          type: 'todo',
          title: title.length > 50 ? title.substring(0, 50) + '...' : title,
          description: title.length > 50 ? title : '',
          dueDate: null,
          priority: 'medium'
        },
        confidence: 0.5,
        alternatives: []
      });
    }
    
    // Call OpenAI to parse the text
    const prompt = `
      Parse the following text into a structured task object:
      "${text}"
      
      Consider the user's timezone: ${timezone}
      Current date/time: ${new Date().toISOString()}
      
      Return a JSON object with:
      - type: "todo", "reminder", "milestone", or "ticket"
      - title: a clear, concise title
      - description: additional details (if any)
      - dueDate: ISO date string (if a date/time is mentioned)
      - priority: "high", "medium", or "low"
      - relatedTo: any category or topic mentioned
      
      If multiple interpretations are possible, include alternatives in a separate field.
      Assign a confidence score between 0 and 1.
      
      Only return the JSON, no other text.
    `;
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      response_format: { type: 'json_object' }
    });
    
    const parsedText = response.choices[0]?.message?.content;
    
    if (!parsedText) {
      throw new Error('Empty response from OpenAI');
    }
    
    const parsedData = JSON.parse(parsedText);
    
    return reply.code(200).send(parsedData);
  } catch (error) {
    console.error('Error parsing text:', error);
    
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'An error occurred while parsing the text'
    });
  }
}; 