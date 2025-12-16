'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { Upload, Download, LogOut, ChevronDown, Search, BookOpen, ShieldCheck, Loader2 } from 'lucide-react';

interface HeaderProps {
  onSearchChange: (term: string) => void;
  searchTerm: string;
  onReset: () => void;
  username: string;
  role?: string;
  onLogout: () => void;
  totalWords?: number;
  learnedCount?: number;
}

export function Header({ 
  onSearchChange, searchTerm, onReset, username, role, onLogout, 
  totalWords = 0, learnedCount = 0 
}: HeaderProps) {
  
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const percentage = totalWords > 0 ? Math.round((learnedCount / totalWords) * 100) : 0;

  // --- XỬ LÝ EXPORT (XUẤT FILE CHUẨN CẤU TRÚC CỦA BẠN) ---
  const handleExportClick = async () => {
    try {
        setIsProcessing(true);
        const data = await api.syncData();
        if (!data) return alert("Không lấy được dữ liệu!");

        const allWords = data.words || [];

        // ✅ TẠO CẤU TRÚC JSON GIỐNG HỆT FILE BẠN GỬI
        const exportData = {
            exportedAt: new Date().toISOString(),
            
            // Danh sách tên các nhóm
            groups: Array.from(new Set(allWords.map((w: any) => w.group))),
            
            // Danh sách từ vựng (bỏ trường learned đi để giống file mẫu)
            words: allWords.map((w: any) => ({
                id: w.id || w._id,
                english: w.english,
                definition: w.definition,
                type: w.type,
                group: w.group
            })),

            // Mảng chứa ID các từ đã học
            learned: allWords.filter((w: any) => w.learned).map((w: any) => w.id || w._id)
        };

        // Tải xuống
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `vocabulary_backup_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setIsMenuOpen(false);
    } catch (error) {
        alert("Lỗi khi xuất dữ liệu");
        console.error(error);
    } finally {
        setIsProcessing(false);
    }
  };

  // --- XỬ LÝ IMPORT (GIỮ NGUYÊN) ---
  const triggerImport = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
          setIsProcessing(true);
          const reader = new FileReader();
          reader.onload = async (e) => {
              try {
                  const content = e.target?.result as string;
                  const jsonData = JSON.parse(content);
                  
                  // Gọi API import (Server đã sửa để hiểu cấu trúc này)
                  await api.importData(jsonData);
                  
                  alert("Nhập dữ liệu thành công! Trang sẽ tải lại.");
                  window.location.reload();
              } catch (err) {
                  alert("File lỗi hoặc Server không phản hồi!");
                  console.error(err);
              }
          };
          reader.readAsText(file);
      } catch (error) {
          console.error(error);
      } finally {
          setIsProcessing(false);
          setIsMenuOpen(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-black sticky top-0 z-50 text-white shadow-sm">
      <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />

      <div className="flex items-center gap-2 shrink-0 cursor-pointer hover:opacity-80 transition-opacity group" onClick={onReset}>
        <div className="bg-white/10 p-2 rounded-lg group-hover:bg-white/20 transition-colors">
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        </div>
        <h1 className="text-xl font-bold tracking-tight hidden md:block select-none">Flashcards</h1>
      </div>
      
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

      <div className="relative shrink-0">
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-2 hover:bg-zinc-800 p-1.5 pl-2 pr-2 rounded-full transition-colors outline-none border border-transparent hover:border-zinc-700">
            <span className="text-sm font-bold hidden sm:block text-zinc-300">{username}</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-inner ${role === 'admin' ? 'bg-gradient-to-br from-red-500 to-red-700' : 'bg-gradient-to-br from-blue-500 to-blue-700'}`}>
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : username.charAt(0).toUpperCase()}
            </div>
            <ChevronDown className="w-4 h-4 text-zinc-400" />
        </button>
        
        {isMenuOpen && (
            <div className="absolute right-0 top-14 w-72 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 p-1 text-zinc-300 animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5">
                <div className="px-4 py-4 border-b border-zinc-800 bg-zinc-900/50 rounded-t-lg">
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-sm font-bold text-white truncate max-w-[150px]">{username}</p>
                        {role === 'admin' && <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20 font-bold tracking-wider">ADMIN</span>}
                    </div>
                </div>

                <div className="px-4 py-4">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-semibold text-blue-400 flex items-center gap-1.5"><BookOpen size={14} /> Tổng tiến độ</span>
                        <span className="text-xs font-bold text-white font-mono">{learnedCount}/{totalWords} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: `${percentage}%` }}></div>
                    </div>
                </div>

                <div className="h-px bg-zinc-800 my-1 mx-2"></div>

                <div className="p-1 space-y-0.5">
                    {role === 'admin' && (
                        <button onClick={() => router.push('/admin')} className="w-full text-left px-3 py-2.5 text-sm hover:bg-zinc-800 rounded-lg flex gap-3 items-center transition-colors text-red-400 font-bold">
                            <ShieldCheck className="w-4 h-4"/> Quản lý hệ thống
                        </button>
                    )}
                    <button onClick={triggerImport} disabled={isProcessing} className="w-full text-left px-3 py-2.5 text-sm hover:bg-zinc-800 rounded-lg flex gap-3 items-center transition-colors text-zinc-300 disabled:opacity-50">
                        <Upload className="w-4 h-4 text-zinc-500"/> {isProcessing ? "Đang xử lý..." : "Import dữ liệu"}
                    </button>
                    <button onClick={handleExportClick} disabled={isProcessing} className="w-full text-left px-3 py-2.5 text-sm hover:bg-zinc-800 rounded-lg flex gap-3 items-center transition-colors text-zinc-300 disabled:opacity-50">
                        <Download className="w-4 h-4 text-zinc-500"/> {isProcessing ? "Đang tải xuống..." : "Export dữ liệu"}
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