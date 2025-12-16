'use client';

import { useState } from 'react';
import { AuthScreen } from '@/components/auth/AuthScreen'; 
import { MainApp } from '@/components/home/MainApp';       
import { setApiToken } from '../lib/api'; // ✅ Import hàm này từ file api.ts

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string>('User');
  const [userRole, setUserRole] = useState<string>('user');

  // ❌ KHÔNG CÒN useEffect kiểm tra localStorage nữa
  // Khi F5 trang -> State reset -> Token = null -> Hiện AuthScreen

  const handleLoginSuccess = (newToken: string, user: string, role: string) => {
    // 1. Lưu token vào biến RAM (để gọi API)
    setApiToken(newToken);
    
    // 2. Lưu vào State (để chuyển màn hình)
    setToken(newToken);
    setCurrentUser(user);
    setUserRole(role);
    
    // ❌ KHÔNG lưu localStorage
  };

  const handleLogout = () => {
    setApiToken(''); // Xóa biến RAM
    setToken(null);
  };

  // Nếu chưa có token (vừa vào hoặc vừa F5) -> Hiện màn hình đăng nhập
  if (!token) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />; 
  }

  return <MainApp currentUser={currentUser} role={userRole} onLogout={handleLogout} />;
}