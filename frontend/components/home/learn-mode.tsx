'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Flashcard } from '../flashcard'; 
import { ArrowLeft, CheckCircle2, XCircle, Keyboard, Layers, HelpCircle, RotateCcw, Check, X } from 'lucide-react';
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
  allWords, progress: initialProgress, total, isResetting, onNext, onReset, onExit, themeColor 
}: LearnModeProps) {
  
  const [mode, setMode] = useState<Mode>('flashcard');
  
  // State quản lý hàng chờ và từ hiện tại
  const [studyQueue, setStudyQueue] = useState<any[]>([]);
  const [localCurrentWord, setLocalCurrentWord] = useState<any | null>(null);
  
  // State cho Animation chuyển động mượt
  const [isAnimating, setIsAnimating] = useState(false);

  // State quản lý độ rộng khung hình (Lưu trong LocalStorage)
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<string>('500px'); // Mặc định 500px

  // State cho Quiz/Typing
  const [quizOptions, setQuizOptions] = useState<any[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [typingInput, setTypingInput] = useState('');
  const [typingStatus, setTypingStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');

  // --- 0. KHÔI PHỤC KÍCH THƯỚC KHUNG ---
  useEffect(() => {
    const savedWidth = localStorage.getItem('learnModeWidth');
    if (savedWidth) {
        setContainerWidth(savedWidth);
    }
  }, []);

  // Lưu kích thước khi người dùng thay đổi (sử dụng ResizeObserver hoặc đơn giản là sự kiện mouseup)
  const handleMouseUp = () => {
      if (containerRef.current) {
          const newWidth = `${containerRef.current.offsetWidth}px`;
          setContainerWidth(newWidth);
          localStorage.setItem('learnModeWidth', newWidth);
      }
  };

  // Thêm useRef ở đầu component cùng với các hooks khác
  const hasInitialized = useRef(false);

  // --- 1. KHỞI TẠO DANH SÁCH (SỬA LỖI DOUBLE CLICK) ---
  useEffect(() => {
      // Nếu đã init rồi và không phải đang reset thì bỏ qua để tránh xáo trộn lại
      if (hasInitialized.current && !isResetting) return;

      const unlearned = allWords.filter(w => !w.learned);
      
      if (unlearned.length > 0) {
          // TRƯỜNG HỢP 1: Có dữ liệu từ vựng (Load lần đầu hoặc sau khi Reset xong)
          const shuffled = unlearned.sort(() => Math.random() - 0.5);
          setStudyQueue(shuffled);
          setLocalCurrentWord(shuffled[0]);
          
          // QUAN TRỌNG: Chỉ khóa (hasInitialized = true) khi ĐÃ CÓ dữ liệu
          hasInitialized.current = true;
      } else if (isResetting) {
          // TRƯỜNG HỢP 2: Đang trong quá trình Reset (Dữ liệu chưa về kịp)
          // Chỉ xóa tạm màn hình, nhưng KHÔNG KHÓA hasInitialized (= false)
          // Để lát nữa khi dữ liệu về, code sẽ tự động chạy lại vào TRƯỜNG HỢP 1
          setStudyQueue([]);
          setLocalCurrentWord(null);
      }
  }, [allWords, isResetting]);

  // Reset cờ initialized khi thoát hoặc unmount để lần sau vào lại học mới
  useEffect(() => {
      return () => { hasInitialized.current = false; }
  }, []);

  // --- HÀM CHUYỂN TỪ (CÓ ANIMATION) ---
  const switchWord = (newWord: any | null) => {
    setIsAnimating(true); // Bắt đầu mờ đi
    
    // Đợi 300ms (khớp với duration css) rồi mới đổi dữ liệu
    setTimeout(() => {
        setLocalCurrentWord(newWord);
        resetModeState();
        setIsAnimating(false); // Hiện lại
    }, 70);
  };
  // --- HÀM XỬ LÝ KHI BẤM "HỌC LẠI TỪ ĐẦU" ---
  const handleRestart = () => {
      // Quan trọng: Đặt lại cờ này thành false để cho phép nạp dữ liệu mới
      hasInitialized.current = false; 
      
      // Xóa sạch trạng thái hiện tại
      setLocalCurrentWord(null);
      setStudyQueue([]);
      
      // Gọi hàm reset của cha (để reset DB)
      onReset();
  };
  // --- 2. XỬ LÝ: ĐÃ THUỘC (Nút Xanh) ---
  const handleKnown = useCallback(() => {
      if (!localCurrentWord) return;

      onNext(); // Báo cho parent update DB

      const newQueue = studyQueue.filter(w => w.id !== localCurrentWord.id);
      setStudyQueue(newQueue);

      const nextWord = newQueue.length > 0 ? newQueue[0] : null;
      switchWord(nextWord);

  }, [localCurrentWord, studyQueue, onNext]);

  // --- 3. XỬ LÝ: CHƯA THUỘC (Nút Đỏ) ---
  const handleUnknown = useCallback(() => {
      if (!localCurrentWord) return;

      // Đẩy xuống cuối hàng chờ
      const remaining = studyQueue.filter(w => w.id !== localCurrentWord.id);
      const newQueue = [...remaining, localCurrentWord];
      
      setStudyQueue(newQueue);

      const nextWord = newQueue.length > 0 ? newQueue[0] : null;
      switchWord(nextWord);
      
  }, [localCurrentWord, studyQueue]);

  const resetModeState = () => {
      setSelectedAnswer(null);
      setTypingInput('');
      setTypingStatus('idle');
  }

  // --- PHÍM TẮT ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode === 'typing' && typingStatus === 'idle') return;
      if (isAnimating) return; // Không bắt phím khi đang chuyển động

      if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleKnown(); 
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleUnknown();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKnown, handleUnknown, mode, typingStatus, isAnimating]);

  // --- LOGIC QUIZ ---
  useEffect(() => {
    if (mode === 'quiz' && localCurrentWord) {
      const correct = localCurrentWord;
      const others = allWords.filter(w => w.id !== correct.id);
      const distractors = others.sort(() => 0.5 - Math.random()).slice(0, 3);
      const options = [correct, ...distractors].sort(() => 0.5 - Math.random());
      setQuizOptions(options);
      setSelectedAnswer(null);
    }
  }, [localCurrentWord, mode, allWords]);

  const handleQuizAnswer = (wordId: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(wordId);
    if (wordId === localCurrentWord.id) {
        setTimeout(() => handleKnown(), 800); 
    } else {
        setTimeout(() => handleUnknown(), 1500); 
    }
  };

  // --- LOGIC TYPING ---
  const handleTypingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typingStatus !== 'idle') return;
    if (typingInput.trim().toLowerCase() === localCurrentWord.english.trim().toLowerCase()) {
      setTypingStatus('correct');
      setTimeout(() => handleKnown(), 800);
    } else {
      setTypingStatus('wrong');
    }
  };

  // --- TÍNH TOÁN THỐNG KÊ ---
  const totalCount = allWords.length; // Tổng số từ trong bộ
  const remainingCount = studyQueue.length; // Số từ còn trong hàng chờ (chưa thuộc)
  // Logic: Số đã thuộc = Tổng - Số còn lại trong hàng chờ (Lưu ý: Logic này đúng trong phiên học hiện tại)
  // Nếu muốn chính xác tuyệt đối với DB thì cần dùng prop allWords lọc field learned
  const learnedCountDB = allWords.filter(w => w.learned).length;
  // Để hiển thị realtime khi user bấm "Đã thuộc" trong phiên này mà chưa sync DB kịp:
  // Ta có thể dùng: Tổng - Remaining (nếu giả định studyQueue chứa tất cả unlearned)
  const displayLearned = totalCount - remainingCount; 
  const displayUnlearned = remainingCount;

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-black text-white overflow-hidden relative" onMouseUp={handleMouseUp}>
      
      {/* 1. TOP BAR (Giữ nguyên) */}
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
         <div className="w-[80px]"></div>
      </div>

      {/* 2. BODY CHÍNH - ĐÃ SỬA CANH GIỮA DỌC */}
      {/* Thay đổi: justify-start -> justify-center */}
      <div className="flex-1 w-full flex flex-col items-center justify-center p-4 min-h-0 overflow-y-auto no-scrollbar">
        
        {/* Wrapper cho nội dung chính để đảm bảo khi màn hình nhỏ vẫn scroll được */}
        <div className="flex flex-col items-center w-full my-auto">

            {/* THANH THỐNG KÊ */}
            <div className="w-full max-w-2xl flex justify-between items-center mb-6 px-4 py-2 bg-zinc-900/50 rounded-full border border-zinc-800/50 text-sm">
                <div className="flex gap-1">
                    <span className="text-zinc-500">Đã thuộc:</span>
                    <span className="font-bold text-green-500">{displayLearned}/{totalCount}</span>
                </div>
                <div className="w-px h-4 bg-zinc-800"></div>
                <div className="flex gap-1">
                    <span className="text-zinc-500">Chưa thuộc:</span>
                    <span className="font-bold text-red-400">{displayUnlearned}/{totalCount}</span>
                </div>
            </div>

            {/* CONTAINER RESIZABLE */}
            <div 
                ref={containerRef}
                className="flex flex-col relative transition-all duration-0"
                style={{ 
                    width: containerWidth, 
                    maxWidth: '95vw', 
                    minWidth: '320px',
                    resize: 'horizontal', 
                    overflow: 'hidden',
                    margin: '0 auto' 
                }}
            >
                
                {isResetting ? (
                    <div className="h-[400px] flex flex-col items-center justify-center animate-pulse border border-zinc-800 rounded-3xl bg-zinc-900/30">
                        <RotateCcw className="w-10 h-10 animate-spin text-zinc-600 mb-3"/>
                        <p className="text-base text-zinc-500 font-medium">Đang tải dữ liệu...</p>
                    </div>
                ) : localCurrentWord ? (
                <div className={cn(
                    "w-full flex flex-col transition-all duration-300 ease-in-out",
                    isAnimating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
                )}>
                    
                    {/* MODE 1: FLASHCARD */}
                    {mode === 'flashcard' && (
                        <div className="w-full h-full flex flex-col justify-center">
                            <Flashcard 
                                word={localCurrentWord} 
                                className="text-white w-full shadow-2xl" // Thêm shadow cho đẹp
                                color={themeColor} 
                            />
                        </div>
                    )}

                    {/* MODE 2: QUIZ */}
                    {mode === 'quiz' && (
                    <div className="flex flex-col justify-center w-full">
                        <div className="bg-zinc-900 border-2 rounded-3xl shadow-sm text-center mb-6 flex flex-col justify-center items-center p-8 min-h-[250px]"
                             style={{ borderColor: themeColor || '#3f3f46' }}
                        >
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Định nghĩa</p>
                            <h2 className="text-xl md:text-2xl font-normal leading-relaxed text-white break-words">
                                "{localCurrentWord.definition}"
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {quizOptions.map((opt) => {
                                const isSelected = selectedAnswer === opt.id;
                                const isCorrect = opt.id === localCurrentWord.id;
                                let style = "border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300";
                                if (selectedAnswer) {
                                    if (isCorrect) style = "border-green-900 bg-green-950/40 text-green-400 font-bold ring-1 ring-green-900";
                                    else if (isSelected) style = "border-red-900 bg-red-950/40 text-red-400 opacity-80";
                                    else style = "opacity-30 grayscale border-transparent";
                                }
                                return (
                                    <button key={opt.id} 
                                        className={cn("h-14 px-4 rounded-2xl border text-base font-medium transition-all shadow-sm flex items-center justify-center text-center active:scale-[0.98]", style)}
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
                    <div className="flex flex-col justify-center w-full">
                        <div className="bg-zinc-900 border-2 rounded-3xl shadow-sm text-center mb-6 flex flex-col justify-center items-center p-8 min-h-[250px]"
                             style={{ borderColor: themeColor || '#3f3f46' }}
                        >
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Gõ từ tiếng Anh</p>
                            <h2 className="text-xl md:text-2xl font-normal leading-relaxed text-white mb-4 break-words">
                                "{localCurrentWord.definition}"
                            </h2>
                            {localCurrentWord.type && localCurrentWord.type.length > 0 && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                                    {Array.isArray(localCurrentWord.type) ? localCurrentWord.type.join(', ') : localCurrentWord.type}
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
                                <div className="grid grid-cols-2 gap-3">
                                    <Button size="lg" onClick={handleUnknown} className="h-14 text-base font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl">Bỏ qua</Button>
                                    <Button size="lg" onClick={handleTypingSubmit} className="h-14 text-base font-bold bg-white text-black hover:bg-zinc-200 rounded-2xl">Kiểm tra</Button>
                                </div>
                            )}
                            {typingStatus === 'wrong' && (
                                <div className="h-14 flex items-center justify-between px-4 bg-red-950/20 rounded-2xl border border-red-900/50 animate-in slide-in-from-bottom-2 cursor-pointer hover:bg-red-950/30 transition-colors" onClick={handleUnknown}>
                                    <div className="flex items-baseline gap-2 overflow-hidden">
                                        <span className="text-xs text-red-400/70 shrink-0">Đáp án:</span>
                                        <span className="text-lg font-bold text-red-400 truncate">{localCurrentWord.english}</span>
                                    </div>
                                    <span className="text-xs text-red-400 font-bold bg-red-950/50 px-2 py-1 rounded">Tiếp tục</span>
                                </div>
                            )}
                        </div>
                    </div>
                    )}
                    
                    {/* 3. NÚT ĐIỀU KHIỂN */}
                    <div className="shrink-0 mt-6 pt-2 border-t border-zinc-900/50 grid grid-cols-2 gap-3 w-full">
                        <Button 
                            onClick={handleUnknown}
                            className="h-16 rounded-2xl text-lg font-bold shadow-sm transition-all active:scale-[0.98] border border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                            disabled={isAnimating}
                        >
                            <X className="w-5 h-5 mr-2"/> Chưa thuộc
                        </Button>

                        <Button 
                            onClick={handleKnown}
                            className="h-16 rounded-2xl text-lg font-bold shadow-xl transition-all active:scale-[0.98] border-none hover:opacity-90 text-white"
                            style={{ backgroundColor: themeColor || '#2563eb' }}
                            disabled={isAnimating}
                        >
                            Đã thuộc <Check className="ml-2 w-5 h-5"/>
                        </Button>
                    </div>

                </div>
                ) : (
                <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in-95 py-20">
                    <div className="w-24 h-24 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <span className="text-5xl">🎉</span>
                    </div>
                    <h3 className="text-2xl font-bold mb-2 text-white">Hoàn thành xuất sắc!</h3>
                    <p className="text-zinc-500 mb-6 text-center max-w-xs">Bạn đã thuộc hết tất cả các từ trong nhóm này.</p>
                    <Button onClick={handleRestart} size="lg" className="rounded-full px-10 h-12 text-base font-bold shadow-lg bg-white text-black hover:bg-zinc-200">Học lại từ đầu</Button>
                </div>
                )}
                
                {/* ICON KÉO GIÃN */}
                <div className="absolute bottom-1 right-1 pointer-events-none opacity-50">
                   <div className="w-3 h-3 border-r-2 border-b-2 border-zinc-600 rounded-br-sm"></div>
                </div>

            </div> 
        </div>
      </div>
    </div>
  );
}