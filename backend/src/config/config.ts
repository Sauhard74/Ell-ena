import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface Config {
  server: {
    port: number;
    host: string;
    env: string;
  };
  auth: {
    jwtSecret: string;
    tokenExpiresIn: string;
  };
  cors: {
    allowedOrigins: string | string[];
  };
  jwt: {
    secret: string;
  };
  database: {
    url: string;
  };
  supabase: {
    url: string;
    key: string;
  };
  openai: {
    apiKey: string;
    model: string;
    embeddingModel: string;
  };
  neo4j: {
    uri: string;
    username: string;
    password: string;
  };
  storage: {
    tempDir: string;
  };
}

const config: Config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'default_secret_key_change_me',
    tokenExpiresIn: '7d', // Token expires in 7 days
  },
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || '*'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret_key_change_me'
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ellena',
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    key: process.env.SUPABASE_KEY || '',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'
  },
  neo4j: {
    uri: process.env.NEO4J_URI || 'neo4j://localhost:7687',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'password',
  },
  storage: {
    tempDir: process.env.TEMP_DIR || path.join(__dirname, '../../temp')
  }
};

export default config; 