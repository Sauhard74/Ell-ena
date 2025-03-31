import { buildApp } from './app';
import config from './config/config';

// Start the server
const start = async () => {
  try {
    const fastify = await buildApp();
    
    await fastify.listen({ 
      port: config.server.port,
      host: config.server.host 
    });
    
    console.log(`Server is running on ${config.server.host}:${config.server.port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start(); 