import { FastifyInstance } from 'fastify';
import { processMessage, parseText } from '../controllers/nlpController';
import { authenticate } from '../middleware/authMiddleware';

export default async function (fastify: FastifyInstance) {
  // Process chat message and return AI response
  fastify.post('/api/nlp/process-message', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['message'],
        properties: {
          message: { type: 'string' },
          context: { 
            type: 'object',
            properties: {
              workspaceId: { type: 'string' },
              recentTaskIds: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      }
    }
  }, processMessage as any);

  // Parse natural language text into structured task
  fastify.post('/api/nlp/parse-text', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['text', 'workspaceId'],
        properties: {
          text: { type: 'string' },
          workspaceId: { type: 'string' }
        }
      }
    }
  }, parseText as any);
} 