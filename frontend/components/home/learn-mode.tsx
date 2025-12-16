'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Flashcard } from '../flashcard'; 
import { ArrowLeft, CheckCircle2, XCircle, Keyboard, Layers, HelpCircle, RotateCcw, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LearnModeProps {
  currentWord: any;
  allWords: any[];
  progress: number;
  total: number;
  isResetting: boolean;
  onNext: () => void;
  onReset: () => void;
  onExit: () => void;
  themeColor?: string;
}

type Mode = 'flashcard' | 'quiz' | 'typing';

export function LearnModeView({ 
  currentWord, allWords, progress, total, isResetting, onNext, onReset, onExit, themeColor 
}: LearnModeProps) {
  
  const [mode, setMode] = useState<Mode>('flashcard');
  const [quizOptions, setQuizOptions] = useState<any[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [typingInput, setTypingInput] = useState('');
  const [typingStatus, setTypingStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');

  // --- LOGIC CHUYỂN TỪ ---
  const handleNext = useCallback(() => {
      onNext();
  }, [onNext]);

  // --- PHÍM TẮT ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode === 'typing' && typingStatus === 'idle') return;
      if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, mode, typingStatus]);

  // --- LOGIC QUIZ ---
  useEffect(() => {
    if (mode === 'quiz' && currentWord) {
      const correct = currentWord;
      const others = allWords.filter(w => w.id !== correct.id);
      const distractors = others.sort(() => 0.5 - Math.random()).slice(0, 3);
      const options = [correct, ...distractors].sort(() => 0.5 - Math.random());
      setQuizOptions(options);
      setSelectedAnswer(null);
    }
  }, [currentWord, mode, allWords]);

  const handleQuizAnswer = (wordId: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(wordId);
    if (wordId === currentWord.id) setTimeout(() => handleNext(), 800);
  };

  // --- LOGIC TYPING ---
  useEffect(() => {
    if (mode === 'typing') {
      setTypingInput('');
      setTypingStatus('idle');
    }
  }, [currentWord, mode]);

  const handleTypingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typingStatus !== 'idle') return;
    if (typingInput.trim().toLowerCase() === currentWord.english.trim().toLowerCase()) {
      setTypingStatus('correct');
      setTimeout(() => handleNext(), 800);
    } else {
      setTypingStatus('wrong');
    }
  };

  // --- RENDER ---
  return (
    <div className="h-[100dvh] w-full flex flex-col bg-black text-white overflow-hidden relative">
      
      {/* 1. TOP BAR */}
      <div className="shrink-0 h-14 flex justify-between items-center px-4 border-b border-zinc-800 bg-black z-20 gap-4">
         <Button variant="ghost" size="sm" onClick={onExit} className="h-9 -ml-2 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors">
           <ArrowLeft className="w-5 h-5 mr-2"/> <span className="font-medium">Thoát</span>
         </Button>

         {/* Mode Selector */}
         <div className="flex-1 flex justify-center max-w-xs">
            <div className="bg-zinc-900 p-1 rounded-lg flex w-full border border-zinc-800">
                {[
                    { id: 'flashcard', icon: Layers, label: 'Thẻ' },
                    { id: 'quiz', icon: HelpCircle, label: 'Quiz' },
                    { id: 'typing', icon: Keyboard, label: 'Gõ' }
                ].map((item) => (
                    <button 
                    key={item.id}
                    onClick={() => setMode(item.id as Mode)}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-all outline-none",
                        mode === item.id 
                        ? "bg-zinc-800 text-white shadow-sm ring-1 ring-zinc-700" 
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                    )}
                    >
                    <item.icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{item.label}</span>
                    </button>
                ))}
            </div>
         </div>

         <div className="shrink-0 text-xs font-mono font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full min-w-[60px] text-center"
              style={{ color: themeColor || 'white', borderColor: themeColor ? `${themeColor}40` : '#27272a' }}>
            {progress} / {total}
         </div>
      </div>

      {/* 2. BODY CHÍNH */}
      <div className="flex-1 w-full max-w-lg mx-auto p-4 flex flex-col min-h-0 relative">
        
        {/* NỘI DUNG HỌC */}
        <div className="flex-1 w-full flex flex-col min-h-0 overflow-y-auto no-scrollbar pb-4">
            
            {isResetting ? (
                <div className="flex-1 flex flex-col items-center justify-center animate-pulse">
                    <RotateCcw className="w-10 h-10 animate-spin text-zinc-600 mb-3"/>
                    <p className="text-base text-zinc-500 font-medium">Đang trộn thẻ...</p>
                </div>
            ) : currentWord ? (
            <div className="w-full h-full flex flex-col animate-in zoom-in-95 fade-in duration-300">
                
                {/* MODE 1: FLASHCARD - Dùng Flex Grow để thẻ tự giãn */}
                {mode === 'flashcard' && (
                    <div className="flex-1 flex flex-col justify-center items-center min-h-0 w-full">
                        <div className="w-full h-full flex flex-col justify-center px-2 sm:px-0">
                            {/* ✅ Flashcard đã tự xử lý chiều rộng (w-full max-w-3xl) 
                                ✅ min-h-0 giúp nó không bị đẩy chiều cao lên quá mức
                            */}
                            <Flashcard 
                                word={currentWord} 
                                className="text-white"
                                color={themeColor} 
                            />
                        </div>
                    </div>
                )}

                {/* MODE 2: QUIZ */}
                {mode === 'quiz' && (
                <div className="flex-1 flex flex-col justify-center">
                    <div className="bg-zinc-900 border-2 rounded-3xl shadow-sm text-center mb-6 flex flex-col justify-center items-center p-8 flex-1 min-h-[250px]"
                         style={{ borderColor: themeColor || '#3f3f46' }}
                    >
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Định nghĩa</p>
                        <h2 className="text-xl md:text-3xl font-bold leading-tight text-white break-words">
                            "{currentWord.definition}"
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        {quizOptions.map((opt) => {
                            const isSelected = selectedAnswer === opt.id;
                            const isCorrect = opt.id === currentWord.id;
                            let style = "border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300";
                            if (selectedAnswer) {
                                if (isCorrect) style = "border-green-900 bg-green-950/40 text-green-400 font-bold ring-1 ring-green-900";
                                else if (isSelected) style = "border-red-900 bg-red-950/40 text-red-400 opacity-80";
                                else style = "opacity-30 grayscale border-transparent";
                            }
                            return (
                                <button key={opt.id} 
                                    className={cn("h-16 px-4 rounded-2xl border text-base font-medium transition-all shadow-sm flex items-center justify-center text-center active:scale-[0.98]", style)}
                                    onClick={() => handleQuizAnswer(opt.id)} disabled={!!selectedAnswer}>
                                    <span className="truncate w-full">{opt.english}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
                )}

                {/* MODE 3: TYPING */}
                {mode === 'typing' && (
                <div className="flex-1 flex flex-col justify-center">
                    <div className="bg-zinc-900 border-2 rounded-3xl shadow-sm text-center mb-6 flex flex-col justify-center items-center p-8 flex-1 min-h-[250px]"
                         style={{ borderColor: themeColor || '#3f3f46' }}
                    >
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Gõ từ tiếng Anh</p>
                        <h2 className="text-xl md:text-3xl font-bold leading-tight text-white mb-4 break-words">"{currentWord.definition}"</h2>
                        {currentWord.type.length > 0 && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                                {currentWord.type.join(', ')}
                            </span>
                        )}
                    </div>
                    <div>
                        <form onSubmit={handleTypingSubmit} className="relative w-full mb-3">
                            <Input autoFocus placeholder="Nhập từ..." 
                                className={cn("h-16 text-xl text-center rounded-2xl border-2 bg-black text-white placeholder:text-zinc-700 shadow-sm transition-all pr-12 focus:border-zinc-600 border-zinc-800 focus-visible:ring-0",
                                    typingStatus === 'correct' && "border-green-800 text-green-500 bg-green-950/20",
                                    typingStatus === 'wrong' && "border-red-800 text-red-500 bg-red-950/20"
                                )}
                                value={typingInput} onChange={(e) => { setTypingInput(e.target.value); if(typingStatus === 'wrong') setTypingStatus('idle'); }}
                                disabled={typingStatus === 'correct'}
                            />
                            <div className="absolute right-4 top-5">
                                {typingStatus === 'correct' && <CheckCircle2 className="text-green-500 w-6 h-6 animate-in zoom-in"/>}
                                {typingStatus === 'wrong' && <XCircle className="text-red-500 w-6 h-6 animate-in zoom-in"/>}
                            </div>
                        </form>
                        {typingStatus === 'idle' && (
                            <Button size="lg" onClick={handleTypingSubmit} className="w-full h-14 text-lg font-bold bg-white text-black hover:bg-zinc-200 rounded-2xl shadow-lg">Kiểm tra</Button>
                        )}
                        {typingStatus === 'wrong' && (
                            <div className="h-14 flex items-center justify-between px-4 bg-red-950/20 rounded-2xl border border-red-900/50 animate-in slide-in-from-bottom-2">
                                <div className="flex items-baseline gap-2 overflow-hidden">
                                    <span className="text-xs text-red-400/70 shrink-0">Đáp án:</span>
                                    <span className="text-lg font-bold text-red-400 truncate">{currentWord.english}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                )}

            </div>
            ) : (
            <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in-95">
                <div className="w-24 h-24 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <span className="text-5xl">🎉</span>
                </div>
                <h3 className="text-2xl font-bold mb-2 text-white">Hoàn thành!</h3>
                <Button onClick={onReset} size="lg" className="rounded-full px-10 h-12 text-base font-bold shadow-lg bg-white text-black hover:bg-zinc-200">Học lại từ đầu</Button>
            </div>
            )}
        </div>

        {/* 3. NÚT CHUYỂN TỪ (DÀI HẾT CỠ, NẰM DƯỚI) */}
        {currentWord && (
            <div className="shrink-0 mt-4 pt-2 border-t border-zinc-900/50">
                <Button 
                    onClick={handleNext}
                    className="w-full h-16 rounded-2xl text-xl font-bold shadow-xl transition-all active:scale-[0.98] border-none hover:opacity-90"
                    style={{ backgroundColor: themeColor || '#2563eb', color: 'white' }}
                >
                    Tiếp theo <span className="ml-2 text-white/50 text-sm font-normal">(Enter)</span> <ChevronRight className="ml-1 w-6 h-6"/>
                </Button>
            </div>
        )}

      </div>
    </div>
  );
}