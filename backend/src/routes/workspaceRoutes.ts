import { FastifyInstance } from 'fastify';
import { 
  createWorkspace, 
  getAllWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace
} from '../controllers/workspaceController';
import { authenticate } from '../middleware/authMiddleware';

export default async function (fastify: FastifyInstance) {
  // Create a new workspace
  fastify.post('/api/workspaces', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          iconColor: { type: 'string' }
        }
      }
    }
  }, createWorkspace as any);

  // Get all workspaces for user
  fastify.get('/api/workspaces', {
    preHandler: [authenticate]
  }, getAllWorkspaces);

  // Get workspace by ID
  fastify.get('/api/workspaces/:workspaceId', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['workspaceId'],
        properties: {
          workspaceId: { type: 'string' }
        }
      }
    }
  }, getWorkspaceById as any);

  // Update workspace
  fastify.put('/api/workspaces/:workspaceId', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['workspaceId'],
        properties: {
          workspaceId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          iconColor: { type: 'string' }
        }
      }
    }
  }, updateWorkspace as any);

  // Delete workspace
  fastify.delete('/api/workspaces/:workspaceId', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['workspaceId'],
        properties: {
          workspaceId: { type: 'string' }
        }
      }
    }
  }, deleteWorkspace as any);

  // Add member to workspace endpoint - commented out until implemented
  /*
  fastify.post('/api/workspaces/:workspaceId/members', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['workspaceId'],
        properties: {
          workspaceId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['email', 'role'],
        properties: {
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['admin', 'member', 'viewer'] }
        }
      }
    }
  }, addMember);
  */

  // Remove member from workspace endpoint - commented out until implemented
  /*
  fastify.delete('/api/workspaces/:workspaceId/members/:userId', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['workspaceId', 'userId'],
        properties: {
          workspaceId: { type: 'string' },
          userId: { type: 'string' }
        }
      }
    }
  }, removeMember);
  */
} 