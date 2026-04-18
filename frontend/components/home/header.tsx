'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname  } from 'next/navigation';
import { api } from '../../lib/api';
import { LogOut, ChevronDown, Search, BookOpen, ShieldCheck, Loader2, KeyRound, X, Menu, Library, User, Check, Brain, Zap } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { srsApi } from '../../lib/srsApi';
import { FeatureHint } from '../onboarding/FeatureHint';
import { ONBOARDING_IDS } from '../onboarding/constants';
import { cn } from '../../lib/utils';

interface HeaderProps {
  onSearchChange: (term: string) => void;
  searchTerm: string;
  onReset: () => void;
  username: string;
  role?: string;
  onLogout: () => void;
  totalWords?: number;
  learnedCount?: number;
  currentMode: 'personal' | 'global';
  onModeChange: (mode: 'personal' | 'global') => void;
}

export function Header({ 
  onSearchChange, searchTerm, onReset, username, role, onLogout, 
  totalWords = 0, learnedCount = 0,
  currentMode, onModeChange 
}: HeaderProps) {
  
  const router = useRouter();
  const pathname = usePathname();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false); 
  // Smart Review
const [duePersonal, setDuePersonal] = useState(0);
const [dueSystem, setDueSystem] = useState(0);

const dueCount = duePersonal + dueSystem;

