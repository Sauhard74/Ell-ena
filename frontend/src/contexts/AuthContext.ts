import { createContext } from 'react';

export interface AuthContextType {
  signIn: (token: string, userId: string) => Promise<void>;
  signOut: () => Promise<void>;
  token: string | null;
  userId: string | null;
}

// Default context with empty implementations
export const AuthContext = createContext<AuthContextType>({
  signIn: async () => {},
  signOut: async () => {},
  token: null,
  userId: null
}); 