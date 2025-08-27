'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { config } from '@/config/config';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userId: string, userData: User) => void;
  logout: () => void;
  checkAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const BACKEND_URL = config.backend.url;

  const isAuthenticated = !!user;

  const login = (token: string, userId: string, userData: User) => {
    Cookies.set('token', token, { 
      path: '/', 
      sameSite: 'lax',
      expires: 7 
    });
    Cookies.set('userId', userId, { 
      path: '/', 
      sameSite: 'lax',
      expires: 7
    });
    setUser(userData);
  };

  const logout = () => {
    Cookies.remove('token', { path: '/' });
    Cookies.remove('userId', { path: '/' });
    setUser(null);
  };

  const checkAuth = async () => {
    try {
      const token = Cookies.get('token');
      const userId = Cookies.get('userId');
      
      if (!token || !userId) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/v1/user/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoading,
      login,
      logout,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}