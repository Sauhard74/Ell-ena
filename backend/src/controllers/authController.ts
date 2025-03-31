import { FastifyRequest, FastifyReply } from 'fastify';
import db from '../utils/db';
import { hashPassword, comparePassword, sanitizeUser, getAuthErrorMessage } from '../utils/auth';
import { LoginRequest, RegisterRequest, User } from '../models/types';

export const register = async (
  request: FastifyRequest<{ Body: RegisterRequest }>,
  reply: FastifyReply
) => {
  try {
    const { email, password, fullName } = request.body;
    
    // Hash the password
    const hashedPassword = await hashPassword(password);
    
    // Insert new user into the database
    const result = await db.query(
      `INSERT INTO users (email, password, full_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, full_name, created_at`,
      [email, hashedPassword, fullName]
    );
    
    const newUser = result.rows[0];
    
    // Map database fields to camelCase
    const user: Partial<User> = {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.full_name,
      createdAt: newUser.created_at
    };
    
    // Generate JWT token
    const token = await reply.jwtSign(
      { id: user.id },
      { expiresIn: '7d' }
    );
    
    // Return user data and token
    return reply.code(201).send({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      token
    });
  } catch (error) {
    // Handle specific errors
    const errorMessage = getAuthErrorMessage(error);
    
    return reply.code(400).send({
      error: 'Registration Failed',
      message: errorMessage
    });
  }
};

export const login = async (
  request: FastifyRequest<{ Body: LoginRequest }>,
  reply: FastifyReply
) => {
  try {
    const { email, password } = request.body;
    
    // Find user by email
    const result = await db.query(
      `SELECT id, email, password, full_name, created_at, preferences
       FROM users
       WHERE email = $1`,
      [email]
    );
    
    const user = result.rows[0];
    
    // If user not found or password doesn't match
    if (!user || !(await comparePassword(password, user.password))) {
      return reply.code(401).send({
        error: 'Authentication Failed',
        message: 'Invalid email or password'
      });
    }
    
    // Update last login timestamp
    await db.query(
      `UPDATE users SET last_login = NOW() WHERE id = $1`,
      [user.id]
    );
    
    // Generate JWT token
    const token = await reply.jwtSign(
      { id: user.id },
      { expiresIn: '7d' }
    );
    
    // Return user data and token
    return reply.code(200).send({
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    
    return reply.code(500).send({
      error: 'Authentication Failed',
      message: 'An error occurred during login'
    });
  }
};

export const verifyToken = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    // Token is already verified by the authenticate middleware
    return reply.code(200).send({
      valid: true,
      userId: request.userId
    });
  } catch (error) {
    return reply.code(401).send({
      valid: false,
      message: 'Invalid or expired token'
    });
  }
}; 