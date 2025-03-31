import { FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import config from '../config/config';

export default async function registerSwagger(fastify: FastifyInstance) {
  await fastify.register(fastifySwagger, {
    swagger: {
      info: {
        title: 'Ell-ena API',
        description: 'API documentation for Ell-ena - AI Product Manager & Personal Assistant',
        version: '1.0.0'
      },
      host: `${config.server.host}:${config.server.port}`,
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      securityDefinitions: {
        apiKey: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
          description: 'Bearer token in format: Bearer {token}'
        }
      }
    }
  });

  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    },
    staticCSP: true,
    transformStaticCSP: (header) => header
  });
  
  fastify.log.info(`Swagger documentation available at ${config.server.host}:${config.server.port}/documentation`);
} 