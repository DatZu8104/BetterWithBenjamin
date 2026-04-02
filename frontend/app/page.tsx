'use client';

// 🚀 1. Bổ sung import Suspense
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

  // Tự động đăng nhập
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
        }
    }
    setIsLoading(false);
  }, []);

  const handleLoginSuccess = (newToken: string, user: string, userRole: string) => {
    setToken(newToken);
    setCurrentUser(user);
    setRole(userRole);
  };

  const handleLogout = () => {
    clearApiToken();
    if (typeof window !== 'undefined') {
        sessionStorage.removeItem('current_user');
        sessionStorage.removeItem('user_role');
    }
    setToken(null);
    setCurrentUser(null);
    setRole('user');
  };

  if (isLoading) return <div className="h-screen bg-black flex items-center justify-center text-white">Loading...</div>;

  if (!token) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // 🚀 2. Bọc Suspense ở đây để Next.js xử lý an toàn useSearchParams
  return (
    <Suspense fallback={<div className="h-screen bg-black flex items-center justify-center text-white">Loading App...</div>}>
        <MainApp currentUser={currentUser} role={role} onLogout={handleLogout} />
    </Suspense>
  );
}