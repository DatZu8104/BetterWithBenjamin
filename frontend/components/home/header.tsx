'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
// ✅ Import thêm icon cho Menu
import { Upload, Download, LogOut, ChevronDown, Search, BookOpen, ShieldCheck, Loader2, KeyRound, X, Menu, Library, User } from 'lucide-react';
// ✅ Import Sheet components (Sidebar)
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

interface HeaderProps {
  onSearchChange: (term: string) => void;
  searchTerm: string;
  onReset: () => void;
  username: string;
  role?: string;
  onLogout: () => void;
  totalWords?: number;
  learnedCount?: number;
  // ✅ Props mới để xử lý chế độ xem
  currentMode: 'personal' | 'global';
  onModeChange: (mode: 'personal' | 'global') => void;
}

export function Header({ 
  onSearchChange, searchTerm, onReset, username, role, onLogout, 
  totalWords = 0, learnedCount = 0,
  currentMode, onModeChange 
}: HeaderProps) {
  
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false); // State cho Sidebar
  
  // --- STATE CHO ĐỔI MẬT KHẨU ---
  const [showPassModal, setShowPassModal] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passError, setPassError] = useState('');
  
  const percentage = totalWords > 0 ? Math.round((learnedCount / totalWords) * 100) : 0;

  // --- XỬ LÝ ĐỔI MẬT KHẨU ---
  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setPassError('');
      setIsProcessing(true);

      try {
          const res = await api.changePassword(oldPass, newPass);
          
          if (res.error) {
              setPassError(res.error);
          } else {
              alert("✅ Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
              onLogout(); 
          }
      } catch (err) {
          setPassError("Lỗi kết nối Server");
      } finally {
          setIsProcessing(false);
      }
  };

  // --- XỬ LÝ EXPORT ---
  const handleExportClick = async () => {
    try {
        setIsProcessing(true);
        const data = await api.syncData();
        if (!data) return alert("Không lấy được dữ liệu!");

        const allWords = data.words || [];
        const exportData = {
            exportedAt: new Date().toISOString(),
            groups: Array.from(new Set(allWords.map((w: any) => w.group))),
            words: allWords.map((w: any) => ({
                id: w.id || w._id,
                english: w.english,
                definition: w.definition,
                type: w.type,
                group: w.group
            })),
            learned: allWords.filter((w: any) => w.learned).map((w: any) => w.id || w._id)
        };

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
    } finally {
        setIsProcessing(false);
    }
  };

  // --- XỬ LÝ IMPORT ---
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
                  await api.importData(jsonData);
                  alert("Nhập dữ liệu thành công! Trang sẽ tải lại.");
                  window.location.reload();
              } catch (err) {
                  alert("File lỗi hoặc Server không phản hồi!");
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
    <>
    <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-black sticky top-0 z-40 text-white shadow-sm">
      <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />

      <div className="flex items-center gap-3">
        {/* ✅ HAMBURGER MENU (SIDEBAR) */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
                <button className="p-2 -ml-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors outline-none">
                    <Menu className="w-6 h-6" />
                </button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-zinc-950 border-r border-zinc-800 text-white w-[300px] z-[60]">
                <SheetHeader className="mb-6 text-left">
                    <SheetTitle className="text-white text-xl font-bold flex items-center gap-2">
                        Menu Học Tập
                    </SheetTitle>
                    <SheetDescription className="text-zinc-500">
                        Chọn nguồn từ vựng bạn muốn học.
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-2">
                    <button 
                        onClick={() => { onModeChange('personal'); setIsSheetOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all border ${currentMode === 'personal' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' : 'bg-zinc-900/50 border-transparent hover:bg-zinc-900 text-zinc-400 hover:text-white'}`}
                    >
                        <User className="w-5 h-5 shrink-0" />
                        <div className="text-left">
                            <div className="text-sm font-bold">Từ vựng cá nhân</div>
                            <div className="text-[10px] font-normal opacity-70">Của {username}</div>
                        </div>
                    </button>

                    <button 
                        onClick={() => { onModeChange('global'); setIsSheetOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all border ${currentMode === 'global' ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/20' : 'bg-zinc-900/50 border-transparent hover:bg-zinc-900 text-zinc-400 hover:text-white'}`}
                    >
                        <Library className="w-5 h-5 shrink-0" />
                        <div className="text-left">
                            <div className="text-sm font-bold">Oxford 3000</div>
                            <div className="text-[10px] font-normal opacity-70">Từ vựng hệ thống</div>
                        </div>
                    </button>
                </div>

                <div className="absolute bottom-6 left-6 right-6">
                    <div className="p-4 bg-zinc-900/80 rounded-xl border border-zinc-800">
                        <p className="text-[10px] text-zinc-500 mb-2 font-bold uppercase tracking-wider">Trạng thái hiện tại</p>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-zinc-400">Chế độ:</span>
                            <span className={`font-bold ${currentMode === 'global' ? 'text-purple-400' : 'text-blue-400'}`}>
                                {currentMode === 'global' ? 'Thư viện' : 'Cá nhân'}
                            </span>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>

        {/* LOGO & RESET */}
        <div className="flex items-center gap-2 shrink-0 cursor-pointer hover:opacity-80 transition-opacity group" onClick={onReset}>
           <div className={`p-2 rounded-lg transition-colors ${currentMode === 'global' ? 'bg-purple-500/10 text-purple-500' : 'bg-white/10 text-white'}`}>
                {currentMode === 'global' ? <Library size={24} /> : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                )}
           </div>
           <h1 className="text-xl font-bold tracking-tight hidden md:block select-none">
               {currentMode === 'global' ? 'Oxford Library' : 'Better With Benjamin'}
           </h1>
        </div>
      </div>
      
      {/* SEARCH BAR */}
      <div className="flex-1 max-w-xl mx-4 relative hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input 
            type="text"
            placeholder={currentMode === 'global' ? "Tìm trong Oxford 3000..." : "Tìm kiếm từ vựng..."}
            className="w-full pl-9 pr-4 py-2 rounded-full border border-zinc-800 bg-zinc-900 focus:bg-zinc-800 focus:outline-none focus:border-blue-500 transition-all text-sm text-white"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* USER DROPDOWN */}
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
                    
                    <button onClick={() => { setShowPassModal(true); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2.5 text-sm hover:bg-zinc-800 rounded-lg flex gap-3 items-center transition-colors text-zinc-300">
                        <KeyRound className="w-4 h-4 text-zinc-500"/> Đổi mật khẩu
                    </button>

                    <button onClick={triggerImport} disabled={isProcessing} className="w-full text-left px-3 py-2.5 text-sm hover:bg-zinc-800 rounded-lg flex gap-3 items-center transition-colors text-zinc-300 disabled:opacity-50">
                        <Upload className="w-4 h-4 text-zinc-500"/> Import dữ liệu
                    </button>
                    <button onClick={handleExportClick} disabled={isProcessing} className="w-full text-left px-3 py-2.5 text-sm hover:bg-zinc-800 rounded-lg flex gap-3 items-center transition-colors text-zinc-300 disabled:opacity-50">
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
        
        {isMenuOpen && <div className="fixed inset-0 z-30 bg-transparent" onClick={() => setIsMenuOpen(false)}></div>}
      </div>
    </header>

    {/* MODAL ĐỔI MẬT KHẨU */}
    {showPassModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 relative">
                <button 
                    onClick={() => { setShowPassModal(false); setPassError(''); setOldPass(''); setNewPass(''); }}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>
                
                <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-blue-500"/> Đổi mật khẩu
                </h2>
                <p className="text-sm text-zinc-400 mb-6">Nhập mật khẩu cũ để xác thực.</p>

                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Mật khẩu cũ</label>
                        <input 
                            type="password" 
                            required 
                            className="w-full mt-1 px-4 py-2.5 rounded-xl bg-black border border-zinc-800 text-white focus:border-blue-500 focus:outline-none"
                            placeholder="••••••••"
                            value={oldPass}
                            onChange={e => setOldPass(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Mật khẩu mới</label>
                        <input 
                            type="password" 
                            required 
                            className="w-full mt-1 px-4 py-2.5 rounded-xl bg-black border border-zinc-800 text-white focus:border-blue-500 focus:outline-none"
                            placeholder="••••••••"
                            value={newPass}
                            onChange={e => setNewPass(e.target.value)}
                        />
                    </div>

                    {passError && (
                        <div className="text-red-400 text-sm bg-red-950/30 p-3 rounded-lg border border-red-900/50 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            {passError}
                        </div>
                    )}

                    <div className="pt-2 flex gap-3">
                        <button 
                            type="button"
                            onClick={() => { setShowPassModal(false); setPassError(''); }}
                            className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors"
                        >
                            Hủy bỏ
                        </button>
                        <button 
                            type="submit"
                            disabled={isProcessing}
                            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isProcessing && <Loader2 className="w-4 h-4 animate-spin"/>}
                            Xác nhận
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )}
    </>
  );
}