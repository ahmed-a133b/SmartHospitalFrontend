import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, User as APIUser, SignupRequest } from '../api/auth';

export type UserRole = 'admin' | 'doctor' | 'staff';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  department?: string;
  specialization?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (userData: SignupRequest) => Promise<boolean>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Mock users for demonstration - kept for testing
const mockUsers: User[] = [
  {
    id: 'admin-1',
    name: 'Dr. Sarah Johnson',
    role: 'admin',
    email: 'admin@hospital.com',
    department: 'Administration'
  },
  {
    id: 'doctor-1',
    name: 'Dr. Michael Chen',
    role: 'doctor',
    email: 'doctor@hospital.com',
    department: 'Cardiology',
    specialization: 'Interventional Cardiology'
  },
  {
    id: 'staff-1',
    name: 'Emma Wilson',
    role: 'staff',
    email: 'staff@hospital.com',
    department: 'ICU',
    specialization: 'Critical Care Nursing'
  }
];

// Helper function to convert API user to local user format
const convertAPIUserToUser = (apiUser: APIUser): User => ({
  id: apiUser.id,
  name: `${apiUser.first_name} ${apiUser.last_name}`,
  role: apiUser.role as UserRole,
  email: apiUser.email,
  department: apiUser.department,
  specialization: apiUser.specialization,
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing authentication on mount
  useEffect(() => {
    const initializeAuth = async () => {
      if (authAPI.isAuthenticated()) {
        try {
          const apiUser = await authAPI.getCurrentUser();
          setUser(convertAPIUserToUser(apiUser));
        } catch (error) {
          console.error('Failed to get current user:', error);
          // Token might be invalid, clear it
          authAPI.logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // First try real authentication
      const response = await authAPI.login({ email, password });
      setUser(convertAPIUserToUser(response.user));
      setError(null);
      return true;
    } catch (error) {
      console.warn('Real authentication failed, trying mock users:', error);
      
      // Fallback to mock authentication for testing
      const foundUser = mockUsers.find(u => u.email === email);
      if (foundUser && password === 'password') {
        setUser(foundUser);
        setError(null);
        return true;
      }
      
      // Set specific error message
      const errorMessage = error instanceof Error ? error.message : 'Invalid email or password';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (userData: SignupRequest): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await authAPI.signup(userData);
      setUser(convertAPIUserToUser(response.user));
      return true;
    } catch (error) {
      console.error('Signup failed:', error);
      setError(error instanceof Error ? error.message : 'Signup failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
};