'use client';

import { useState } from 'react';
import { User, Lock, Loader2, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (token: string, user: string) => void;
}

export function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = 'const API_URL = process.env.NEXT_PUBLIC_API_URL || http://localhost:5000/api';;

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
        // Đăng nhập thành công
        onLoginSuccess(data.token, data.username);
      } else {
        // Đăng ký thành công
        setSuccess('Đăng ký thành công! Vui lòng đăng nhập.');
        setIsLogin(true);
        setPassword(''); // Xóa mật khẩu để người dùng nhập lại
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="bg-zinc-950 p-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-2">
            {isLogin ? 'Chào mừng trở lại' : 'Tạo tài khoản mới'}
          </h2>
          <p className="text-zinc-400 text-sm">
            {isLogin ? 'Đăng nhập để tiếp tục học từ vựng' : 'Bắt đầu hành trình học tập của bạn'}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Username Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 ml-1">Tên đăng nhập</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-gray-50 text-gray-900 placeholder:text-gray-400"
                  placeholder="Nhập username..."
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 ml-1">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-gray-50 text-gray-900 placeholder:text-gray-400"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Thông báo lỗi / thành công */}
            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            
            {success && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-top-1">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {success}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  {isLogin ? 'Đăng Nhập' : 'Đăng Ký Ngay'}
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          {/* Footer Toggle */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setSuccess('');
                }}
                className="ml-2 font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors focus:outline-none"
              >
                {isLogin ? 'Đăng ký miễn phí' : 'Đăng nhập ngay'}
              </button>
            </p>
          </div>
        </div>
        
      </div>
      
      {/* Footer bản quyền nhỏ */}
      <div className="fixed bottom-4 text-xs text-gray-400">
        © 2025 English Flashcard App
      </div>
    </div>
  );
}