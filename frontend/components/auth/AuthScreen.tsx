'use client';

import { useState } from 'react';
import { api, setApiToken } from '../../lib/api'; 
import { Loader2, User, Lock, ArrowRight, BookOpen, KeyRound } from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (token: string, user: string, role: string) => void;
}

export function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const colorBgGlow = isLogin ? 'bg-blue-600/10' : 'bg-emerald-600/10';
  const colorIcon = isLogin ? 'text-blue-500' : 'text-emerald-500';
  const colorFocus = isLogin ? 'focus:border-blue-500 focus:ring-blue-500' : 'focus:border-emerald-500 focus:ring-emerald-500';
  const colorButton = isLogin ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLogin && password !== confirmPassword) {
        setError('Passwords do not match!');
        return;
    }

    setIsLoading(true);

    try {
      let data;
      if (isLogin) {
        data = await api.login(username, password);
      } else {
        data = await api.register(username, password);
      }

      if (data.error) throw new Error(data.error);

      setApiToken(data.token);
      if (typeof window !== 'undefined') {
          sessionStorage.setItem('current_user', data.username);
          sessionStorage.setItem('user_role', data.role || 'user');
      }

      if (isLogin) {
        onLoginSuccess(data.token, data.username, data.role);
      } else {
        alert('Registration successful! Please login.');
        setIsLogin(true);
        setPassword('');
        setConfirmPassword('');
      }

    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchTab = (toLogin: boolean) => {
      setIsLogin(toLogin);
      setError('');
      setPassword('');
      setConfirmPassword('');
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-8 relative overflow-hidden transition-all duration-500">
        
        {/* Ánh sáng nền thay đổi theo trạng thái */}
        <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none transition-colors duration-500 ${colorBgGlow}`}></div>

        <div className="text-center mb-6 relative z-10">
            <div className="inline-flex p-3 bg-zinc-800 rounded-2xl mb-4 shadow-inner">
                <BookOpen className={`w-8 h-8 transition-colors duration-500 ${colorIcon}`} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">
                Better With <span className={`transition-colors duration-500 ${colorIcon}`}>Ben</span>
            </h1>
            <p className="text-zinc-500 text-sm">
                {isLogin ? 'Welcome back! Ready to learn?' : 'Create an account to start learning'}
            </p>
        </div>

        {/* --- GIAI ĐOẠN 2: Hệ thống Tabs chuyển đổi --- */}
        <div className="flex bg-black/50 p-1.5 rounded-xl mb-6 border border-white/5 relative z-10">
            <button 
                type="button"
                onClick={() => handleSwitchTab(true)} 
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${isLogin ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                Login
            </button>
            <button 
                type="button"
                onClick={() => handleSwitchTab(false)} 
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${!isLogin ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                Sign Up
            </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            {/* Input: Username */}
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Username</label>
                <div className="relative">
                    <User className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />
                    <input 
                        type="text" 
                        required 
                        className={`w-full pl-12 pr-4 py-3.5 bg-black border border-zinc-800 rounded-xl text-white focus:ring-1 transition-all outline-none ${colorFocus}`}
                        placeholder="Enter username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                    />
                </div>
            </div>

            {/* Input: Password */}
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Password</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />
                    <input 
                        type="password" 
                        required 
                        className={`w-full pl-12 pr-4 py-3.5 bg-black border border-zinc-800 rounded-xl text-white focus:ring-1 transition-all outline-none ${colorFocus}`}
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                </div>
            </div>

            {/* --- GIAI ĐOẠN 1: Input: Confirm Password (Chỉ hiện khi Đăng ký) --- */}
            {!isLogin && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Confirm Password</label>
                    <div className="relative">
                        <KeyRound className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />
                        <input 
                            type="password" 
                            required 
                            className={`w-full pl-12 pr-4 py-3.5 bg-black border border-zinc-800 rounded-xl text-white focus:ring-1 transition-all outline-none ${colorFocus}`}
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 animate-in fade-in">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></div>
                    <p className="text-sm text-red-400 font-medium">{error}</p>
                </div>
            )}

            {/* Nút Submit (Màu đổi tự động) */}
            <button 
                type="submit" 
                disabled={isLoading}
                className={`w-full py-4 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 mt-4 ${colorButton}`}
            >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : (
                    <>
                        {isLogin ? 'Login' : 'Create Account'} 
                        <ArrowRight className="w-5 h-5" />
                    </>
                )}
            </button>
        </form>
      </div>
    </div>
  );
}