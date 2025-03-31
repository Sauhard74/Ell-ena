import bcrypt from 'bcrypt';
import { User } from '../models/types';

// Generate a password hash
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

// Compare password with hash
export const comparePassword = async (
  password: string, 
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// Remove sensitive data from user object before sending to client
export const sanitizeUser = (user: User): Omit<User, 'password'> => {
  const { password, ...sanitizedUser } = user;
  return sanitizedUser;
};

// Generate a friendly error message for auth errors
export const getAuthErrorMessage = (error: any): string => {
  if (error.code === '23505' && error.constraint === 'users_email_key') {
    return 'A user with this email already exists';
  }
  
  if (error.message.includes('invalid input syntax for type uuid')) {
    return 'Invalid user ID format';
  }
  
  return 'An error occurred during authentication';
}; 