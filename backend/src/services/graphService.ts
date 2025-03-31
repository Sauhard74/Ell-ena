import neo4j, { Driver, Session } from 'neo4j-driver';
import config from '../config/config';

// Flag to track if we're using mock mode due to Neo4j connection failure
let useMockGraph = false;

// Initialize Neo4j driver with a try-catch to handle connection errors
let driver: Driver;
try {
  driver = neo4j.driver(
    config.neo4j.uri,
    neo4j.auth.basic(config.neo4j.username, config.neo4j.password)
  );
} catch (error) {
  console.error('Failed to initialize Neo4j driver:', error);
  if (config.server.env === 'development') {
    console.warn('Running in DEVELOPMENT with MOCK NEO4J. All graph operations will return mock data.');
    useMockGraph = true;
  } else {
    console.error('Neo4j connection required for production mode!');
    process.exit(1); // Exit in production since we need Neo4j
  }
}

// Mock session for development mode
const createMockSession = () => {
  return {
    run: async (query: string, params: any) => {
      console.log('MOCK NEO4J QUERY:', { query, params });
      return mockNeo4jResponse(query, params);
    },
    close: async () => {}
  };
};

// Test the connection
const testConnection = async (): Promise<void> => {
  if (useMockGraph) {
    console.log('Neo4j mock connection successful');
    return;
  }
  
  const session = driver.session();
  try {
    await session.run('RETURN 1');
    console.log('Neo4j connection successful');
  } catch (error) {
    console.error('Error connecting to Neo4j:', error);
    if (config.server.env === 'development') {
      console.warn('Running in DEVELOPMENT with MOCK NEO4J. All graph operations will return mock data.');
      useMockGraph = true;
    }
  } finally {
    await session.close();
  }
};

// Create task node
export const createTaskNode = async (taskId: string, properties: any): Promise<any> => {
  const session = useMockGraph ? createMockSession() : driver.session();
  try {
    const result = await session.run(
      `
      CREATE (t:Task {id: $taskId, title: $title, description: $description, status: $status, priority: $priority})
      RETURN t
      `,
      {
        taskId,
        title: properties.title || '',
        description: properties.description || '',
        status: properties.status || 'active',
        priority: properties.priority || 'medium'
      }
    );
    
    return useMockGraph 
      ? result.records[0].get('t').properties
      : result.records[0].get('t').properties;
  } catch (error) {
    console.error('Error creating task node:', error);
    throw error;
  } finally {
    await session.close();
  }
};

// Mock Neo4j response based on query
function mockNeo4jResponse(query: string, params: any) {
  // Mock a simple task node
  const mockTask = {
    identity: { toString: () => '1' },
    properties: {
      id: params.taskId || '123-mock-task',
      title: params.title || 'Mock Task',
      description: params.description || 'This is a mock task',
      status: params.status || 'active',
      priority: params.priority || 'medium'
    }
  };
  
  // Mock a relationship
  const mockRelationship = {
    type: 'DEPENDS_ON',
    identity: { toString: () => 'rel-1' }
  };
  
  // Mock path segments for graph queries
  const mockSegment = {
    start: mockTask,
    end: {
      identity: { toString: () => '2' },
      properties: {
        id: '456-mock-related',
        title: 'Related Mock Task',
        description: 'This is a related mock task',
        status: 'active',
        priority: 'high'
      }
    },
    relationship: mockRelationship
  };
  
  // Return appropriate mock data based on the query
  if (query.includes('CREATE (t:Task')) {
    return {
      records: [{ 
        get: (name: string) => mockTask,
        has: (name: string) => false
      }]
    };
  }
  
  if (query.includes('MATCH path =')) {
    return {
      records: [
        { 
          get: (name: string) => ({
            segments: [mockSegment]
          }),
          has: (name: string) => false
        }
      ]
    };
  }
  
  if (query.includes('MATCH (t:Task') && query.includes('RETURN related')) {
    return {
      records: [
        { 
          get: (name: string) => name === 'related' ? mockTask : 'DEPENDS_ON',
          has: (name: string) => name === 'relationshipType'
        }
      ]
    };
  }
  
  // Default empty response
  return { records: [] };
}

// Create relationship between tasks
export const createTaskRelationship = async (
  sourceTaskId: string,
  targetTaskId: string,
  relationshipType: string
): Promise<any> => {
  const session = useMockGraph ? createMockSession() : driver.session();
  try {
    const result = await session.run(
      `
      MATCH (source:Task {id: $sourceTaskId})
      MATCH (target:Task {id: $targetTaskId})
      CREATE (source)-[r:${relationshipType}]->(target)
      RETURN source, r, target
      `,
      { sourceTaskId, targetTaskId }
    );
    
    return result.records[0];
  } catch (error) {
    console.error(`Error creating ${relationshipType} relationship:`, error);
    throw error;
  } finally {
    await session.close();
  }
};

