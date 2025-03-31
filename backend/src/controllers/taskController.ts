import { FastifyRequest, FastifyReply } from 'fastify';
import db from '../utils/db';
import { Task } from '../models/types';

// Get all tasks for the current user, optionally filtered by workspace
export const getTasks = async (
  request: FastifyRequest<{
    Querystring: {
      workspaceId?: string;
      status?: string;
      type?: string;
      page?: number;
      limit?: number;
    };
  }>,
  reply: FastifyReply
) => {
  try {
    const userId = request.userId;
    const { workspaceId, status, type } = request.query;
    
    // Pagination parameters
    const page = request.query.page || 1;
    const limit = Math.min(request.query.limit || 20, 50); // Max 50 per page
    const offset = (page - 1) * limit;
    
    // Build the WHERE clause
    const whereConditions = [`(t.created_by = $1 OR t.assignee = $1)`];
    const queryParams = [userId];
    let paramIndex = 2;
    
    if (workspaceId) {
      whereConditions.push(`t.workspace_id = $${paramIndex++}`);
      queryParams.push(workspaceId);
      
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
    }
    
    if (status) {
      whereConditions.push(`t.status = $${paramIndex++}`);
      queryParams.push(status);
    }
    
    if (type) {
      whereConditions.push(`t.type = $${paramIndex++}`);
      queryParams.push(type);
    }
    
    // Construct the WHERE clause
    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';
    
    // Get total count for pagination
    const countResult = await db.query(
      `SELECT COUNT(*) FROM tasks t ${whereClause}`,
      queryParams
    );
    
    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);
    
    // Get tasks with pagination
    const result = await db.query(
      `SELECT 
        t.id, t.type, t.title, t.description, t.due_date, t.status, 
        t.priority, t.workspace_id, t.created_by, t.assignee, 
        t.completed_at, t.created_at, t.updated_at,
        w.name as workspace_name,
        u1.full_name as creator_name,
        u2.full_name as assignee_name
      FROM tasks t
      LEFT JOIN workspaces w ON t.workspace_id = w.id
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assignee = u2.id
      ${whereClause}
      ORDER BY 
        CASE WHEN t.status = 'active' THEN 0
             WHEN t.status = 'completed' THEN 1
             ELSE 2
        END,
        CASE WHEN t.priority = 'high' THEN 0
             WHEN t.priority = 'medium' THEN 1
             WHEN t.priority = 'low' THEN 2
             ELSE 3
        END,
        t.due_date ASC NULLS LAST,
        t.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...queryParams, limit, offset]
    );
    
    // Transform results to camelCase
    const tasks = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      description: row.description,
      dueDate: row.due_date,
      status: row.status,
      priority: row.priority,
      workspaceId: row.workspace_id,
      workspaceName: row.workspace_name,
      createdBy: row.created_by,
      creatorName: row.creator_name,
      assignee: row.assignee,
      assigneeName: row.assignee_name,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    return reply.code(200).send({
      tasks,
      pagination: {
        total,
        page,
        limit,
        pages: totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching tasks'
    });
  }
};

// Get a specific task
export const getTaskById = async (
  request: FastifyRequest<{ Params: { taskId: string } }>,
  reply: FastifyReply
) => {
  try {
    const { taskId } = request.params;
    const userId = request.userId;
    
    // Get task with related information
    const result = await db.query(
      `SELECT 
        t.id, t.type, t.title, t.description, t.due_date, t.status, 
        t.priority, t.workspace_id, t.created_by, t.assignee, 
        t.completed_at, t.created_at, t.updated_at,
        w.name as workspace_name,
        u1.full_name as creator_name,
        u2.full_name as assignee_name,
        (
          SELECT json_agg(json_build_object(
            'id', rt.id,
            'title', rt.title,
            'relationship', tr.relationship_type
          ))
          FROM task_relationships tr
          JOIN tasks rt ON tr.target_task_id = rt.id
          WHERE tr.source_task_id = t.id
        ) as related_tasks
      FROM tasks t
      LEFT JOIN workspaces w ON t.workspace_id = w.id
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assignee = u2.id
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
    
    if (result.rows.length === 0) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'Task not found or you do not have access to it'
      });
    }
    
    const task = result.rows[0];
    
    // Transform to camelCase
    return reply.code(200).send({
      id: task.id,
      type: task.type,
      title: task.title,
      description: task.description,
      dueDate: task.due_date,
      status: task.status,
      priority: task.priority,
      workspaceId: task.workspace_id,
      workspaceName: task.workspace_name,
      createdBy: task.created_by,
      creatorName: task.creator_name,
      assignee: task.assignee,
      assigneeName: task.assignee_name,
      completedAt: task.completed_at,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      relatedTasks: task.related_tasks || []
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching the task'
    });
  }
};

