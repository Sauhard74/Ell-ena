import { FastifyRequest, FastifyReply } from 'fastify';
import { JWT } from '@fastify/jwt';

declare module 'fastify' {
  interface FastifyRequest {
    jwt: JWT;
    userId: string;
  }
}

export const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify();
    
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('No token provided');
    }
    
    const decoded = request.server.jwt.decode<{ id: string }>(token);
    if (!decoded || !decoded.id) {
      throw new Error('Invalid token');
    }
    
    // Attach user ID to request
    request.userId = decoded.id;
  } catch (err) {
    reply.code(401).send({ 
      error: 'Unauthorized', 
      message: 'Authentication token is invalid or expired' 
    });
  }
}; 