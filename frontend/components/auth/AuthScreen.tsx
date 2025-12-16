'use client';

import { useState } from 'react';
import { api, setApiToken } from '../../lib/api'; // Nhớ import setApiToken
import { Loader2, User, Lock, ArrowRight, BookOpen } from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (token: string, user: string, role: string) => void;
}

export function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      let data;
      if (isLogin) {
        data = await api.login(username, password);
      } else {
        data = await api.register(username, password);
      }

      if (data.error) throw new Error(data.error);

      // ✅ 1. LƯU TOKEN VÀO API
      setApiToken(data.token);

      // ✅ 2. LƯU THÔNG TIN VÀO SESSION STORAGE (ĐỂ F5 KHÔNG MẤT)
      if (typeof window !== 'undefined') {
          sessionStorage.setItem('current_user', data.username);
          sessionStorage.setItem('user_role', data.role || 'user');
      }

      // ✅ 3. CHUYỂN VÀO TRANG CHÍNH
      if (isLogin) {
        onLoginSuccess(data.token, data.username, data.role);
      } else {
        alert('Registration successful! Please login.');
        setIsLogin(true);
        setPassword('');
      }

    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-8 relative overflow-hidden">
        
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="text-center mb-8 relative z-10">
            <div className="inline-flex p-3 bg-zinc-800 rounded-2xl mb-4 shadow-inner">
                <BookOpen className="w-8 h-8 text-blue-500" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">
                Better With <span className="text-blue-500">Ben</span>
            </h1>
            <p className="text-zinc-500 text-sm">
                {isLogin ? 'Welcome back! Ready to learn?' : 'Create an account to start learning'}
            </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Username</label>
                <div className="relative">
                    <User className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />
                    <input 
                        type="text" 
                        required 
                        className="w-full pl-12 pr-4 py-3.5 bg-black border border-zinc-800 rounded-xl text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                        placeholder="Enter username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Password</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />
                    <input 
                        type="password" 
                        required 
                        className="w-full pl-12 pr-4 py-3.5 bg-black border border-zinc-800 rounded-xl text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 animate-in fade-in">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></div>
                    <p className="text-sm text-red-400 font-medium">{error}</p>
                </div>
            )}

            <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/30 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
            >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : (
                    <>
                        {isLogin ? 'Login' : 'Sign Up'} 
                        <ArrowRight className="w-5 h-5" />
                    </>
                )}
            </button>
        </form>

        <div className="mt-8 text-center relative z-10">
            <button 
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-sm text-zinc-500 hover:text-white transition-colors underline underline-offset-4"
            >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
            </button>
        </div>
      </div>
    </div>
  );
}