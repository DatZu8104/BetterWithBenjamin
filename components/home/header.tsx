'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; 
import { BookOpen, Download, Upload, Search, X, LogOut, User } from 'lucide-react'; 

interface HeaderProps {
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  // Thêm props cho User
  username?: string;
  onLogout?: () => void;
}

export function Header({ 
  onExport, 
  onImport, 
  onReset, 
  searchTerm, 
  onSearchChange,
  username = "User", // Mặc định là User nếu không có tên
  onLogout 
}: HeaderProps) {
  
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="h-16 shrink-0 border-b border-zinc-800 flex items-center justify-between px-4 bg-black/80 backdrop-blur z-50 sticky top-0 text-white">
      
      {/* 1. LOGO */}
      <div 
        className="flex items-center gap-2 font-bold text-xl cursor-pointer mr-4 hover:opacity-80 transition-opacity" 
        onClick={onReset}
      >
        <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-lg">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <span className="hidden md:inline">Flashcards</span>
      </div>

      {/* 2. THANH TÌM KIẾM */}
      <div className="flex-1 max-w-md mx-2 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input 
          placeholder="Tìm từ vựng..." 
          className="pl-9 h-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:bg-zinc-900 focus:border-zinc-600 focus:ring-0 transition-all rounded-full"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchTerm && (
          <button 
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 3. KHU VỰC BÊN PHẢI (IMPORT/EXPORT + AVATAR) */}
      <div className="flex items-center gap-2 ml-4">
        
        {/* Nút Export/Import (Giữ nguyên) */}
        <div className="hidden sm:flex items-center gap-2 mr-2">
            <Button variant="ghost" size="sm" onClick={onExport} title="Export" className="text-zinc-400 hover:text-white hover:bg-zinc-900">
            <Download className="w-4 h-4 sm:mr-2" /> 
            <span className="hidden sm:inline">Export</span>
            </Button>
            
            <label className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-zinc-200 transition-colors h-9 px-3 bg-white text-black font-bold shadow-sm">
            <Upload className="w-4 h-4 sm:mr-2" /> 
            <span className="hidden sm:inline">Import</span>
            <input 
                type="file" 
                accept="application/json" 
                className="hidden" 
                onChange={onImport} 
            />
            </label>
        </div>

        {/* --- USER AVATAR & DROPDOWN --- */}
        <div className="relative">
            {/* Avatar Circle */}
            <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg border-2 border-zinc-800 hover:border-zinc-600 transition-all shadow-md active:scale-95"
            >
                {username.charAt(0).toUpperCase()}
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
                <>
                    {/* Lớp màn hình trong suốt để bấm ra ngoài thì đóng menu */}
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowUserMenu(false)}
                    ></div>

                    {/* Nội dung Menu */}
                    <div className="absolute right-0 top-full mt-3 w-56 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                        <div className="p-4 border-b border-zinc-800">
                            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">Tài khoản</p>
                            <div className="flex items-center gap-2 text-white font-medium truncate">
                                <User className="w-4 h-4 text-blue-500" />
                                {username}
                            </div>
                        </div>
                        
                        <div className="p-1">
                            <button 
                                onClick={() => {
                                    setShowUserMenu(false);
                                    if(onLogout) onLogout();
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Đăng xuất
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>

      </div>
    </header>
  );
}