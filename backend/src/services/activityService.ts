import db from '../utils/db';

export enum ActivityType {
  USER_CREATED = 'user_created',
  USER_LOGIN = 'user_login',
  WORKSPACE_CREATED = 'workspace_created',
  WORKSPACE_UPDATED = 'workspace_updated',
  MEMBER_ADDED = 'member_added',
  MEMBER_REMOVED = 'member_removed',
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  TASK_COMPLETED = 'task_completed',
  TASK_DELETED = 'task_deleted',
  TRANSCRIPT_CREATED = 'transcript_created'
}

interface LogActivityParams {
  type: ActivityType;
  title: string;
  entityId: string;
  entityType: string;
  userId: string;
  workspaceId?: string;
}

/**
 * Logs a user activity in the database
 */
export const logActivity = async ({
  type,
  title,
  entityId,
  entityType,
  userId,
  workspaceId
}: LogActivityParams): Promise<void> => {
  try {
    await db.query(
      `INSERT INTO activities 
        (type, title, entity_id, entity_type, user_id, workspace_id) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [type, title, entityId, entityType, userId, workspaceId]
    );
  } catch (error) {
    console.error('Error logging activity:', error);
    // We don't want to fail operations if activity logging fails
  }
};

/**
 * Gets activities for a user
 */
export const getUserActivities = async (
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<any[]> => {
  const result = await db.query(
    `SELECT * FROM activities 
     WHERE user_id = $1 
     ORDER BY timestamp DESC 
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
};

/**
 * Gets activities for a workspace
 */
export const getWorkspaceActivities = async (
  workspaceId: string,
  limit: number = 50,
  offset: number = 0
): Promise<any[]> => {
  const result = await db.query(
    `SELECT a.*, u.full_name as user_name 
     FROM activities a
     JOIN users u ON a.user_id = u.id
     WHERE a.workspace_id = $1 
     ORDER BY a.timestamp DESC 
     LIMIT $2 OFFSET $3`,
    [workspaceId, limit, offset]
  );
  return result.rows;
};

export default {
  logActivity,
  getUserActivities,
  getWorkspaceActivities,
  ActivityType
}; 