import { FastifyInstance } from 'fastify';
import { transcribeAudio } from '../controllers/transcriptionController';
import { authenticate } from '../middleware/authMiddleware';

export default async function (fastify: FastifyInstance) {
  // Transcribe audio file
  fastify.post('/api/transcribe', {
    preHandler: [authenticate]
  }, transcribeAudio);
} 