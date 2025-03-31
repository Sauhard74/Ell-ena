import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authMiddleware';
import graphService from '../services/graphService';
import dbService from '../services/dbService';
import { ActivityType } from '../services/activityService';
import activityService from '../services/activityService';

export default async function (fastify: FastifyInstance) {
  // Create a relationship between two tasks
  fastify.post('/api/tasks/relationships', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['sourceTaskId', 'targetTaskId', 'relationshipType'],
        properties: {
          sourceTaskId: { type: 'string', format: 'uuid' },
          targetTaskId: { type: 'string', format: 'uuid' },
          relationshipType: { 
            type: 'string', 
            enum: ['DEPENDS_ON', 'RELATED_TO', 'BLOCKS', 'PART_OF']
          }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { sourceTaskId, targetTaskId, relationshipType } = request.body as any;
      
      // Verify both tasks exist and user has access
      const sourceTask = await dbService.getTaskById(sourceTaskId);
      const targetTask = await dbService.getTaskById(targetTaskId);
      
      if (!sourceTask || !targetTask) {
        return reply.code(404).send({ 
          error: 'Not found', 
          message: 'One or both tasks not found' 
        });
      }
      
      await graphService.createTaskRelationship(
        sourceTaskId,
        targetTaskId,
        relationshipType
      );
      
      // Log activity
      await activityService.logActivity({
        type: ActivityType.TASK_UPDATED,
        title: `Created ${relationshipType} relationship between tasks`,
        entityId: sourceTaskId,
        entityType: 'task',
        userId: request.userId,
        workspaceId: sourceTask.workspace_id
      });
      
      return reply.code(201).send({
        success: true,
        message: `Relationship ${relationshipType} created successfully`
      });
    } catch (error) {
      console.error('Error creating task relationship:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  // Get related tasks
  fastify.get('/api/tasks/:taskId/related', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['taskId'],
        properties: {
          taskId: { type: 'string', format: 'uuid' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          relationshipType: { 
            type: 'string', 
            enum: ['DEPENDS_ON', 'RELATED_TO', 'BLOCKS', 'PART_OF']
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            tasks: { 
              type: 'array',
              items: { type: 'object' }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { taskId } = request.params as { taskId: string };
      const { relationshipType } = request.query as { relationshipType?: string };
      
      // Verify task exists and user has access
      const task = await dbService.getTaskById(taskId);
      
      if (!task) {
        return reply.code(404).send({ 
          error: 'Not found', 
          message: 'Task not found' 
        });
      }
      
      const relatedTasks = await graphService.getRelatedTasks(taskId, relationshipType);
      
      return {
        tasks: relatedTasks
      };
    } catch (error) {
      console.error('Error getting related tasks:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  // Get task graph
  fastify.get('/api/tasks/:taskId/graph', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['taskId'],
        properties: {
          taskId: { type: 'string', format: 'uuid' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          depth: { type: 'number', default: 2 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            nodes: { 
              type: 'array',
              items: { type: 'object' }
            },
            relationships: {
              type: 'array',
              items: { 
                type: 'object',
                properties: {
                  source: { type: 'string' },
                  target: { type: 'string' },
                  type: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { taskId } = request.params as { taskId: string };
      const { depth = 2 } = request.query as { depth?: number };
      
      // Verify task exists and user has access
      const task = await dbService.getTaskById(taskId);
      
      if (!task) {
        return reply.code(404).send({ 
          error: 'Not found', 
          message: 'Task not found' 
        });
      }
      
      const taskGraph = await graphService.getTaskGraph(taskId, depth);
      
      return taskGraph;
    } catch (error) {
      console.error('Error getting task graph:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
  
  // Delete relationship between tasks
  fastify.delete('/api/tasks/relationships', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['sourceTaskId', 'targetTaskId', 'relationshipType'],
        properties: {
          sourceTaskId: { type: 'string', format: 'uuid' },
          targetTaskId: { type: 'string', format: 'uuid' },
          relationshipType: { 
            type: 'string', 
            enum: ['DEPENDS_ON', 'RELATED_TO', 'BLOCKS', 'PART_OF']
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { sourceTaskId, targetTaskId, relationshipType } = request.body as any;
      
      // Verify both tasks exist and user has access
      const sourceTask = await dbService.getTaskById(sourceTaskId);
      
      if (!sourceTask) {
        return reply.code(404).send({ 
          error: 'Not found', 
          message: 'Source task not found' 
        });
      }
      
      await graphService.deleteTaskRelationship(
        sourceTaskId,
        targetTaskId,
        relationshipType
      );
      
      // Log activity
      await activityService.logActivity({
        type: ActivityType.TASK_UPDATED,
        title: `Removed ${relationshipType} relationship between tasks`,
        entityId: sourceTaskId,
        entityType: 'task',
        userId: request.userId,
        workspaceId: sourceTask.workspace_id
      });
      
      return {
        success: true,
        message: `Relationship ${relationshipType} deleted successfully`
      };
    } catch (error) {
      console.error('Error deleting task relationship:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
} 