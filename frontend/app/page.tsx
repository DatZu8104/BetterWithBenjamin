'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Import router để chuyển trang
import { AuthScreen } from '../components/auth/AuthScreen';
import { MainApp } from '../components/home/MainApp';
import { api, setApiToken, clearApiToken } from '../lib/api';

// ❌ XÓA DÒNG NÀY ĐI VÌ FILE ĐÃ XÓA:
// import { AdminDashboard } from '../components/admin/AdminDashboard'; 

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

  // ❌ XÓA ĐOẠN CHECK URL THỦ CÔNG NÀY:
  // if (window.location.pathname === '/admin') ... return <AdminDashboard ... />

  // ✅ Thay vào đó, MainApp sẽ hoạt động bình thường.
  // Nếu muốn vào Admin, người dùng sẽ gõ /admin hoặc bấm nút chuyển.
  return <MainApp currentUser={currentUser} role={role} onLogout={handleLogout} />;
}