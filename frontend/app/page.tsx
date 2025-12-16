'use client';

import { useState, useEffect } from 'react';
import { AuthScreen } from '@/components/auth/AuthScreen'; 
import { MainApp } from '@/components/home/MainApp';       

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string>('User');
  const [userRole, setUserRole] = useState<string>('user'); // ✅ Thêm state Role
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user'); 
    const storedRole = localStorage.getItem('role'); // ✅ Lấy role từ storage
    
    if (storedToken) {
      setToken(storedToken);
      if (storedUser) setCurrentUser(storedUser);
      if (storedRole) setUserRole(storedRole);
    }
    setIsCheckingAuth(false);
  }, []);

  const handleLoginSuccess = (newToken: string, user: string, role: string) => { // ✅ Nhận thêm role
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', user);
    localStorage.setItem('role', role); // ✅ Lưu role
    
    setToken(newToken);
    setCurrentUser(user);
    setUserRole(role);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    setToken(null);
  };

  if (isCheckingAuth) return <div className="h-screen bg-black text-white flex items-center justify-center">Loading...</div>;

  if (!token) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />; 
    // ⚠️ Bạn nhớ vào AuthScreen sửa chỗ gọi onLoginSuccess để truyền thêm role nhé (xem lưu ý cuối bài)
  }

  return <MainApp currentUser={currentUser} role={userRole} onLogout={handleLogout} />; // ✅ Truyền role xuống MainApp
}