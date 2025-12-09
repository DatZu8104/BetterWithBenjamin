'use client';

import { useState, useEffect } from 'react';
import { AuthScreen } from '@/components/auth/AuthScreen'; // Import file mới
import { MainApp } from '@/components/home/MainApp';       // Import file mới

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string>('User');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Kiểm tra token khi mở app
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    // (Tuỳ chọn) Bạn có thể lưu thêm username vào localStorage để load lại cho đúng
    // const storedUser = localStorage.getItem('username'); 
    
    if (storedToken) {
      setToken(storedToken);
      // if (storedUser) setCurrentUser(storedUser);
    }
    setIsCheckingAuth(false);
  }, []);

  const handleLoginSuccess = (newToken: string, user: string) => {
    localStorage.setItem('token', newToken);
    // localStorage.setItem('username', user);
    setToken(newToken);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    // localStorage.removeItem('username');
    setToken(null);
  };

  // Màn hình loading (ngắn)
  if (isCheckingAuth) return <div className="h-screen w-screen bg-black flex items-center justify-center text-white">Loading...</div>;

  // CHƯA ĐĂNG NHẬP -> HIỆN AUTH SCREEN
  if (!token) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // ĐÃ ĐĂNG NHẬP -> HIỆN MAIN APP
  return <MainApp currentUser={currentUser} onLogout={handleLogout} />;
}