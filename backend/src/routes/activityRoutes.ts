import { FastifyInstance } from 'fastify';
import { getUserActivities, getWorkspaceActivities } from '../services/activityService';
import { authenticate } from '../middleware/authMiddleware';

export default async function (fastify: FastifyInstance) {
  // Get user activities
  fastify.get('/api/activities/user', {
    preHandler: [authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            activities: { type: 'array' },
            count: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { limit = 50, offset = 0 } = request.query as { limit?: number, offset?: number };
      const activities = await getUserActivities(request.userId, limit, offset);
      
      return {
        activities,
        count: activities.length
      };
    } catch (error) {
      console.error('Error fetching user activities:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get workspace activities
  fastify.get('/api/workspaces/:workspaceId/activities', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['workspaceId'],
        properties: {
          workspaceId: { type: 'string', format: 'uuid' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            activities: { type: 'array' },
            count: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { workspaceId } = request.params as { workspaceId: string };
      const { limit = 50, offset = 0 } = request.query as { limit?: number, offset?: number };
      
      const activities = await getWorkspaceActivities(workspaceId, limit, offset);
      
      return {
        activities,
        count: activities.length
      };
    } catch (error) {
      console.error('Error fetching workspace activities:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
} 