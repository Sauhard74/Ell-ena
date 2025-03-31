import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { errorHandler } from './middleware/errorHandler';
import config from './config/config';
import registerSwagger from './utils/swagger';

// Register routes
const registerRoutes = async (fastify: FastifyInstance) => {
  //Once the route files are created, uncomment these lines
  fastify.register(require('./routes/authRoutes'));
  fastify.register(require('./routes/userRoutes'));
  fastify.register(require('./routes/workspaceRoutes'));
  fastify.register(require('./routes/taskRoutes'));
  fastify.register(require('./routes/nlpRoutes'));
  fastify.register(require('./routes/transcriptionRoutes'));
  fastify.register(require('./routes/contextRoutes'));
  fastify.register(require('./routes/activityRoutes'));
  fastify.register(require('./routes/taskRelationshipRoutes'));
};

export const buildApp = async (): Promise<FastifyInstance> => {
  const fastify = Fastify({
    logger: process.env.NODE_ENV !== 'production'
  });

  // Register plugins
  await fastify.register(cors, {
    origin: config.cors.allowedOrigins,
    credentials: true
  });

  await fastify.register(jwt, {
    secret: config.jwt.secret
  });

  await fastify.register(multipart, {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB max file size
    }
  });

  // Set up error handler
  fastify.setErrorHandler(errorHandler);

  // Register Swagger documentation
  await registerSwagger(fastify);

  // Define root route
  fastify.get('/', async (request, reply) => {
    return { message: 'Ell-ena API is up and running! 🚀' };
  });

  // Register routes when files are ready
  await registerRoutes(fastify);

  return fastify;
}; 