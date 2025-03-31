import { FastifyInstance } from 'fastify';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask
} from '../controllers/taskController';
import { authenticate } from '../middleware/authMiddleware';

export default async function (fastify: FastifyInstance) {
  // Create a new task
  fastify.post('/api/tasks', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['title', 'workspaceId'],
        properties: {
          title: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          dueDate: { type: 'string', format: 'date-time' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          status: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
          workspaceId: { type: 'string' },
          assignee: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }, createTask as any);

  // Get tasks with filters
  fastify.get('/api/tasks', {
    preHandler: [authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          workspaceId: { type: 'string' },
          status: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          assignee: { type: 'string' },
          searchTerm: { type: 'string' }
        }
      }
    }
  }, getTasks as any);

  // Get task by ID
  fastify.get('/api/tasks/:taskId', {
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
  }, getTaskById as any);

  // Update task
  fastify.put('/api/tasks/:taskId', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['taskId'],
        properties: {
          taskId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          dueDate: { type: 'string', format: 'date-time' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          status: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
          assignee: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }, updateTask as any);

  // Delete task
  fastify.delete('/api/tasks/:taskId', {
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
  }, deleteTask as any);
} 