// Create a new task
export const createTask = async (
  request: FastifyRequest<{
    Body: {
      type?: string;
      title: string;
      description?: string;
      dueDate?: string;
      priority?: string;
      workspaceId: string;
      assignee?: string;
    };
  }>,
  reply: FastifyReply
) => {
  try {
    const {
      type = 'todo',
      title,
      description,
      dueDate,
      priority = 'medium',
      workspaceId,
      assignee
    } = request.body;
    
    const userId = request.userId;
    
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
    
    // If assignee is provided, check if they are a member of the workspace
    if (assignee && assignee !== userId) {
      const assigneeResult = await db.query(
        `SELECT 1 FROM workspace_members 
         WHERE workspace_id = $1 AND user_id = $2`,
        [workspaceId, assignee]
      );
      
      if (assigneeResult.rows.length === 0) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Assignee is not a member of the workspace'
        });
      }
    }
    
    // Insert task
    const result = await db.query(
      `INSERT INTO tasks (
        type, title, description, due_date, priority, 
        workspace_id, created_by, assignee
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id, type, title, description, due_date, status, 
        priority, workspace_id, created_by, assignee, created_at`,
      [
        type,
        title,
        description || null,
        dueDate ? new Date(dueDate) : null,
        priority,
        workspaceId,
        userId,
        assignee || null
      ]
    );
    
    const newTask = result.rows[0];
    
    // Record this activity
    await db.query(
      `INSERT INTO activities (
        type, title, entity_id, entity_type, user_id, workspace_id
      )
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'task_created',
        `Created "${title}" task`,
        newTask.id,
        'task',
        userId,
        workspaceId
      ]
    );
    
    // Transform to camelCase
    return reply.code(201).send({
      id: newTask.id,
      type: newTask.type,
      title: newTask.title,
      description: newTask.description,
      dueDate: newTask.due_date,
      status: newTask.status,
      priority: newTask.priority,
      workspaceId: newTask.workspace_id,
      createdBy: newTask.created_by,
      assignee: newTask.assignee,
      createdAt: newTask.created_at
    });
  } catch (error) {
    console.error('Error creating task:', error);
    
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'An error occurred while creating the task'
    });
  }
};

// Update a task
export const updateTask = async (
  request: FastifyRequest<{
    Params: { taskId: string };
    Body: {
      title?: string;
      description?: string;
      dueDate?: string;
      status?: string;
      priority?: string;
      assignee?: string;
      completedAt?: string;
    };
  }>,
  reply: FastifyReply
) => {
  try {
    const { taskId } = request.params;
    const userId = request.userId;
    
    // Check if user has access to this task
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
           AND wm.role IN ('owner', 'admin')
         )
       )`,
      [taskId, userId]
    );
    
    if (taskResult.rows.length === 0) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'You do not have permission to update this task'
      });
    }
    
    const task = taskResult.rows[0];
    
    // If status is changing to completed and completedAt is not provided, set it
    let { status, completedAt } = request.body;
    if (status === 'completed' && task.status !== 'completed' && !completedAt) {
      completedAt = new Date().toISOString();
    }
    
    // Build the SET clause dynamically based on what was provided
    const setClause = [];
    const values = [];
    let paramIndex = 1;
    const updates: Record<string, any> = {};
    
    const updateableFields = [
      { field: 'title', paramName: 'title' },
      { field: 'description', paramName: 'description' },
      { field: 'due_date', paramName: 'dueDate', transform: (val: string) => new Date(val) },
      { field: 'status', paramName: 'status' },
      { field: 'priority', paramName: 'priority' },
      { field: 'assignee', paramName: 'assignee' },
      { field: 'completed_at', paramName: 'completedAt', transform: (val: string) => new Date(val) }
    ];
    
    for (const { field, paramName, transform } of updateableFields) {
      const value = request.body[paramName as keyof typeof request.body];
      
      if (value !== undefined) {
        setClause.push(`${field} = $${paramIndex++}`);
        values.push(transform ? transform(value as string) : value);
        updates[field] = value;
      }
    }
    
    // Add updated_at
    setClause.push(`updated_at = NOW()`);
    
    // If nothing to update, return early
    if (values.length === 0) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'No fields to update were provided'
      });
    }
    
    // Add taskId as the last parameter
    values.push(taskId);
    
    const result = await db.query(
      `UPDATE tasks 
       SET ${setClause.join(', ')} 
       WHERE id = $${paramIndex} 
       RETURNING 
        id, type, title, description, due_date, status, 
        priority, workspace_id, created_by, assignee, 
        completed_at, created_at, updated_at`,
      values
    );
    
    if (result.rows.length === 0) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'Task not found'
      });
    }
    
    const updatedTask = result.rows[0];
    
    // Record this activity
    if (status === 'completed' && task.status !== 'completed') {
      await db.query(
        `INSERT INTO activities (
          type, title, entity_id, entity_type, user_id, workspace_id
        )
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'task_completed',
          `Completed "${task.title}" task`,
          taskId,
          'task',
          userId,
          task.workspace_id
        ]
      );
    } else if (Object.keys(updates).length > 0) {
      await db.query(
        `INSERT INTO activities (
          type, title, entity_id, entity_type, user_id, workspace_id
        )
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'task_updated',
          `Updated "${task.title}" task`,
          taskId,
          'task',
          userId,
          task.workspace_id
        ]
      );
    }
    
    // Transform to camelCase
    return reply.code(200).send({
      id: updatedTask.id,
      type: updatedTask.type,
      title: updatedTask.title,
      description: updatedTask.description,
      dueDate: updatedTask.due_date,
      status: updatedTask.status,
      priority: updatedTask.priority,
      workspaceId: updatedTask.workspace_id,
      createdBy: updatedTask.created_by,
      assignee: updatedTask.assignee,
      completedAt: updatedTask.completed_at,
      createdAt: updatedTask.created_at,
      updatedAt: updatedTask.updated_at,
      workspace: {
        id: task.workspace_id,
        name: task.workspace_name
      }
    });
  } catch (error) {
    console.error('Error updating task:', error);
    
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'An error occurred while updating the task'
    });
  }
};

