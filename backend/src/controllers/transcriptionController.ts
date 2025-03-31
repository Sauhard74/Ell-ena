import { FastifyRequest, FastifyReply } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import OpenAI from 'openai';
import config from '../config/config';
import db from '../utils/db';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

// Handle audio transcription
export const transcribeAudio = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = request.userId;
    
    // Parse multipart form data
    const data: any = await request.file();
    
    if (!data) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'No file was uploaded'
      });
    }
    
    // Extract file and form fields
    const file: MultipartFile = data;
    const workspaceId = (data.fields.workspaceId as any)?.value;
    const meetingTitle = (data.fields.meetingTitle as any)?.value;
    
    // Validate required fields
    if (!workspaceId) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'workspaceId is required'
      });
    }
    
    // Check if user has access to the workspace
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
    
    // Create temporary directory if it doesn't exist
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Save file to temporary location
    const filePath = path.join(tempDir, `${Date.now()}-${file.filename}`);
    await writeFile(filePath, await file.toBuffer());
    
    let transcript = '';
    let summary = '';
    let tasks = [];
    
    try {
      // If no OpenAI API key, use mock response
      if (!config.openai.apiKey) {
        console.warn('No OpenAI API key provided. Using mock response.');
        
        transcript = 'This is a mock transcript. Set your OpenAI API key to enable real transcription.';
        summary = 'This is a mock summary of the meeting.';
        tasks = [
          {
            type: 'task',
            title: 'Example task from meeting',
            assignee: 'User'
          }
        ];
      } else {
        // Use OpenAI to transcribe the audio
        const transcription = await openai.audio.transcriptions.create({
          file: fs.createReadStream(filePath),
          model: 'whisper-1',
          language: 'en',
          response_format: 'text'
        });
        
        transcript = transcription as string;
        
        // Use OpenAI to generate a summary and extract tasks
        const prompt = `
          The following is a transcript of a meeting:
          
          """
          ${transcript}
          """
          
          Please provide:
          1. A brief summary of the meeting (2-3 sentences)
          2. A list of tasks or action items mentioned in the meeting, with assignees if mentioned
          
          Format your response as JSON:
          {
            "summary": "Meeting summary here",
            "tasks": [
              { "type": "task", "title": "Task description", "assignee": "Person name or 'unassigned'" }
            ]
          }
          
          Only return the JSON, no other text.
        `;
        
        const summaryResponse = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0,
          response_format: { type: 'json_object' }
        });
        
        const summaryData = JSON.parse(summaryResponse.choices[0]?.message?.content || '{}');
        
        summary = summaryData.summary || '';
        tasks = summaryData.tasks || [];
      }
      
      // Store transcript in database
      const result = await db.query(
        `INSERT INTO transcripts (
          meeting_title, content, summary, workspace_id, created_by
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, meeting_title, content, summary, created_at`,
        [
          meetingTitle || 'Untitled Meeting',
          transcript,
          summary,
          workspaceId,
          userId
        ]
      );
      
      const transcriptRecord = result.rows[0];
      
      // Create tasks from the extracted action items
      const createdTasks = [];
      
      for (const task of tasks) {
        try {
          const taskResult = await db.query(
            `INSERT INTO tasks (
              type, title, description, workspace_id, created_by
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, title, type`,
            [
              task.type || 'todo',
              task.title,
              `From meeting: ${meetingTitle || 'Untitled Meeting'}`,
              workspaceId,
              userId
            ]
          );
          
          createdTasks.push(taskResult.rows[0]);
        } catch (error) {
          console.error('Error creating task from transcript:', error);
        }
      }
      
      // Record this activity
      await db.query(
        `INSERT INTO activities (
          type, title, entity_id, entity_type, user_id, workspace_id
        )
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'transcript_created',
          `Transcribed "${meetingTitle || 'Untitled Meeting'}" meeting`,
          transcriptRecord.id,
          'transcript',
          userId,
          workspaceId
        ]
      );
      
      // Transform to camelCase
      return reply.code(200).send({
        transcriptId: transcriptRecord.id,
        meetingTitle: transcriptRecord.meeting_title,
        transcript: transcriptRecord.content,
        summary: transcriptRecord.summary,
        createdAt: transcriptRecord.created_at,
        tasks: createdTasks.map(task => ({
          id: task.id,
          type: task.type,
          title: task.title
        }))
      });
    } finally {
      // Clean up temporary file
      try {
        await unlink(filePath);
      } catch (error) {
        console.error('Error deleting temporary file:', error);
      }
    }
  } catch (error) {
    console.error('Error transcribing audio:', error);
    
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'An error occurred while transcribing the audio'
    });
  }
}; 