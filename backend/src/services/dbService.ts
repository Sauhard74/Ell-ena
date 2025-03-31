import db from '../utils/db';
import { QueryResult } from 'pg';

// User operations
export const getUserById = async (userId: string): Promise<any> => {
  const result = await db.query(
    'SELECT id, email, full_name, preferences, created_at, updated_at, last_login FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0];
};

export const getUserByEmail = async (email: string): Promise<any> => {
  const result = await db.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0];
};

export const createUser = async (
  email: string,
  fullName: string,
  hashedPassword: string
): Promise<any> => {
  const result = await db.query(
    'INSERT INTO users (email, full_name, password) VALUES ($1, $2, $3) RETURNING id, email, full_name, created_at',
    [email, fullName, hashedPassword]
  );
  return result.rows[0];
};

export const updateUserLogin = async (userId: string): Promise<void> => {
  await db.query(
    'UPDATE users SET last_login = NOW() WHERE id = $1',
    [userId]
  );
};

// Workspace operations
export const getWorkspaceById = async (workspaceId: string): Promise<any> => {
  const result = await db.query(
    'SELECT * FROM workspaces WHERE id = $1',
    [workspaceId]
  );
  return result.rows[0];
};

export const getUserWorkspaces = async (userId: string): Promise<any[]> => {
  const result = await db.query(
    `SELECT w.* FROM workspaces w
     JOIN workspace_members wm ON w.id = wm.workspace_id
     WHERE wm.user_id = $1
     UNION
     SELECT * FROM workspaces WHERE owner_id = $1`,
    [userId]
  );
  return result.rows;
};

export const createWorkspace = async (
  name: string,
  description: string | null,
  ownerId: string
): Promise<any> => {
  const result = await db.query(
    'INSERT INTO workspaces (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
    [name, description, ownerId]
  );
  return result.rows[0];
};

export const addWorkspaceMember = async (
  workspaceId: string,
  userId: string,
  role: string = 'member'
): Promise<any> => {
  const result = await db.query(
    'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3) RETURNING *',
    [workspaceId, userId, role]
  );
  return result.rows[0];
};

// Task operations
export const createTask = async (taskData: any): Promise<any> => {
  const {
    title,
    description,
    type,
    dueDate,
    priority,
    workspaceId,
    createdBy,
    assignee
  } = taskData;

  const result = await db.query(
    `INSERT INTO tasks 
     (title, description, type, due_date, priority, workspace_id, created_by, assignee) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
     RETURNING *`,
    [title, description, type, dueDate, priority, workspaceId, createdBy, assignee]
  );
  return result.rows[0];
};

export const getTasksByWorkspace = async (workspaceId: string): Promise<any[]> => {
  const result = await db.query(
    'SELECT * FROM tasks WHERE workspace_id = $1 ORDER BY created_at DESC',
    [workspaceId]
  );
  return result.rows;
};

export const getTaskById = async (taskId: string): Promise<any> => {
  const result = await db.query(
    'SELECT * FROM tasks WHERE id = $1',
    [taskId]
  );
  return result.rows[0];
};

export const updateTask = async (taskId: string, updateData: any): Promise<any> => {
  // Create SET clause and values dynamically based on provided update data
  const updateFields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  Object.entries(updateData).forEach(([key, value]) => {
    // Convert camelCase to snake_case for DB columns
    const columnName = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    updateFields.push(`${columnName} = $${paramCount}`);
    values.push(value);
    paramCount++;
  });

  // Add updated_at to always be set to NOW()
  updateFields.push('updated_at = NOW()');
  
  // Add taskId as the last parameter
  values.push(taskId);

  const query = `
    UPDATE tasks
    SET ${updateFields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;

  const result = await db.query(query, values);
  return result.rows[0];
};

// Transcript operations
export const saveTranscript = async (
  meetingTitle: string,
  content: string,
  summary: string | null,
  duration: number | null,
  workspaceId: string,
  createdBy: string
): Promise<any> => {
  const result = await db.query(
    `INSERT INTO transcripts 
     (meeting_title, content, summary, duration, workspace_id, created_by) 
     VALUES ($1, $2, $3, $4, $5, $6) 
     RETURNING *`,
    [meetingTitle, content, summary, duration, workspaceId, createdBy]
  );
  return result.rows[0];
};

export const getTranscriptsByWorkspace = async (workspaceId: string): Promise<any[]> => {
  const result = await db.query(
    'SELECT * FROM transcripts WHERE workspace_id = $1 ORDER BY created_at DESC',
    [workspaceId]
  );
  return result.rows;
};

export default {
  getUserById,
  getUserByEmail,
  createUser,
  updateUserLogin,
  getWorkspaceById,
  getUserWorkspaces,
  createWorkspace,
  addWorkspaceMember,
  createTask,
  getTasksByWorkspace,
  getTaskById,
  updateTask,
  saveTranscript,
  getTranscriptsByWorkspace
}; 