// Get related tasks
export const getRelatedTasks = async (taskId: string, relationship?: string): Promise<any[]> => {
  const session = useMockGraph ? createMockSession() : driver.session();
  try {
    let query = '';
    
    if (relationship) {
      // Get tasks with specific relationship
      query = `
        MATCH (t:Task {id: $taskId})-[r:${relationship}]-(related)
        RETURN related
      `;
    } else {
      // Get all related tasks regardless of relationship type
      query = `
        MATCH (t:Task {id: $taskId})-[r]-(related)
        RETURN related, type(r) as relationshipType
      `;
    }
    
    const result = await session.run(query, { taskId });
    
    return result.records.map(record => {
      const task = record.get('related').properties;
      if (record.has('relationshipType')) {
        return {
          ...task,
          relationshipType: record.get('relationshipType')
        };
      }
      return task;
    });
  } catch (error) {
    console.error('Error getting related tasks:', error);
    throw error;
  } finally {
    await session.close();
  }
};

// Delete task node
export const deleteTaskNode = async (taskId: string): Promise<void> => {
  const session = useMockGraph ? createMockSession() : driver.session();
  try {
    await session.run(
      `
      MATCH (t:Task {id: $taskId})
      DETACH DELETE t
      `,
      { taskId }
    );
  } catch (error) {
    console.error('Error deleting task node:', error);
    throw error;
  } finally {
    await session.close();
  }
};

// Delete specific relationship between tasks
export const deleteTaskRelationship = async (
  sourceTaskId: string,
  targetTaskId: string,
  relationshipType: string
): Promise<void> => {
  const session = useMockGraph ? createMockSession() : driver.session();
  try {
    await session.run(
      `
      MATCH (source:Task {id: $sourceTaskId})-[r:${relationshipType}]->(target:Task {id: $targetTaskId})
      DELETE r
      `,
      { sourceTaskId, targetTaskId }
    );
  } catch (error) {
    console.error(`Error deleting ${relationshipType} relationship:`, error);
    throw error;
  } finally {
    await session.close();
  }
};

// Find connected graph of tasks
export const getTaskGraph = async (taskId: string, depth: number = 2): Promise<any> => {
  const session = useMockGraph ? createMockSession() : driver.session();
  try {
    const result = await session.run(
      `
      MATCH path = (t:Task {id: $taskId})-[*1..${depth}]-(related)
      RETURN path
      `,
      { taskId }
    );
    
    // Processing the graph data to a more usable format
    const nodes = new Map();
    const relationships: Array<{source: string, target: string, type: string}> = [];
    
    result.records.forEach(record => {
      const path = record.get('path');
      path.segments.forEach((segment: any) => {
        // Add start node
        const startNode = segment.start;
        if (!nodes.has(startNode.identity.toString())) {
          nodes.set(startNode.identity.toString(), startNode.properties);
        }
        
        // Add end node
        const endNode = segment.end;
        if (!nodes.has(endNode.identity.toString())) {
          nodes.set(endNode.identity.toString(), endNode.properties);
        }
        
        // Add relationship
        relationships.push({
          source: startNode.properties.id,
          target: endNode.properties.id,
          type: segment.relationship.type
        });
      });
    });
    
    return {
      nodes: Array.from(nodes.values()),
      relationships
    };
  } catch (error) {
    console.error('Error getting task graph:', error);
    throw error;
  } finally {
    await session.close();
  }
};

// Update task node properties
export const updateTaskNode = async (taskId: string, properties: any): Promise<any> => {
  const session = useMockGraph ? createMockSession() : driver.session();
  try {
    // Create dynamic property updates
    const propsToUpdate = Object.entries(properties)
      .map(([key, value]) => `t.${key} = $${key}`)
      .join(', ');
    
    if (!propsToUpdate) {
      throw new Error('No properties provided for update');
    }
    
    const result = await session.run(
      `
      MATCH (t:Task {id: $taskId})
      SET ${propsToUpdate}
      RETURN t
      `,
      { taskId, ...properties }
    );
    
    if (result.records.length === 0) {
      throw new Error(`Task with id ${taskId} not found`);
    }
    
    return result.records[0].get('t').properties;
  } catch (error) {
    console.error('Error updating task node:', error);
    throw error;
  } finally {
    await session.close();
  }
};

// Create initial schema constraints
export const initializeSchema = async (): Promise<void> => {
  if (useMockGraph) {
    console.log('Neo4j mock schema initialized');
    return;
  }
  
  const session = driver.session();
  try {
    // Create constraint on Task id
    await session.run(
      `CREATE CONSTRAINT task_id_unique IF NOT EXISTS
       FOR (t:Task)
       REQUIRE t.id IS UNIQUE`
    );
    
    console.log('Neo4j schema initialized');
  } catch (error) {
    console.error('Error initializing Neo4j schema:', error);
  } finally {
    await session.close();
  }
};

// Close the driver when the application shuts down
export const closeDriver = async (): Promise<void> => {
  if (!useMockGraph) {
    await driver.close();
  }
};

// Initialize connection and schema
testConnection()
  .then(() => initializeSchema())
  .catch(error => console.error('Error during Neo4j initialization:', error));

export default {
  createTaskNode,
  createTaskRelationship,
  getRelatedTasks,
  deleteTaskNode,
  deleteTaskRelationship,
  getTaskGraph,
  updateTaskNode,
  closeDriver
}; 