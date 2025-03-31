import { FastifyInstance } from 'fastify';
import { getProfile, updateProfile } from '../controllers/userController';
import { authenticate } from '../middleware/authMiddleware';

export default async function (fastify: FastifyInstance) {
  // Get current user profile
  fastify.get('/api/users/me', {
    preHandler: [authenticate]
  }, getProfile);

  // Update current user profile
  fastify.put('/api/users/me', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          fullName: { type: 'string', minLength: 2 },
          email: { type: 'string', format: 'email' },
          preferences: { type: 'object' }
        }
      }
    }
  }, updateProfile as any);
}