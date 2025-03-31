import { Pool } from 'pg';
import config from '../config/config';

// Flag to track if we're using mock mode due to DB connection failure
let useMockDB = false;

const pool = new Pool({
  connectionString: config.database.url,
});

// Test the connection
pool.connect()
  .then(client => {
    console.log('Database connection successful');
    client.release();
  })
  .catch(err => {
    console.error('Error connecting to the database:', err);
    if (config.server.env === 'development') {
      console.warn('Running in DEVELOPMENT with MOCK DATABASE. All database operations will return mock data.');
      useMockDB = true;
    } else {
      console.error('Database connection required for production mode!');
      process.exit(1); // Exit in production since we need the database
    }
  });

export const query = async (text: string, params?: any[]) => {
  try {
    // If in mock mode and development, return mock data
    if (useMockDB && config.server.env === 'development') {
      console.log('MOCK DB QUERY:', { text, params });
      
      // Return mock responses based on the query type
      if (text.toLowerCase().includes('select') && text.toLowerCase().includes('from users')) {
        return mockUserResponse(text);
      }
      if (text.toLowerCase().includes('select') && text.toLowerCase().includes('from workspaces')) {
        return mockWorkspaceResponse(text);
      }
      if (text.toLowerCase().includes('select') && text.toLowerCase().includes('from tasks')) {
        return mockTaskResponse(text);
      }
      
      // Generic insert/update mock response
      if (text.toLowerCase().includes('insert') || text.toLowerCase().includes('update')) {
        return { 
          rows: [{ id: '123e4567-e89b-12d3-a456-426614174000', created_at: new Date().toISOString() }],
          rowCount: 1
        };
      }
      
      // Default mock response
      return { rows: [], rowCount: 0 };
    }
    
    // Normal DB query
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (config.server.env === 'development') {
      console.log('Executed query', { text, duration, rows: res.rowCount });
    }
    
    return res;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
};

// Mock response generators
function mockUserResponse(query: string) {
  return {
    rows: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        full_name: 'Test User',
        password: '$2b$10$abcdefghijklmnopqrstuvwxyz12345678901234567890',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        last_login: '2023-01-01T00:00:00Z',
        preferences: {}
      }
    ],
    rowCount: 1
  };
}

function mockWorkspaceResponse(query: string) {
  return {
    rows: [
      {
        id: '223e4567-e89b-12d3-a456-426614174001',
        name: 'Demo Workspace',
        description: 'This is a mock workspace for development',
        owner_id: '123e4567-e89b-12d3-a456-426614174000',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        task_count: '3'
      }
    ],
    rowCount: 1
  };
}

function mockTaskResponse(query: string) {
  return {
    rows: [
      {
        id: '323e4567-e89b-12d3-a456-426614174002',
        title: 'Mock Task 1',
        description: 'This is a mock task for development',
        status: 'todo',
        priority: 'medium',
        due_date: '2023-12-31T00:00:00Z',
        workspace_id: '223e4567-e89b-12d3-a456-426614174001',
        created_by: '123e4567-e89b-12d3-a456-426614174000',
        assignee: '123e4567-e89b-12d3-a456-426614174000',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }
    ],
    rowCount: 1
  };
}

export default {
  query,
  pool,
}; 