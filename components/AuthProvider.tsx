'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, StudentCredentials, AdminCredentials } from '@/types/auth';
import { authService } from '@/services/authService';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginAdmin: (credentials: AdminCredentials) => void;
  loginStudent: (credentials: StudentCredentials) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  const loginAdmin = (credentials: AdminCredentials) => {
    const loggedInUser = authService.loginAdmin(credentials);
    setUser(loggedInUser);
    router.push('/admin');
  };

  const loginStudent = (credentials: StudentCredentials) => {
    const loggedInUser = authService.loginStudent(credentials);
    setUser(loggedInUser);
    router.push('/student');
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, loginAdmin, loginStudent, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
