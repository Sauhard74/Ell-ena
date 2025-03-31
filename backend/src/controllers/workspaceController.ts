import { FastifyRequest, FastifyReply } from 'fastify';
import db from '../utils/db';
import { Workspace } from '../models/types';

// Get all workspaces for the current user
export const getAllWorkspaces = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = request.userId;
    
    const result = await db.query(
      `SELECT 
        w.id, w.name, w.description, w.created_at,
        (SELECT COUNT(*) FROM tasks t WHERE t.workspace_id = w.id) as task_count
      FROM workspaces w
      INNER JOIN workspace_members wm ON w.id = wm.workspace_id
      WHERE wm.user_id = $1
      ORDER BY w.created_at DESC`,
      [userId]
    );
    
    // Transform results to camelCase
    const workspaces = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.created_at,
      taskCount: parseInt(row.task_count)
    }));
    
    return reply.code(200).send({ workspaces });
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching workspaces'
    });
  }
};

// Get a specific workspace
export const getWorkspaceById = async (
  request: FastifyRequest<{ Params: { workspaceId: string } }>,
  reply: FastifyReply
) => {
  try {
    const { workspaceId } = request.params;
    const userId = request.userId;
    
    // First check if user has access to this workspace
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
    
    // Get workspace with member details
    const result = await db.query(
      `SELECT 
        w.id, w.name, w.description, w.created_at, w.owner_id,
        (SELECT json_agg(json_build_object(
          'userId', u.id,
          'fullName', u.full_name,
          'role', wm.role
        ))
        FROM workspace_members wm
        JOIN users u ON wm.user_id = u.id
        WHERE wm.workspace_id = w.id) as members
      FROM workspaces w
      WHERE w.id = $1`,
      [workspaceId]
    );
    
    if (result.rows.length === 0) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'Workspace not found'
      });
    }
    
    const workspace = result.rows[0];
    
    // Transform to camelCase
    return reply.code(200).send({
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      createdAt: workspace.created_at,
      ownerId: workspace.owner_id,
      members: workspace.members || []
    });
  } catch (error) {
    console.error('Error fetching workspace:', error);
    
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching the workspace'
    });
  }
};

// Create a new workspace
export const createWorkspace = async (
  request: FastifyRequest<{
    Body: {
      name: string;
      description?: string;
    };
  }>,
  reply: FastifyReply
) => {
  try {
    const { name, description } = request.body;
    const userId = request.userId;
    
    // Create workspace
    const client = await db.pool.connect();
    
    try {
      // Start transaction
      await client.query('BEGIN');
      
      // Create the workspace
      const workspaceResult = await client.query(
        `INSERT INTO workspaces (name, description, owner_id)
         VALUES ($1, $2, $3)
         RETURNING id, name, description, created_at, owner_id`,
        [name, description || null, userId]
      );
      
      const workspace = workspaceResult.rows[0];
      
      // Add the creator as a member with owner role
      await client.query(
        `INSERT INTO workspace_members (workspace_id, user_id, role)
         VALUES ($1, $2, $3)`,
        [workspace.id, userId, 'owner']
      );
      
      // Commit transaction
      await client.query('COMMIT');
      
      // Transform to camelCase
      return reply.code(201).send({
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        createdAt: workspace.created_at,
        ownerId: workspace.owner_id
      });
    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      throw error;
    } finally {
      // Release client
      client.release();
    }
  } catch (error) {
    console.error('Error creating workspace:', error);
    
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'An error occurred while creating the workspace'
    });
  }
};

// Update a workspace
export const updateWorkspace = async (
  request: FastifyRequest<{
    Params: { workspaceId: string };
    Body: {
      name?: string;
      description?: string;
    };
  }>,
  reply: FastifyReply
) => {
  try {
    const { workspaceId } = request.params;
    const { name, description } = request.body;
    const userId = request.userId;
    
    // Check if user has owner or admin access to this workspace
    const accessResult = await db.query(
      `SELECT 1 FROM workspace_members 
       WHERE workspace_id = $1 AND user_id = $2 AND role IN ('owner', 'admin')`,
      [workspaceId, userId]
    );
    
    if (accessResult.rows.length === 0) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'You do not have permission to update this workspace'
      });
    }
    
    // Build the SET clause dynamically based on what was provided
    const setClause = [];
    const values = [];
    let paramIndex = 1;
    
    if (name !== undefined) {
      setClause.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    
    if (description !== undefined) {
      setClause.push(`description = $${paramIndex++}`);
      values.push(description);
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
    
    // Add workspaceId as the last parameter
    values.push(workspaceId);
    
    const result = await db.query(
      `UPDATE workspaces 
       SET ${setClause.join(', ')} 
       WHERE id = $${paramIndex} 
       RETURNING id, name, description, updated_at`,
      values
    );
    
    if (result.rows.length === 0) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'Workspace not found'
      });
    }
    
    const updatedWorkspace = result.rows[0];
    
    // Transform to camelCase
    return reply.code(200).send({
      id: updatedWorkspace.id,
      name: updatedWorkspace.name,
      description: updatedWorkspace.description,
      updatedAt: updatedWorkspace.updated_at
    });
  } catch (error) {
    console.error('Error updating workspace:', error);
    
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'An error occurred while updating the workspace'
    });
  }
};

// Delete a workspace
export const deleteWorkspace = async (
  request: FastifyRequest<{ Params: { workspaceId: string } }>,
  reply: FastifyReply
) => {
  try {
    const { workspaceId } = request.params;
    const userId = request.userId;
    
    // Check if user is the owner of the workspace
    const ownerResult = await db.query(
      `SELECT 1 FROM workspaces 
       WHERE id = $1 AND owner_id = $2`,
      [workspaceId, userId]
    );
    
    if (ownerResult.rows.length === 0) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Only the workspace owner can delete it'
      });
    }
    
    // Delete the workspace (cascade will delete members and tasks)
    await db.query(
      `DELETE FROM workspaces WHERE id = $1`,
      [workspaceId]
    );
    
    return reply.code(204).send();
  } catch (error) {
    console.error('Error deleting workspace:', error);
    
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'An error occurred while deleting the workspace'
    });
  }
}; 