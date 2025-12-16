'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Download, LogOut, ChevronDown, Search, BookOpen, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  onSearchChange: (term: string) => void;
  searchTerm: string;
  onReset: () => void; // Hàm này sẽ nhận handleReset từ MainApp (về trang chủ)
  username: string;
  role?: string;
  onLogout: () => void;
  totalWords?: number;
  learnedCount?: number;
  onExport?: () => void;
  onImport?: (e: any) => void;
}

export function Header({ 
  onSearchChange, searchTerm, onReset, username, role, onLogout, 
  totalWords = 0, learnedCount = 0 
}: HeaderProps) {
  
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Tính phần trăm
  const percentage = totalWords > 0 ? Math.round((learnedCount / totalWords) * 100) : 0;

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-black sticky top-0 z-50 text-white shadow-sm">
      
      {/* LOGO - Bấm vào thì gọi onReset (Về trang chủ) */}
      <div 
        className="flex items-center gap-2 shrink-0 cursor-pointer hover:opacity-80 transition-opacity group" 
        onClick={onReset} // ✅ GỌI HÀM VỀ TRANG CHỦ
      >
        <div className="bg-white/10 p-2 rounded-lg group-hover:bg-white/20 transition-colors">
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        </div>
        <h1 className="text-xl font-bold tracking-tight hidden md:block select-none">Flashcards</h1>
      </div>
      
      {/* SEARCH BAR */}
      <div className="flex-1 max-w-xl mx-4 relative hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input 
            type="text"
            placeholder="Tìm kiếm từ vựng..."
            className="w-full pl-9 pr-4 py-2 rounded-full border border-zinc-800 bg-zinc-900 focus:bg-zinc-800 focus:outline-none focus:border-blue-500 transition-all text-sm text-white"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* USER MENU */}
      <div className="relative shrink-0">
        <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className="flex items-center gap-2 hover:bg-zinc-800 p-1.5 pl-2 pr-2 rounded-full transition-colors outline-none border border-transparent hover:border-zinc-700"
        >
            <span className="text-sm font-bold hidden sm:block text-zinc-300">{username}</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-inner ${role === 'admin' ? 'bg-gradient-to-br from-red-500 to-red-700' : 'bg-gradient-to-br from-blue-500 to-blue-700'}`}>
                {username.charAt(0).toUpperCase()}
            </div>
            <ChevronDown className="w-4 h-4 text-zinc-400" />
        </button>
        
        {isMenuOpen && (
            <div className="absolute right-0 top-14 w-72 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 p-1 text-zinc-300 animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5">
                {/* User Info */}
                <div className="px-4 py-4 border-b border-zinc-800 bg-zinc-900/50 rounded-t-lg">
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-sm font-bold text-white truncate max-w-[150px]">{username}</p>
                        {role === 'admin' && <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20 font-bold tracking-wider">ADMIN</span>}
                    </div>
                    <p className="text-xs text-zinc-500">Học viên chăm chỉ</p>
                </div>

                {/* Progress Bar */}
                <div className="px-4 py-4">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                            <BookOpen size={14} /> Tổng tiến độ
                        </span>
                        <span className="text-xs font-bold text-white font-mono">
                            {learnedCount}/{totalWords} ({percentage}%)
                        </span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(37,99,235,0.5)]" style={{ width: `${percentage}%` }}></div>
                    </div>
                </div>

                <div className="h-px bg-zinc-800 my-1 mx-2"></div>

                {/* Menu Actions */}
                <div className="p-1 space-y-0.5">
                    {role === 'admin' && (
                        <button onClick={() => router.push('/admin')} className="w-full text-left px-3 py-2.5 text-sm hover:bg-zinc-800 rounded-lg flex gap-3 items-center transition-colors text-red-400 font-bold group">
                            <ShieldCheck className="w-4 h-4 group-hover:text-red-300"/> Quản lý hệ thống
                        </button>
                    )}

                    <button className="w-full text-left px-3 py-2.5 text-sm hover:bg-zinc-800 rounded-lg flex gap-3 items-center transition-colors text-zinc-300">
                        <Upload className="w-4 h-4 text-zinc-500"/> Import dữ liệu
                    </button>
                    
                    <button className="w-full text-left px-3 py-2.5 text-sm hover:bg-zinc-800 rounded-lg flex gap-3 items-center transition-colors text-zinc-300">
                        <Download className="w-4 h-4 text-zinc-500"/> Export dữ liệu
                    </button>
                </div>
                
                <div className="h-px bg-zinc-800 my-1 mx-2"></div>
                
                <div className="p-1">
                    <button onClick={onLogout} className="w-full text-left px-3 py-2.5 text-sm hover:bg-red-950/30 text-red-500 rounded-lg flex gap-3 items-center transition-colors font-medium">
                        <LogOut className="w-4 h-4"/> Đăng xuất
                    </button>
                </div>
            </div>
        )}
        
        {isMenuOpen && <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsMenuOpen(false)}></div>}
      </div>
    </header>
  );
}