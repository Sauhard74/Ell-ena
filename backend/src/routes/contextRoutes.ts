import { FastifyInstance } from 'fastify';
import { searchContext, getTaskContext } from '../controllers/contextController';
import { authenticate } from '../middleware/authMiddleware';

export default async function (fastify: FastifyInstance) {
  // Get context relevant to a search query
  fastify.get('/api/context/search', {
    preHandler: [authenticate],
    schema: {
      querystring: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string' },
          workspaceId: { type: 'string' }
        }
      }
    }
  }, searchContext as any);

  // Get context relevant to a specific task
  fastify.get('/api/context/task/:taskId', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['taskId'],
        properties: {
          taskId: { type: 'string' }
        }
      }
    }
  }, getTaskContext as any);
}