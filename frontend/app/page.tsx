'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AuthScreen } from '../components/auth/AuthScreen';
import { MainApp } from '../components/home/MainApp';
import { api, setApiToken, clearApiToken } from '../lib/api';

export default function Home() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [role, setRole] = useState<string>('user');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const storedToken = sessionStorage.getItem('auth_token');
        const storedUser = sessionStorage.getItem('current_user');
        const storedRole = sessionStorage.getItem('user_role');

        if (storedToken && storedUser) {
            setApiToken(storedToken);
            setToken(storedToken);
            setCurrentUser(storedUser);
            setRole(storedRole || 'user');
            
            if (window.location.search === '') {
                router.replace('/?tab=personal');
            }
        }
    }
    setIsLoading(false);
  }, [router]);

  useEffect(() => {
    const handlePopState = () => {
        if (token && window.location.search === '') {
            handleLogout();
        }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [token]);

  const handleLoginSuccess = (newToken: string, user: string, userRole: string) => {
    if (typeof window !== 'undefined') {
        sessionStorage.setItem('current_user', user);      // ✅ thêm
        sessionStorage.setItem('user_role', userRole);
        sessionStorage.setItem('auth_token', newToken);
    }
    
    setToken(newToken);
    setCurrentUser(user);
    setRole(userRole);
    
    router.push('/?tab=personal'); 
  };

  const handleLogout = () => {
    clearApiToken();
    if (typeof window !== 'undefined') {
        sessionStorage.removeItem('auth_token'); 
        sessionStorage.removeItem('current_user');
        sessionStorage.removeItem('user_role');
    }
    setToken(null);
    setCurrentUser(null);
    setRole('user');
    
    router.replace('/'); 
  };

  if (isLoading) return <div className="h-screen bg-black flex items-center justify-center text-white">Loading...</div>;

  if (!token) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Suspense fallback={<div className="h-screen bg-black flex items-center justify-center text-white">Loading App...</div>}>
        <MainApp currentUser={currentUser} role={role} onLogout={handleLogout} />
    </Suspense>
  );
}