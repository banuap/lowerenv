import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User } from '@shared/types';
import { apiService } from '../services/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('auth_token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
        } catch (error) {
          // Clear invalid stored data
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          console.error('Failed to parse stored user data:', error);
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiService.post<{token: string; user: User}>('/auth/login', { email, password });
      
      if (response.success && response.data) {
        const { token, user } = response.data;
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user); // This should trigger re-render
        console.log('AuthContext - User set after login:', user);
      } else {
        throw new Error('Login response was not successful');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const value: AuthContextType = useMemo(() => {
    const authValue = {
      user,
      login,
      logout,
      isLoading,
      isAuthenticated: !!user,
    };
    console.log('AuthContext - value updated:', { isAuthenticated: authValue.isAuthenticated, user: user?.email });
    return authValue;
  }, [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};