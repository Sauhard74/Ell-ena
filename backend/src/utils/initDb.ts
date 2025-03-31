import fs from 'fs';
import path from 'path';
import db from './db';

const initializeDatabase = async () => {
  try {
    console.log('Initializing database...');
    
    // Read the schema SQL file
    const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    
    // Execute the SQL
    await db.query(schemaSQL);
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

export default initializeDatabase; 