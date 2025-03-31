import { FastifyInstance } from 'fastify';
import { register, login, verifyToken } from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';

export default async function (fastify: FastifyInstance) {
  // Register a new user
  fastify.post('/api/auth/register', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'fullName'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          fullName: { type: 'string', minLength: 2 }
        }
      }
    }
  }, register);

  // Login existing user
  fastify.post('/api/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' }
        }
      }
    }
  }, login);

  // Verify authentication token
  fastify.get('/api/auth/verify', {
    preHandler: [authenticate]
  }, verifyToken);
} 