// Delete a task
export const deleteTask = async (
  request: FastifyRequest<{ Params: { taskId: string } }>,
  reply: FastifyReply
) => {
  try {
    const { taskId } = request.params;
    const userId = request.userId;
    
    // Check if user can delete this task (must be creator or workspace admin/owner)
    const taskResult = await db.query(
      `SELECT t.* FROM tasks t
       WHERE t.id = $1
       AND (
         t.created_by = $2
         OR EXISTS (
           SELECT 1 FROM workspace_members wm 
           WHERE wm.workspace_id = t.workspace_id 
           AND wm.user_id = $2
           AND wm.role IN ('owner', 'admin')
         )
       )`,
      [taskId, userId]
    );
    
    if (taskResult.rows.length === 0) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'You do not have permission to delete this task'
      });
    }
    
    const task = taskResult.rows[0];
    
    // Delete the task
    await db.query(
      `DELETE FROM tasks WHERE id = $1`,
      [taskId]
    );
    
    // Record activity of task deletion
    await db.query(
      `INSERT INTO activities (
        type, title, entity_id, entity_type, user_id, workspace_id
      )
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'task_deleted',
        `Deleted "${task.title}" task`,
        taskId,
        'task',
        userId,
        task.workspace_id
      ]
    );
    
    return reply.code(204).send();
  } catch (error) {
    console.error('Error deleting task:', error);
    
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'An error occurred while deleting the task'
    });
  }
};

// Get task summary for dashboard
export const getTaskSummary = async (
  request: FastifyRequest<{
    Querystring: {
      workspaceId?: string;
    };
  }>,
  reply: FastifyReply
) => {
  try {
    const userId = request.userId;
    const { workspaceId } = request.query;
    
    let whereClause = '(t.created_by = $1 OR t.assignee = $1)';
    const queryParams = [userId];
    
    if (workspaceId) {
      whereClause += ' AND t.workspace_id = $2';
      queryParams.push(workspaceId);
      
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
    }
    
    // Get task counts
    const result = await db.query(
      `SELECT
        COUNT(*) FILTER (WHERE true) as total,
        COUNT(*) FILTER (WHERE t.status = 'active') as active,
        COUNT(*) FILTER (WHERE t.status = 'completed') as completed,
        COUNT(*) FILTER (WHERE t.status = 'archived') as archived,
        COUNT(*) FILTER (WHERE t.priority = 'high' AND t.status = 'active') as high_priority,
        COUNT(*) FILTER (WHERE t.due_date < NOW() AND t.status = 'active') as overdue,
        COUNT(*) FILTER (WHERE t.due_date BETWEEN NOW() AND NOW() + INTERVAL '7 day' AND t.status = 'active') as due_soon
      FROM tasks t
      WHERE ${whereClause}`,
      queryParams
    );
    
    const summary = result.rows[0];
    
    // Transform to camelCase
    return reply.code(200).send({
      total: parseInt(summary.total),
      active: parseInt(summary.active),
      completed: parseInt(summary.completed),
      archived: parseInt(summary.archived),
      highPriority: parseInt(summary.high_priority),
      overdue: parseInt(summary.overdue),
      dueSoon: parseInt(summary.due_soon)
    });
  } catch (error) {
    console.error('Error fetching task summary:', error);
    
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching the task summary'
    });
  }
};

// Get recent activity
export const getRecentActivity = async (
  request: FastifyRequest<{
    Querystring: {
      workspaceId?: string;
      limit?: number;
    };
  }>,
  reply: FastifyReply
) => {
  try {
    const userId = request.userId;
    const { workspaceId } = request.query;
    const limit = Math.min(request.query.limit || 10, 50); // Max 50 items
    
    let whereClause = 'a.user_id = $1';
    const queryParams = [userId];
    let paramIndex = 2;
    
    if (workspaceId) {
      whereClause += ` AND a.workspace_id = $${paramIndex++}`;
      queryParams.push(workspaceId);
      
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
    }
    
    // Get recent activities
    const result = await db.query(
      `SELECT 
        a.id, a.type, a.title, a.entity_id, a.entity_type, 
        a.timestamp, a.workspace_id, w.name as workspace_name
      FROM activities a
      LEFT JOIN workspaces w ON a.workspace_id = w.id
      WHERE ${whereClause}
      ORDER BY a.timestamp DESC
      LIMIT $${paramIndex}`,
      [...queryParams, limit]
    );
    
    // Transform to camelCase
    const activities = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      entityId: row.entity_id,
      entityType: row.entity_type,
      timestamp: row.timestamp,
      workspace: row.workspace_id
        ? {
            id: row.workspace_id,
            name: row.workspace_name
          }
        : null
    }));
    
    return reply.code(200).send({ activities });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching recent activity'
    });
  }
}; 