const [isSmartReviewExpanded, setIsSmartReviewExpanded] = useState(false);
useEffect(() => {
    // Dùng /srs/due làm nguồn duy nhất để badge luôn khớp với danh sách từ thực tế
    srsApi.getDueWords().then(data => {
        setDuePersonal(data.personal.length);
        setDueSystem(data.system.length);
    }).catch(() => {});
}, []);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false); 
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [quickLearnEnabled, setQuickLearnEnabled] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setQuickLearnEnabled(localStorage.getItem('quick_learn_mode') === 'true');
    }
  }, []);

  const toggleQuickLearn = () => {
    const newValue = !quickLearnEnabled;
    setQuickLearnEnabled(newValue);
    localStorage.setItem('quick_learn_mode', newValue ? 'true' : 'false');
  };
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passError, setPassError] = useState('');
  
  const percentage = totalWords > 0 ? Math.round((learnedCount / totalWords) * 100) : 0;

  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setPassError('');
      setIsProcessing(true);
      try {
          const res = await api.changePassword(oldPass, newPass);
          if (res.error) setPassError(res.error);
          else {
              alert("Password changed successfully! Please log in again.");
              onLogout(); 
          }
      } catch (err) { setPassError("Server connection error"); } 
      finally { setIsProcessing(false); }
  };

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
                  alert("Data imported successfully! Page will reload.");
                  window.location.reload();
              } catch (err) { alert("Invalid file or Server no response!"); }
          };
          reader.readAsText(file);
      } catch (error) { console.error(error); } 
      finally {
          setIsProcessing(false); setIsMenuOpen(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  return (
    <>
    <header className="flex items-center justify-between px-3 sm:px-6 py-1.5 sm:py-2 border-b border-zinc-800 bg-black sticky top-0 z-40 text-white shadow-sm relative h-12 sm:h-14">
      <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />

      {/* MOBILE SEARCH OVERLAY (Đã được làm lại) */}
      {isMobileSearchOpen && (
          <div className="absolute inset-0 bg-black z-50 flex items-center px-4 sm:px-6 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input 
                      type="text"
                      autoFocus
                      placeholder={currentMode === 'global' ? "Search in Oxford 5000..." : "Search vocabulary..."}
                      className="w-full pl-9 pr-9 py-2 sm:py-2.5 rounded-full border-2 border-blue-500 bg-zinc-900 focus:outline-none text-sm text-white shadow-lg shadow-blue-900/20"
                      value={searchTerm}
                      onChange={(e) => onSearchChange(e.target.value)}
                  />
                  {/* Nút X chỉ xuất hiện khi có text và chỉ xóa text */}
                  {searchTerm && (
                      <button 
                          onClick={() => onSearchChange('')} 
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                      >
                          <X className="w-4 h-4" />
                      </button>
                  )}
              </div>
              <button 
                  onClick={() => { setIsMobileSearchOpen(false); onSearchChange(''); }} 
                  className="text-sm font-bold text-zinc-400 hover:text-white transition-colors whitespace-nowrap"
              >
                  Cancel
              </button>
          </div>
      )}

      {/* --- 1. CỤM TRÁI: MENU & LOGO --- */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink min-w-0 overflow-hidden">            
        <FeatureHint 
            id={ONBOARDING_IDS.HOME_SYSTEM_WORDS}
            side="bottom"
            align="start"
            message={
                <div className="space-y-1.5 min-w-[200px]">
                    <p className="font-bold text-white flex items-center gap-1.5">
                        <Library className="w-4 h-4 text-400" /> 
                        Vocabulary is available
                    </p>
                    <p className="text-zinc-100 text-sm leading-snug font-normal">
                        Click here to switch to <span className="font-bold text-300">System</span>. The website has prepared the Oxford vocabulary set (A1-C2) for you to learn right away!
                    </p>
                </div>
            }
        >
            <div className="inline-block"> 
                {/* MENU HAMBURGER */}
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <button className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border transition-all outline-none shrink-0 ${
    pathname?.startsWith('/smart-review')
        ? 'bg-violet-950/30 border-violet-900/50 hover:bg-violet-900/50'
        : currentMode === 'global'
            ? 'bg-purple-950/30 border-purple-900/50 hover:bg-purple-900/50'
            : 'bg-blue-950/30 border-blue-900/50 hover:bg-blue-900/50'
}`}>
    <span className={`text-[10px] sm:text-xs font-bold whitespace-nowrap ${
        pathname?.startsWith('/smart-review')
            ? 'text-violet-300'
            : currentMode === 'global'
                ? 'text-purple-300'
                : 'text-blue-300'
    }`}>
        {pathname?.startsWith('/smart-review')
            ? 'Review'
            : currentMode === 'global'
                ? 'System'
                : 'Personal'
        }
    </span>
    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isSheetOpen ? 'rotate-180' : ''} ${
        pathname?.startsWith('/smart-review')
            ? 'text-violet-400'
            : currentMode === 'global'
                ? 'text-purple-400'
                : 'text-blue-400'
    }`} />
</button>
                    </SheetTrigger>
                    <SheetContent side="left" className="bg-zinc-950 border-r border-zinc-800 text-white w-[300px] z-[60]">
                        <SheetHeader className="mb-6 text-left">
                            <SheetTitle className="text-white text-xl font-bold flex items-center gap-2">Menu</SheetTitle>
                            <SheetDescription className="text-zinc-500">Choose vocabulary source to learn.</SheetDescription>
                        </SheetHeader>
                        <div className="space-y-2">
<button onClick={() => {
    if (pathname?.startsWith('/smart-review')) {
        router.push('/?tab=personal');
    } else {
        onModeChange('personal');
    }
    setIsSheetOpen(false);
}}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all border ${!pathname?.startsWith('/smart-review') && currentMode === 'personal' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' : 'bg-zinc-900/50 border-transparent hover:bg-zinc-900 text-zinc-400 hover:text-white'}`}>
    <User className="w-5 h-5 shrink-0" /><div className="text-left"><div className="text-sm font-bold">Personal vocabulary</div><div className="text-[10px] font-normal opacity-70"> {username}</div></div>
</button>
<button onClick={() => {
    if (pathname?.startsWith('/smart-review')) {
        router.push('/?tab=global');
    } else {
        onModeChange('global');
    }
    setIsSheetOpen(false);
}}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all border ${!pathname?.startsWith('/smart-review') && currentMode === 'global' ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/20' : 'bg-zinc-900/50 border-transparent hover:bg-zinc-900 text-zinc-400 hover:text-white'}`}>
    <Library className="w-5 h-5 shrink-0" /><div className="text-left"><div className="text-sm font-bold">Oxford 5000</div><div className="text-[10px] font-normal opacity-70">System vocabulary</div></div>
</button>

                            {/* Smart Review — accordion */}
<div className="pt-2 border-t border-zinc-800">
    {/* Dòng cha — chỉ xổ/đóng */}
    <button
    onClick={() => setIsSmartReviewExpanded(v => !v)}
    className={cn(
        'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all border',
        pathname?.startsWith('/smart-review')
            ? 'bg-violet-700 border-violet-500 text-white shadow-lg shadow-violet-900/20'
            : 'bg-violet-950/30 border-violet-900/50 hover:bg-violet-900/40'
    )}
>
        <div className="relative shrink-0">
            <Brain className="w-5 h-5 text-violet-400" />
            {dueCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {dueCount > 99 ? '99+' : dueCount}
                </span>
            )}
        </div>
        <div className="flex-1 text-left">
            <div className="text-sm font-bold text-violet-300">Smart Review</div>
            <div className="text-[10px] font-normal text-violet-400/70">
                {dueCount > 0 ? `${dueCount} word${dueCount > 1 ? 's' : ''} due today` : 'Spaced repetition'}
            </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-violet-400 transition-transform duration-200 ${isSmartReviewExpanded ? 'rotate-180' : ''}`} />
    </button>

    {/* Dropdown — personal & system */}
    {isSmartReviewExpanded && (
        <div className="mt-1 ml-4 space-y-1 border-l border-violet-900/40 pl-3">
            <button
    onClick={() => { router.push('/smart-review?tab=personal'); setIsSheetOpen(false); }}
    className={cn(
        'w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all hover:bg-violet-900/20 text-left',
        pathname === '/smart-review' && new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('tab') !== 'system'
            ? 'bg-violet-900/30'
            : ''
    )}
>
    <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-blue-400 shrink-0" />
        <span className="text-sm font-medium text-zinc-300">Personal</span>
    </div>
    {duePersonal > 0 && (
        <span className="text-[10px] px-1.5 py-0.5 bg-blue-900/50 text-blue-300 border border-blue-800/50 rounded-full font-semibold">
            {duePersonal}
        </span>
    )}
</button>
<button
    onClick={() => { router.push('/smart-review?tab=system'); setIsSheetOpen(false); }}
    className={cn(
        'w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all hover:bg-violet-900/20 text-left',
        pathname === '/smart-review' && new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('tab') === 'system'
            ? 'bg-violet-900/30'
            : ''
    )}
>
    <div className="flex items-center gap-2">
        <Library className="w-4 h-4 text-purple-400 shrink-0" />
        <span className="text-sm font-medium text-zinc-300">System (Oxford)</span>
    </div>
    {dueSystem > 0 && (
        <span className="text-[10px] px-1.5 py-0.5 bg-purple-900/50 text-purple-300 border border-purple-800/50 rounded-full font-semibold">
            {dueSystem}
        </span>
    )}
</button>
        </div>
    )}
</div>
                        </div>
                    </SheetContent>
                 </Sheet>
            </div>
        </FeatureHint>
        <div className="flex items-center gap-2 shrink-0 cursor-pointer hover:opacity-80 transition-opacity" onClick={onReset}>                         
           <div className="p-1 sm:p-1.5 rounded-md bg-white/10 text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
           </div>
            <h1 className="text-sm sm:text-lg font-black text-white whitespace-nowrap tracking-tight">
                   Better With Benjamin
           </h1>
        </div>
      </div>
      
      {/* --- 2. CỤM GIỮA: THANH TÌM KIẾM (Đã thêm nút X) --- */}
      <div className="flex justify-center items-center flex-1 px-2">
          <div className="relative hidden md:block w-full max-w-[220px] lg:max-w-[280px] transition-all">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input 
                type="text"
                placeholder={currentMode === 'global' ? "Search in Oxford..." : "Search..."}
                className="w-full pl-8 pr-8 py-1 sm:py-1.5 rounded-full border border-zinc-800 bg-zinc-900 focus:bg-zinc-800 focus:outline-none focus:border-blue-500 transition-all text-xs sm:text-sm text-white"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
            />
            {/* Nút X chỉ xuất hiện khi có text và chỉ xóa text */}
            {searchTerm && (
                <button 
                    onClick={() => onSearchChange('')} 
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-full transition-colors"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            )}
          </div>

          <button 
              onClick={() => setIsMobileSearchOpen(true)}
              className="md:hidden p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
          >
              <Search className="w-4 h-4" />
          </button>
      </div>

      <div className="flex items-center justify-end gap-2 sm:gap-3 flex-1">
         {/* AVATAR USER */}
         <div className="relative shrink-0">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-1.5 hover:bg-zinc-800 p-1 sm:pl-2 sm:pr-1.5 rounded-full transition-colors outline-none border border-transparent hover:border-zinc-700">
                <span className="text-xs sm:text-sm font-bold hidden sm:block text-zinc-300">{username}</span>
                <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] sm:text-xs shadow-inner ${role === 'admin' ? 'bg-gradient-to-br from-red-500 to-red-700' : 'bg-gradient-to-br from-blue-500 to-blue-700'}`}>
                    {isProcessing ? <Loader2 className="w-3 h-3 animate-spin"/> : username.charAt(0).toUpperCase()}
                </div>
                <ChevronDown className="w-3 h-3 text-zinc-400 hidden sm:block" />
            </button>
            
            {/* User Dropdown Box */}
            {isMenuOpen && (
                <div className="absolute right-0 top-10 sm:top-12 w-64 sm:w-72 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 p-1 text-zinc-300 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50 rounded-t-lg">
                        <div className="flex justify-between items-center mb-1">
                            <p className="text-sm font-bold text-white truncate max-w-[150px]">{username}</p>
                            {role === 'admin' && <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20 font-bold tracking-wider">ADMIN</span>}
                        </div>
                    </div>
                    
                    <div className="px-4 py-3">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-semibold text-blue-400 flex items-center gap-1.5"><BookOpen size={14} /> Progress Overview</span>
                            <span className="text-xs font-bold text-white font-mono">{learnedCount}/{totalWords} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                            <div className="bg-blue-600 h-full rounded-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                    </div>
                    
                    <div className="h-px bg-zinc-800 my-1 mx-2"></div>
                    
                    <div className="p-1 space-y-0.5">
                        {role === 'admin' && (
                            <button 
                                onClick={() => { 
                                    router.push('/admin'); 
                                    setIsMenuOpen(false); 
                                }} 
                                className="w-full text-left px-3 py-2.5 text-sm hover:bg-red-900/20 text-red-400 rounded-lg flex gap-3 items-center transition-colors font-bold mb-1 border border-transparent hover:border-red-900/50"
                            >
                                <ShieldCheck className="w-4 h-4"/> Admin Center
                            </button>
                        )}

                        <button
                            onClick={toggleQuickLearn}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-800 rounded-lg flex items-center justify-between transition-colors text-zinc-300"
                        >
                            <div className="flex items-center gap-3">
                                <Zap className={`w-4 h-4 transition-colors ${quickLearnEnabled ? 'text-amber-400' : 'text-zinc-500'}`} />
                                <span>Quick Learn</span>
                            </div>
                            <div className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${quickLearnEnabled ? 'bg-amber-500' : 'bg-zinc-700'}`}>
                                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${quickLearnEnabled ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
                            </div>
                        </button>
                        <button onClick={() => { setShowPassModal(true); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-800 rounded-lg flex gap-3 items-center transition-colors text-zinc-300">
                            <KeyRound className="w-4 h-4 text-zinc-500"/> Change Password
                        </button>
                        <button onClick={onLogout} className="w-full text-left px-3 py-2 text-sm hover:bg-red-950/30 text-red-500 rounded-lg flex gap-3 items-center transition-colors font-medium">
                            <LogOut className="w-4 h-4"/> Log Out
                        </button>
                    </div>
                </div>
            )}
            {isMenuOpen && <div className="fixed inset-0 z-30 bg-transparent" onClick={() => setIsMenuOpen(false)}></div>}
         </div>
      </div>
    </header>

    {/* MODAL ĐỔI MẬT KHẨU */}
    {showPassModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 relative">
                <button onClick={() => { setShowPassModal(false); setPassError(''); setOldPass(''); setNewPass(''); }} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
                <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2"><KeyRound className="w-5 h-5 text-blue-500"/> Change Password</h2>
                <p className="text-sm text-zinc-400 mb-6">Enter your old password to authenticate.</p>
                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div><label className="text-xs font-bold text-zinc-500 uppercase ml-1">Old Password</label><input type="password" required className="w-full mt-1 px-4 py-2.5 rounded-xl bg-black border border-zinc-800 text-white focus:border-blue-500 focus:outline-none" placeholder="••••••••" value={oldPass} onChange={e => setOldPass(e.target.value)} /></div>
                    <div><label className="text-xs font-bold text-zinc-500 uppercase ml-1">New Password</label><input type="password" required className="w-full mt-1 px-4 py-2.5 rounded-xl bg-black border border-zinc-800 text-white focus:border-blue-500 focus:outline-none" placeholder="••••••••" value={newPass} onChange={e => setNewPass(e.target.value)} /></div>
                    {passError && <div className="text-red-400 text-sm bg-red-950/30 p-3 rounded-lg border border-red-900/50 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>{passError}</div>}
                    <div className="pt-2 flex gap-3">
                        <button type="button" onClick={() => { setShowPassModal(false); setPassError(''); }} className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors">Cancel</button>
                        <button type="submit" disabled={isProcessing} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">{isProcessing && <Loader2 className="w-4 h-4 animate-spin"/>}Confirm</button>
                    </div>
                </form>
            </div>
        </div>
    )}
    </>
  );
}