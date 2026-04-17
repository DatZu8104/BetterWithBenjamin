'use client';
import { api } from '../../lib/api';
import { srsApi } from '../../lib/srsApi';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Flashcard } from '../flashcard'; 
import { ArrowLeft, CheckCircle2, XCircle, Keyboard, Layers, HelpCircle, RotateCcw, Check, X, ChevronLeft, ChevronRight, Volume2, MousePointerClick, Hand, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { FeatureHint } from '../onboarding/FeatureHint';
import { ONBOARDING_IDS } from '../onboarding/constants';
import { VocabChatbot } from './vocab-chatbot';

interface LearnModeProps {
  currentWord?: any; 
  allWords: any[]; 
  progress: number;
  total: number;
  isResetting: boolean;
  onNext: (wordId: string, isKnown: boolean) => void;
  onReset: () => void;
  onExit: () => void;
  themeColor?: string;
}

type Mode = 'flashcard' | 'quiz' | 'typing';

export function LearnModeView({ 
  allWords, progress: initialProgress, total, isResetting, onNext, onReset, onExit, themeColor 
}: LearnModeProps) {
  
  const [mode, setMode] = useState<Mode>('flashcard');
  const [studyQueue, setStudyQueue] = useState<any[]>([]);
  const [localCurrentWord, setLocalCurrentWord] = useState<any | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [quizOptions, setQuizOptions] = useState<any[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [typingInput, setTypingInput] = useState('');
  const [typingStatus, setTypingStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  
  const hasInitialized = useRef(false);

  const getActual = (w: any) => w?.wordId || w || {};
  const getWordText = (w: any) => getActual(w).word || getActual(w).english || "";
  const getWordDef = (w: any) => getActual(w).definition || getActual(w).definitions?.[0]?.definition || "No definition";
  const getWordId = (w: any) => w?._id || w?.id || w?.savedWordId;
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<'horizontal' | 'vertical' | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const [volume, setVolume] = useState<number>(1);

  const speakWord = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google'));
    if (preferredVoice) utterance.voice = preferredVoice;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
      if (hasInitialized.current && !isResetting) return;
      
      let pendingWords = allWords.filter(w => w.isMastered !== true && w.learned !== true);
      
      if (pendingWords.length === 0 && allWords.length > 0) {
          pendingWords = [...allWords];
      }
      
      if (pendingWords.length > 0) {
          const shuffled = [...pendingWords].sort(() => Math.random() - 0.5);
          setStudyQueue(shuffled);
          setLocalCurrentWord(shuffled[0]);
          hasInitialized.current = true;
      } else if (isResetting) {
          setStudyQueue([]);
          setLocalCurrentWord(null);
      }
  }, [allWords, isResetting]);

  useEffect(() => { return () => { hasInitialized.current = false; } }, []);

  const switchWord = (newWord: any | null) => {
    setIsAnimating(true); 
    setSwipeOffset(0); 
    setTimeout(() => {
        setLocalCurrentWord(newWord);
        resetModeState();
        setIsAnimating(false);
    }, 100);
  };

  const handleRestart = () => {
    const folderId = allWords[0]?.folderId; 
    if (folderId) {
        try {
            if (typeof api.resetFolderProgress !== 'function') {
                alert("ERROR: resetFolderProgress not found in api.ts!");
            } else {
                api.resetFolderProgress(folderId).catch(err => alert("Backend error: " + err.message));
            }
        } catch (e) { console.error(e); }
    }
    
    hasInitialized.current = false; 
    setLocalCurrentWord(null);
    setStudyQueue([]);
    onReset(); 
  };

  const handleKnown = useCallback(() => {
    if (!localCurrentWord) return;
    const currentId = getWordId(localCurrentWord);

    if (localCurrentWord.savedWordId) {
        api.updateMasterStatus(localCurrentWord.savedWordId, true).catch(console.error);
    } else {
        api.updateWord(currentId, { learned: true }).catch(console.error);
    }

    // SRS: khởi tạo record khi thuộc lần đầu (silent, không ảnh hưởng flow)
    const wordType = (localCurrentWord.savedWordId || localCurrentWord.isGlobal) 
    ? 'system' 
    : 'personal';
    srsApi.initRecord(currentId, wordType).catch(() => {});

    onNext(currentId, true);

    const newQueue = studyQueue.filter(w => getWordId(w) !== currentId);
    setStudyQueue(newQueue);
    const nextWord = newQueue.length > 0 ? newQueue[0] : null;
    switchWord(nextWord);
}, [localCurrentWord, studyQueue, onNext]);

  const handleUnknown = useCallback(() => {
      if (!localCurrentWord) return;
      const currentId = getWordId(localCurrentWord);

      if (localCurrentWord.savedWordId) {
          api.updateMasterStatus(localCurrentWord.savedWordId, false).catch(console.error);
      } else {
          api.updateWord(currentId, { learned: false }).catch(console.error);
      }

      onNext(currentId, false);

      const remaining = studyQueue.filter(w => getWordId(w) !== currentId);
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

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.innerWidth >= 768) return; 
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
    setTouchEndX(null);
    setSwipeDirection(null); 
    setSwipeOffset(0);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const currentX = e.targetTouches[0].clientX;
    const currentY = e.targetTouches[0].clientY;
    const deltaX = currentX - touchStart.x;
    const deltaY = currentY - touchStart.y;

    if (!swipeDirection) {
        if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
            setSwipeDirection(Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical');
        }
        return; 
    }

    if (swipeDirection === 'vertical') return;

    setTouchEndX(currentX);
    setSwipeOffset(deltaX * 0.7); 
  };
  
  const handleTouchEnd = () => {
    if (!touchStart || !touchEndX || swipeDirection === 'vertical') { 
        setSwipeOffset(0); 
        return; 
    }
    const distance = touchEndX - touchStart.x;
    
    if (distance < -75) {
        setSwipeOffset(-500);
        setTimeout(() => { handleKnown(); setSwipeOffset(0); }, 200);
    } else if (distance > 75) {
        setSwipeOffset(500);
        setTimeout(() => { handleUnknown(); setSwipeOffset(0); }, 200);
    } else {
        setSwipeOffset(0); 
    }
  };

  useEffect(() => {
    if (mode === 'quiz' && localCurrentWord) {
      const correct = localCurrentWord;
      const correctId = getWordId(correct);
      const others = allWords.filter(w => getWordId(w) !== correctId);
      const distractors = others.sort(() => 0.5 - Math.random()).slice(0, 3);
      const options = [correct, ...distractors].sort(() => 0.5 - Math.random());
      setQuizOptions(options);
      setSelectedAnswer(null);
    }
  }, [localCurrentWord, mode, allWords]);

  const handleQuizAnswer = (wordId: string) => {
    if (selectedAnswer) return;
    speakWord(getWordText(localCurrentWord));
    setSelectedAnswer(wordId);
    if (wordId === getWordId(localCurrentWord)) {
        setTimeout(() => handleKnown(), 800); 
    } else {
        setTimeout(() => handleUnknown(), 1500); 
    }
  };

  const handleTypingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typingStatus !== 'idle') return;
    speakWord(getWordText(localCurrentWord));
    const correctText = getWordText(localCurrentWord).trim().toLowerCase();
    if (typingInput.trim().toLowerCase() === correctText) {
      setTypingStatus('correct');
      setTimeout(() => handleKnown(), 800);
    } else {
      setTypingStatus('wrong');
    }
  };

  const totalCount = allWords.length;
  const remainingCount = studyQueue.length;
  const displayLearned = totalCount - remainingCount; 
  const displayUnlearned = remainingCount;
  const currentWordText = localCurrentWord ? getWordText(localCurrentWord) : "";
  const currentWordDef = localCurrentWord ? getWordDef(localCurrentWord) : "";

  return (
    /*
     * FIX: Wrapper ngoài cùng chiếm đúng 100dvh (dynamic viewport height)
     * dvh tính đúng trên mobile (loại bỏ phần browser chrome trên/dưới)
     * overflow-hidden ở đây để KHÔNG có gì tràn ra ngoài khung này
     */
    <div
      className="w-full bg-black text-white"
      style={{
        height: '100dvh',        // dynamic viewport height - chính xác trên mobile
        maxHeight: '100dvh',
        overflow: 'hidden',      // không cho phép bất cứ thứ gì tràn ra ngoài
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      
      {/* ── TOP BAR ── cố định chiều cao, không co giãn */}
      <div
        className="flex items-center justify-between px-4 border-b border-zinc-800 bg-black z-20 gap-4"
        style={{ height: '56px', flexShrink: 0 }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onExit}
          className="h-9 -ml-2 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          <span className="font-medium">Exit</span>
        </Button>

        {/* Mode switcher */}
        <div className="flex-1 flex justify-center max-w-xs">
          <div className="bg-zinc-900 p-1 rounded-lg flex w-full border border-zinc-800">
            {[
              { id: 'flashcard', icon: Layers,    label: 'Flashcard' },
              { id: 'quiz',      icon: HelpCircle, label: 'Quiz'      },
              { id: 'typing',    icon: Keyboard,   label: 'Typing'    },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setMode(item.id as Mode)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-all outline-none',
                  mode === item.id
                    ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                )}
              >
                <item.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* spacer để căn giữa mode switcher */}
        <div className="w-[80px]" />
      </div>

      {/* ── BODY ── flex-1 = lấy toàn bộ không gian còn lại, overflow-y-auto để scroll nội dung bên trong */}
      <div
        className="flex-1 bg-black"
        style={{
          overflow: 'hidden',   // body KHÔNG scroll — để scroll box bên trong tự quản lý
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,         // quan trọng: cho phép flex-child co lại dưới min-content-size
        }}
      >
        {/* Scrollable inner — flashcard mode không scroll, quiz/typing scroll được */}
<div
  className="flex-1 px-4 py-4 custom-scrollbar"
  style={{
    overflowY: mode === 'flashcard' ? 'hidden' : 'auto',
    overflowX: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  }}
>
          {/* Stats bar */}
<div className="w-full max-w-4xl mx-auto flex justify-between items-center mb-4 px-4 py-2 bg-zinc-900/50 rounded-full border border-zinc-800/50 text-sm shrink-0">
  <div className="flex gap-1">
    <span className="text-zinc-500">Known:</span>
    <span className="font-bold text-green-500">{displayLearned}/{totalCount}</span>
  </div>

  {/* Volume slider — chỉ hiện trên desktop, nằm giữa Known và Learning */}
  {mode === 'flashcard' && (
    <div className="hidden md:flex items-center gap-2 flex-1 max-w-[180px] mx-4">
      <Volume2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
      <input
        type="range"
        min="0" max="1" step="0.1"
        value={volume}
        onChange={(e) => setVolume(parseFloat(e.target.value))}
        className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
    </div>
  )}
  {mode !== 'flashcard' && <div className="hidden md:block w-px h-4 bg-zinc-800" />}

  <div className="w-px h-4 bg-zinc-800 md:hidden" />

  <div className="flex gap-1">
    <span className="text-zinc-500">Learning:</span>
    <span className="font-bold text-red-400">{displayUnlearned}/{totalCount}</span>
  </div>
</div>

          {/* ── CONTENT AREA ── */}
          <div className="w-full max-w-4xl mx-auto flex flex-col flex-1">

            {isResetting ? (
              /* Loading state */
              <div className="flex-1 flex flex-col items-center justify-center animate-pulse border border-zinc-800 rounded-3xl bg-zinc-900/30 min-h-[300px]">
                <RotateCcw className="w-10 h-10 animate-spin text-zinc-600 mb-3" />
                <p className="text-base text-zinc-500 font-medium">Loading data...</p>
              </div>

            ) : localCurrentWord ? (
              <div
  className={cn(
    'w-full flex flex-col flex-1 min-h-0 transition-all duration-300 ease-in-out pb-4',
    isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
  )}
>

                {/* ══ MODE: FLASHCARD ══ */}
                {mode === 'flashcard' && (
                  <>
                    {/* Card row với mũi tên hai bên trên desktop */}
                    <div className="w-full flex items-center justify-between gap-2 md:gap-4 flex-1 min-h-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleUnknown}
                        disabled={isAnimating}
                        className="hidden md:flex h-12 w-12 shrink-0 rounded-full border border-zinc-800 bg-zinc-900/50 text-red-500 hover:bg-red-950/30 hover:text-red-400 hover:border-red-900/50 transition-all"
                      >
                        <ChevronLeft className="w-8 h-8" />
                      </Button>

                      {/* Flashcard với swipe */}
                      {(() => {
                        const cardElement = (
                          <div
                            className="flex-1 min-w-0 min-h-0 h-full transition-transform duration-200 relative"
                            style={{ transform: `translateX(${swipeOffset}px) rotate(${swipeOffset * 0.04}deg)` }}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                          >
                            {swipeOffset < -30 && (
                              <div className="absolute inset-0 bg-green-500/20 rounded-3xl pointer-events-none transition-opacity z-10" />
                            )}
                            {swipeOffset > 30 && (
                              <div className="absolute inset-0 bg-red-500/20 rounded-3xl pointer-events-none transition-opacity z-10" />
                            )}
                            <Flashcard
                              word={localCurrentWord}
                              className="text-white w-full h-full shadow-2xl"
                              color={themeColor}
                              volume={volume}
                            />
                          </div>
                        );

                        const withTour1 = (
                          <FeatureHint
                            id={ONBOARDING_IDS.LEARN_CLICK_FLASHCARD}
                            delay={400}
                            side="bottom"
                            align="center"
                            message={
                              <div className="space-y-1 max-w-[240px]">
                                <p className="font-bold text-white flex items-center gap-1.5">
                                  <MousePointerClick className="w-4 h-4 text-blue-400" />Flip the flashcard
                                </p>
                                <p className="text-zinc-200 text-sm font-normal leading-snug">
                                  Click directly on this card to turn it over and see the meaning!
                                </p>
                              </div>
                            }
                          >
                            {cardElement}
                          </FeatureHint>
                        );

                        if (isMobile) {
                          return (
                            <FeatureHint
                              id={ONBOARDING_IDS.LEARN_SWIPE_MOBILE}
                              waitFor={ONBOARDING_IDS.LEARN_UNKNOWN_BTN}
                              delay={400}
                              side="bottom"
                              align="center"
                              message={
                                <div className="space-y-1 max-w-[240px]">
                                  <p className="font-bold text-white flex items-center gap-1.5">
                                    <Hand className="w-4 h-4 text-violet-400" />Swipe to learn
                                  </p>
                                  <p className="text-zinc-200 text-sm font-normal leading-snug">
                                    Swipe <strong>right</strong> if memorized, swipe <strong>left</strong> if not yet!
                                  </p>
                                </div>
                              }
                            >
                              <div className="flex-1 flex min-w-0 min-h-0 h-full">{withTour1}</div>
                            </FeatureHint>
                          );
                        }
                        return withTour1;
                      })()}

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleKnown}
                        disabled={isAnimating}
                        className="hidden md:flex h-12 w-12 shrink-0 rounded-full border border-zinc-800 bg-zinc-900/50 text-green-500 hover:bg-green-950/30 hover:text-green-400 hover:border-green-900/50 transition-all"
                      >
                        <ChevronRight className="w-8 h-8" />
                      </Button>
                    </div>

                    {/* Volume + Known/Unknown buttons */}
<div className="shrink-0 mt-4 pt-4 border-t border-zinc-900/50 flex flex-col gap-3 w-full">
  {/* Volume slider — chỉ hiện trên mobile, desktop đã có trong stats bar */}
  <div className="flex md:hidden items-center gap-3 px-4 max-w-sm mx-auto w-full">
    <Volume2 className="w-5 h-5 text-zinc-500 shrink-0" />
    <input
      type="range"
      min="0" max="1" step="0.1"
      value={volume}
      onChange={(e) => setVolume(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
    />
  </div>

                      <div className="grid grid-cols-2 gap-3 w-full">
                        <FeatureHint
                          id={ONBOARDING_IDS.LEARN_UNKNOWN_BTN}
                          waitFor={ONBOARDING_IDS.LEARN_KNOWN_BTN}
                          delay={400}
                          side="top"
                          align="center"
                          message={
                            <div className="space-y-1 max-w-[240px]">
                              <p className="font-bold text-white flex items-center gap-1.5">
                                <X className="w-4 h-4 text-red-400" />Don't know yet
                              </p>
                              <p className="text-zinc-200 text-sm font-normal leading-snug">
                                Click here (or left arrow). The system will repeat this word!
                              </p>
                            </div>
                          }
                        >
                          <Button
                            onClick={handleUnknown}
                            className="h-14 rounded-2xl text-base font-bold shadow-sm transition-all active:scale-[0.98] border border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                            disabled={isAnimating}
                          >
                            <X className="w-5 h-5 mr-2" /> Unknown
                          </Button>
                        </FeatureHint>

                        <FeatureHint
                          id={ONBOARDING_IDS.LEARN_KNOWN_BTN}
                          waitFor={ONBOARDING_IDS.LEARN_CLICK_FLASHCARD}
                          delay={400}
                          side="top"
                          align="center"
                          message={
                            <div className="space-y-1 max-w-[240px]">
                              <p className="font-bold text-white flex items-center gap-1.5">
                                <Check className="w-4 h-4 text-green-400" />Already memorized
                              </p>
                              <p className="text-zinc-200 text-sm font-normal leading-snug">
                                Click here (or right arrow) to move to the next word.
                              </p>
                            </div>
                          }
                        >
                          <Button
                            onClick={handleKnown}
                            className="h-14 rounded-2xl text-base font-bold shadow-xl transition-all active:scale-[0.98] border-none hover:opacity-90 text-white"
                            style={{ backgroundColor: themeColor || '#2563eb' }}
                            disabled={isAnimating}
                          >
                            Known <Check className="ml-2 w-5 h-5" />
                          </Button>
                        </FeatureHint>
                      </div>
                    </div>
                  </>
                )}

                {/* ══ MODE: QUIZ ══ */}
                {mode === 'quiz' && (
                  <div className="flex flex-col w-full gap-4">
                    {/* Definition card */}
                    <div
                      className="bg-zinc-900 border-2 rounded-3xl shadow-sm text-center flex flex-col overflow-hidden"
                      style={{ borderColor: themeColor || '#3f3f46', minHeight: '180px', maxHeight: '35vh' }}
                    >
                      <div className="w-full h-full overflow-y-auto custom-scrollbar p-6 flex flex-col justify-center items-center">
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-3 shrink-0">Definition</p>
                        <h2 className={cn('font-normal leading-relaxed text-white break-words', currentWordDef.length > 80 ? 'text-xl' : 'text-2xl')}>
                          "{currentWordDef}"
                        </h2>
                      </div>
                    </div>

                    {/* Options */}
                    <div className="grid grid-cols-1 gap-3">
                      {quizOptions.map((opt) => {
                        const optId = getWordId(opt);
                        const currentId = getWordId(localCurrentWord);
                        const isSelected = selectedAnswer === optId;
                        const isCorrect = optId === currentId;
                        let style = 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300';
                        if (selectedAnswer) {
                          if (isCorrect) style = 'border-green-900 bg-green-950/40 text-green-400 font-bold ring-1 ring-green-900';
                          else if (isSelected) style = 'border-red-900 bg-red-950/40 text-red-400 opacity-80';
                          else style = 'opacity-30 grayscale border-transparent';
                        }
                        return (
                          <button
                            key={optId}
                            className={cn('h-14 px-4 rounded-2xl border text-base font-medium transition-all shadow-sm flex items-center justify-center text-center active:scale-[0.98]', style)}
                            onClick={() => handleQuizAnswer(optId)}
                            disabled={!!selectedAnswer}
                          >
                            <span className="truncate w-full">{getWordText(opt)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ══ MODE: TYPING ══ */}
                {mode === 'typing' && (
                  <div className="flex flex-col w-full gap-4">
                    {/* Definition card */}
                    <div
                      className="bg-zinc-900 border-2 rounded-3xl shadow-sm text-center flex flex-col overflow-hidden"
                      style={{ borderColor: themeColor || '#3f3f46', minHeight: '180px', maxHeight: '35vh' }}
                    >
                      <div className="w-full h-full overflow-y-auto custom-scrollbar p-6 flex flex-col justify-center items-center">
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-3 shrink-0">Type the English word</p>
                        <h2 className={cn('font-normal leading-relaxed text-white mb-3 break-words', currentWordDef.length > 80 ? 'text-xl' : 'text-2xl')}>
                          "{currentWordDef}"
                        </h2>
                        {localCurrentWord.type && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                            {Array.isArray(localCurrentWord.type) ? localCurrentWord.type.join(', ') : localCurrentWord.type}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Input + action */}
                    <form onSubmit={handleTypingSubmit} className="relative w-full">
                      <Input
                        autoFocus
                        placeholder="Enter word..."
                        className={cn(
                          'h-16 text-xl text-center rounded-2xl border-2 bg-black text-white placeholder:text-zinc-700 shadow-sm transition-all pr-12 focus:border-zinc-600 border-zinc-800 focus-visible:ring-0',
                          typingStatus === 'correct' && 'border-green-800 text-green-500 bg-green-950/20',
                          typingStatus === 'wrong'   && 'border-red-800 text-red-500 bg-red-950/20'
                        )}
                        value={typingInput}
                        onChange={(e) => { setTypingInput(e.target.value); if (typingStatus === 'wrong') setTypingStatus('idle'); }}
                        disabled={typingStatus === 'correct'}
                      />
                      <div className="absolute right-4 top-5">
                        {typingStatus === 'correct' && <CheckCircle2 className="text-green-500 w-6 h-6 animate-in zoom-in" />}
                        {typingStatus === 'wrong'   && <XCircle     className="text-red-500   w-6 h-6 animate-in zoom-in" />}
                      </div>
                    </form>

                    <div className="h-14">
                      {typingStatus === 'idle' && (
                        <div className="grid grid-cols-2 gap-3 h-full">
                          <Button size="lg" onClick={handleUnknown} className="h-full text-base font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl">Skip</Button>
                          <Button size="lg" onClick={handleTypingSubmit} className="h-full text-base font-bold bg-white text-black hover:bg-zinc-200 rounded-2xl">Check</Button>
                        </div>
                      )}
                      {typingStatus === 'wrong' && (
                        <div
                          className="h-full flex items-center justify-between px-4 bg-red-950/20 rounded-2xl border border-red-900/50 animate-in slide-in-from-bottom-2 cursor-pointer hover:bg-red-950/30 transition-colors"
                          onClick={handleUnknown}
                        >
                          <div className="flex items-baseline gap-2 overflow-hidden">
                            <span className="text-xs text-red-400/70 shrink-0">Answer:</span>
                            <span className="text-lg font-bold text-red-400 truncate">{currentWordText}</span>
                          </div>
                          <span className="text-xs text-red-400 font-bold bg-red-950/50 px-2 py-1 rounded">Continue</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>

            ) : (
              /* ── COMPLETED STATE ── */
              <div className="flex-1 flex flex-col items-center justify-center py-16 animate-in zoom-in-95">
                <div className="w-24 h-24 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <span className="text-5xl">🎉</span>
                </div>
                <h3 className="text-2xl font-bold mb-2 text-white">Excellent!</h3>
                <p className="text-zinc-500 mb-6 text-center max-w-xs">You have finished reviewing this folder.</p>
                <Button
                  onClick={handleRestart}
                  size="lg"
                  className="rounded-full px-10 h-12 text-base font-bold shadow-lg bg-white text-black hover:bg-zinc-200"
                >
                  Learn again
                </Button>
              </div>
            )}

          </div>{/* /content area */}
        </div>{/* /scrollable inner */}
      </div>{/* /body */}
      {localCurrentWord && !isResetting && (
        <>
          {/* Anchor cố định góc dưới phải để FeatureHint highlight đúng vị trí FAB */}
          <FeatureHint
            id={ONBOARDING_IDS.LEARN_AI_CHATBOT}
            waitFor={ONBOARDING_IDS.LEARN_UNKNOWN_BTN}
            delay={800}
            side="left"
            align="center"
            message={
              <div className="space-y-1 max-w-[220px]">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-violet-400" />AI Vocab Assistant
                </p>
                <p className="text-zinc-200 text-sm font-normal leading-snug">
                  Tap this button to ask AI anything about the current word — usage, examples, collocations and more!
                  You can move that!
                </p>
              </div>
            }
          >
            <div
              className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full pointer-events-none"
              aria-hidden="true"
            />
          </FeatureHint>
          <VocabChatbot
            currentWord={getWordText(localCurrentWord)}
            wordType={getActual(localCurrentWord)?.type}
            wordDefinition={getWordDef(localCurrentWord)}
            wordExamples={getActual(localCurrentWord)?.definitions?.[0]?.examples}
          />
        </>
      )}
    </div>/* /root wrapper */
  );
}