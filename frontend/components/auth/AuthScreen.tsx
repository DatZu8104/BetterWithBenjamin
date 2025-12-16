'use client';

import { useState } from 'react';
import { User, Lock, Loader2, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (token: string, user: string, role: string) => void;
}

export function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const endpoint = isLogin ? '/login' : '/register';

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra');

      if (isLogin) {
        onLoginSuccess(data.token, data.username, data.role || 'user');
      } else {
        setSuccess('Đăng ký thành công! Vui lòng đăng nhập.');
        setIsLogin(true);
        setPassword(''); 
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    // ✅ ĐỔI MÀU NỀN SANG MÀU ĐEN (bg-black)
    <div className="min-h-screen w-full flex items-center justify-center bg-black p-4">
      {/* KHUNG FORM MÀU TỐI (bg-zinc-900) */}
      <div className="w-full max-w-md bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-zinc-800">
        
        {/* Header */}
        <div className="bg-zinc-950 p-8 text-center border-b border-zinc-800">
          <h2 className="text-3xl font-bold text-white mb-2">
            {isLogin ? 'Better With Benjamin' : 'Tạo tài khoản'}
          </h2>
          <p className="text-zinc-400 text-sm">
            {isLogin ? 'Đăng nhập để đồng bộ tiến độ học' : 'Tham gia cùng chúng tôi ngay hôm nay'}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Tên đăng nhập</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  // Input màu tối
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-800 bg-black text-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all placeholder:text-zinc-600"
                  placeholder="Nhập username..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-800 bg-black text-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all placeholder:text-zinc-600"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 bg-red-950/30 p-3 rounded-lg text-sm font-medium border border-red-900/50">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            
            {success && (
              <div className="flex items-center gap-2 text-green-400 bg-green-950/30 p-3 rounded-lg text-sm font-medium border border-green-900/50">
                <CheckCircle2 className="h-4 w-4 shrink-0" /> {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (isLogin ? 'Đăng Nhập' : 'Đăng Ký')} <ArrowRight className="h-5 w-5" />
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
              className="text-sm text-zinc-500 hover:text-white transition-colors hover:underline"
            >
              {isLogin ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}