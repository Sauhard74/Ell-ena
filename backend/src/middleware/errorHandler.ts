import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export const errorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  // Determine status code
  let statusCode = error.statusCode || 500;
  
  // Default error message
  let errorMessage = 'An unexpected error occurred';
  
  // Check if this is a PostgreSQL error
  if (error.code && error.code.startsWith('23')) {
    statusCode = 400;
    
    // Handle specific database errors
    switch (error.code) {
      case '23505': // Unique violation
        errorMessage = 'A record with this value already exists';
        break;
      case '23503': // Foreign key violation
        errorMessage = 'Referenced record does not exist';
        break;
      case '23502': // Not null violation
        errorMessage = 'Required field is missing';
        break;
      default:
        errorMessage = 'Database constraint error';
    }
  }
  
  // Handle validation errors
  if (error.validation) {
    statusCode = 400;
    errorMessage = 'Invalid request parameters';
  }
  
  // Handle 404 errors
  if (error.statusCode === 404) {
    errorMessage = 'The requested resource was not found';
  }
  
  // Log the error in development mode
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', error);
  }
  
  // Send standardized error response
  reply.code(statusCode).send({
    error: statusCode === 500 ? 'Internal Server Error' : error.name || 'Error',
    message: errorMessage,
    details: error.validation || undefined
  });
}; 