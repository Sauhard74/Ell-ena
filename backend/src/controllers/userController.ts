import { FastifyRequest, FastifyReply } from 'fastify';
import db from '../utils/db';
import { sanitizeUser, comparePassword, hashPassword } from '../utils/auth';
import { User } from '../models/types';

// Get current user profile
export const getProfile = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = request.userId;
    
    const result = await db.query(
      `SELECT 
        u.id, u.email, u.full_name, u.created_at, u.last_login, u.preferences,
        (SELECT json_agg(json_build_object(
          'id', w.id,
          'name', w.name
        ))
        FROM workspaces w
        INNER JOIN workspace_members wm ON w.id = wm.workspace_id
        WHERE wm.user_id = u.id) as workspaces
      FROM users u
      WHERE u.id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'User not found'
      });
    }
    
    const user = result.rows[0];
    
    // Transform to camelCase
    return reply.code(200).send({
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      createdAt: user.created_at,
      lastLogin: user.last_login,
      preferences: user.preferences || {},
      workspaces: user.workspaces || []
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching the user profile'
    });
  }
};

// Update user profile
export const updateProfile = async (
  request: FastifyRequest<{
    Body: {
      fullName?: string;
      email?: string;
      preferences?: Record<string, any>;
    };
  }>,
  reply: FastifyReply
) => {
  try {
    const userId = request.userId;
    const { fullName, email, preferences } = request.body;
    
    // Build the SET clause dynamically based on what was provided
    const setClause = [];
    const values = [];
    let paramIndex = 1;
    
    if (fullName !== undefined) {
      setClause.push(`full_name = $${paramIndex++}`);
      values.push(fullName);
    }
    
    if (email !== undefined) {
      setClause.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    
    if (preferences !== undefined) {
      setClause.push(`preferences = preferences || $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(preferences));
    }
    
    // Add updated_at
    setClause.push(`updated_at = NOW()`);
    
    // If nothing to update, return early
    if (setClause.length === 0) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'No fields to update were provided'
      });
    }
    
    // Push userId as the last parameter
    values.push(userId);
    
    const result = await db.query(
      `UPDATE users 
       SET ${setClause.join(', ')} 
       WHERE id = $${paramIndex} 
       RETURNING id, email, full_name, created_at, updated_at, preferences`,
      values
    );
    
    if (result.rows.length === 0) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'User not found'
      });
    }
    
    const updatedUser = result.rows[0];
    
    // Transform to camelCase
    return reply.code(200).send({
      userId: updatedUser.id,
      email: updatedUser.email,
      fullName: updatedUser.full_name,
      preferences: updatedUser.preferences || {},
      updatedAt: updatedUser.updated_at
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    
    // Handle duplicate email
    if ((error as any).code === '23505' && (error as any).constraint === 'users_email_key') {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Email address is already in use'
      });
    }
    
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'An error occurred while updating the user profile'
    });
  }
};

// Change password
export const changePassword = async (
  request: FastifyRequest<{
    Body: {
      currentPassword: string;
      newPassword: string;
    };
  }>,
  reply: FastifyReply
) => {
  try {
    const userId = request.userId;
    const { currentPassword, newPassword } = request.body;
    
    // Get current user with password
    const userResult = await db.query(
      `SELECT id, password FROM users WHERE id = $1`,
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'User not found'
      });
    }
    
    const user = userResult.rows[0];
    
    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.password);
    
    if (!isPasswordValid) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Current password is incorrect'
      });
    }
    
    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update password
    await db.query(
      `UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2`,
      [hashedPassword, userId]
    );
    
    return reply.code(200).send({
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'An error occurred while changing the password'
    });
  }
}; 