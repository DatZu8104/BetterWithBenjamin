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
  const [studyQueue, setStudyQueue] = useState<any[]>([]);
  const [localCurrentWord, setLocalCurrentWord] = useState<any | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Quiz & Typing State
  const [quizOptions, setQuizOptions] = useState<any[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [typingInput, setTypingInput] = useState('');
  const [typingStatus, setTypingStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  
  const hasInitialized = useRef(false);

  // Helper
  const getWordText = (w: any) => w?.word || w?.english || "";
  const getWordDef = (w: any) => w?.definition || w?.definitions?.[0]?.definition || "No definition";

  // --- AUDIO ---
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

  // Init Data
  useEffect(() => {
      if (hasInitialized.current && !isResetting) return;
      const unlearned = allWords.filter(w => !w.learned);
      if (unlearned.length > 0) {
          const shuffled = unlearned.sort(() => Math.random() - 0.5);
          setStudyQueue(shuffled);
          setLocalCurrentWord(shuffled[0]);
          hasInitialized.current = true;
      } else if (isResetting) {
          setStudyQueue([]);
          setLocalCurrentWord(null);
      }
  }, [allWords, isResetting]);

  useEffect(() => { return () => { hasInitialized.current = false; } }, []);

  // --- LOGIC ---
  const switchWord = (newWord: any | null) => {
    setIsAnimating(true); 
    setTimeout(() => {
        setLocalCurrentWord(newWord);
        resetModeState();
        setIsAnimating(false);
    }, 70);
  };

  const handleRestart = () => {
      hasInitialized.current = false; 
      setLocalCurrentWord(null);
      setStudyQueue([]);
      onReset();
  };

  const handleKnown = useCallback(() => {
      if (!localCurrentWord) return;
      onNext(); 
      const newQueue = studyQueue.filter(w => w.id !== localCurrentWord.id);
      setStudyQueue(newQueue);
      const nextWord = newQueue.length > 0 ? newQueue[0] : null;
      switchWord(nextWord);
  }, [localCurrentWord, studyQueue, onNext]);

  const handleUnknown = useCallback(() => {
      if (!localCurrentWord) return;
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

  // Quiz Logic
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
    speakWord(getWordText(localCurrentWord));
    setSelectedAnswer(wordId);
    if (wordId === localCurrentWord.id) {
        setTimeout(() => handleKnown(), 800); 
    } else {
        setTimeout(() => handleUnknown(), 1500); 
    }
  };

  // Typing Logic
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
    <div className="fixed inset-0 w-screen h-screen bg-black text-white flex flex-col overflow-hidden z-[9999]">
      
      {/* 1. TOP BAR */}
      <div className="h-14 shrink-0 flex justify-between items-center px-4 border-b border-zinc-800 bg-black z-20 gap-4">
         <Button variant="ghost" size="sm" onClick={onExit} className="h-9 -ml-2 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors">
           <ArrowLeft className="w-5 h-5 mr-2"/> <span className="font-medium">Exit</span>
         </Button>

         <div className="flex-1 flex justify-center max-w-xs">
            <div className="bg-zinc-900 p-1 rounded-lg flex w-full border border-zinc-800">
                {[{ id: 'flashcard', icon: Layers, label: 'Flashcard' }, { id: 'quiz', icon: HelpCircle, label: 'Quiz' }, { id: 'typing', icon: Keyboard, label: 'Typing' }].map((item) => (
                    <button key={item.id} onClick={() => setMode(item.id as Mode)}
                    className={cn("flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-all outline-none", mode === item.id ? "bg-zinc-800 text-white shadow-sm ring-1 ring-zinc-700" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50")}>
                    <item.icon className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{item.label}</span>
                    </button>
                ))}
            </div>
         </div>
         <div className="w-[80px]"></div>
      </div>

      {/* 2. BODY CONTAINER */}
      <div className="flex-1 w-full relative min-h-0 bg-black flex flex-col">
        {/* Scrollable Area */}
        <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-4 flex flex-col items-center">
            
            <div className="w-full flex flex-col items-center my-auto min-h-min">
                {/* STATS */}
                <div className="w-full max-w-2xl flex justify-between items-center mb-6 px-4 py-2 bg-zinc-900/50 rounded-full border border-zinc-800/50 text-sm shrink-0">
                    <div className="flex gap-1"><span className="text-zinc-500">Known:</span><span className="font-bold text-green-500">{displayLearned}/{totalCount}</span></div>
                    <div className="w-px h-4 bg-zinc-800"></div>
                    <div className="flex gap-1"><span className="text-zinc-500">Learning:</span><span className="font-bold text-red-400">{displayUnlearned}/{totalCount}</span></div>
                </div>

                {/* ✅ FIXED 90% WIDTH CONTAINER - KHÔNG CHO RESIZE NỮA */}
                <div className="flex flex-col relative w-[90%] mx-auto">
                    
                    {isResetting ? (
                        <div className="h-[400px] flex flex-col items-center justify-center animate-pulse border border-zinc-800 rounded-3xl bg-zinc-900/30">
                            <RotateCcw className="w-10 h-10 animate-spin text-zinc-600 mb-3"/> <p className="text-base text-zinc-500 font-medium">Loading data...</p>
                        </div>
                    ) : localCurrentWord ? (
                    <div className={cn("w-full flex flex-col transition-all duration-300 ease-in-out pb-10", isAnimating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0")}>
                        
                        {/* MODE 1: FLASHCARD */}
                        {mode === 'flashcard' && (
                            <div className="w-full flex flex-col justify-center">
                                <Flashcard word={localCurrentWord} className="text-white w-full shadow-2xl" color={themeColor} />
                            </div>
                        )}

                        {/* MODE 2: QUIZ */}
                        {mode === 'quiz' && (
                        <div className="flex flex-col justify-center w-full">
                            <div className="bg-zinc-900 border-2 rounded-3xl shadow-sm text-center mb-6 flex flex-col h-[35vh] min-h-[250px] relative overflow-hidden" style={{ borderColor: themeColor || '#3f3f46' }}>
                                <div className="w-full h-full overflow-y-auto custom-scrollbar p-6 flex flex-col justify-center items-center">
                                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4 shrink-0">Definition</p>
                                    <h2 className={cn("font-normal leading-relaxed text-white break-words", currentWordDef.length > 80 ? "text-xl" : "text-2xl")}>"{currentWordDef}"</h2>
                                </div>
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
                                        <button key={opt.id} className={cn("h-14 px-4 rounded-2xl border text-base font-medium transition-all shadow-sm flex items-center justify-center text-center active:scale-[0.98]", style)}
                                            onClick={() => handleQuizAnswer(opt.id)} disabled={!!selectedAnswer}>
                                            <span className="truncate w-full">{getWordText(opt)}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                        )}

                        {/* MODE 3: TYPING */}
                        {mode === 'typing' && (
                        <div className="flex flex-col justify-center w-full">
                            <div className="bg-zinc-900 border-2 rounded-3xl shadow-sm text-center mb-6 flex flex-col h-[35vh] min-h-[250px] relative overflow-hidden" style={{ borderColor: themeColor || '#3f3f46' }}>
                                <div className="w-full h-full overflow-y-auto custom-scrollbar p-6 flex flex-col justify-center items-center">
                                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4 shrink-0">Type the English word</p>
                                    <h2 className={cn("font-normal leading-relaxed text-white mb-4 break-words", currentWordDef.length > 80 ? "text-xl" : "text-2xl")}>"{currentWordDef}"</h2>
                                    {localCurrentWord.type && <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">{Array.isArray(localCurrentWord.type) ? localCurrentWord.type.join(', ') : localCurrentWord.type}</span>}
                                </div>
                            </div>
                            
                            <div className="min-h-[140px] flex flex-col justify-end">
                                <form onSubmit={handleTypingSubmit} className="relative w-full mb-3 shrink-0">
                                    <Input autoFocus placeholder="Enter word..." 
                                        className={cn("h-16 text-xl text-center rounded-2xl border-2 bg-black text-white placeholder:text-zinc-700 shadow-sm transition-all pr-12 focus:border-zinc-600 border-zinc-800 focus-visible:ring-0", typingStatus === 'correct' && "border-green-800 text-green-500 bg-green-950/20", typingStatus === 'wrong' && "border-red-800 text-red-500 bg-red-950/20")}
                                        value={typingInput} onChange={(e) => { setTypingInput(e.target.value); if(typingStatus === 'wrong') setTypingStatus('idle'); }} disabled={typingStatus === 'correct'} />
                                    <div className="absolute right-4 top-5">
                                        {typingStatus === 'correct' && <CheckCircle2 className="text-green-500 w-6 h-6 animate-in zoom-in"/>}
                                        {typingStatus === 'wrong' && <XCircle className="text-red-500 w-6 h-6 animate-in zoom-in"/>}
                                    </div>
                                </form>
                                <div className="shrink-0 h-14">
                                    {typingStatus === 'idle' && (
                                        <div className="grid grid-cols-2 gap-3 h-full">
                                            <Button size="lg" onClick={handleUnknown} className="h-full text-base font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl">Skip</Button>
                                            <Button size="lg" onClick={handleTypingSubmit} className="h-full text-base font-bold bg-white text-black hover:bg-zinc-200 rounded-2xl">Check</Button>
                                        </div>
                                    )}
                                    {typingStatus === 'wrong' && (
                                        <div className="h-full flex items-center justify-between px-4 bg-red-950/20 rounded-2xl border border-red-900/50 animate-in slide-in-from-bottom-2 cursor-pointer hover:bg-red-950/30 transition-colors" onClick={handleUnknown}>
                                            <div className="flex items-baseline gap-2 overflow-hidden"><span className="text-xs text-red-400/70 shrink-0">Answer:</span><span className="text-lg font-bold text-red-400 truncate">{currentWordText}</span></div>
                                            <span className="text-xs text-red-400 font-bold bg-red-950/50 px-2 py-1 rounded">Continue</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        )}
                        
                        <div className="shrink-0 mt-6 pt-2 border-t border-zinc-900/50 grid grid-cols-2 gap-3 w-full">
                            <Button onClick={handleUnknown} className="h-16 rounded-2xl text-lg font-bold shadow-sm transition-all active:scale-[0.98] border border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white" disabled={isAnimating}><X className="w-5 h-5 mr-2"/> Unknown</Button>
                            <Button onClick={handleKnown} className="h-16 rounded-2xl text-lg font-bold shadow-xl transition-all active:scale-[0.98] border-none hover:opacity-90 text-white" style={{ backgroundColor: themeColor || '#2563eb' }} disabled={isAnimating}>Known <Check className="ml-2 w-5 h-5"/></Button>
                        </div>
                    </div>
                    ) : (
                    <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in-95 py-20">
                        <div className="w-24 h-24 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center mb-6 shadow-inner"><span className="text-5xl">🎉</span></div>
                        <h3 className="text-2xl font-bold mb-2 text-white">Excellent Work!</h3>
                        <p className="text-zinc-500 mb-6 text-center max-w-xs">You have learned all words in this group.</p>
                        <Button onClick={handleRestart} size="lg" className="rounded-full px-10 h-12 text-base font-bold shadow-lg bg-white text-black hover:bg-zinc-200">Start Over</Button>
                    </div>
                    )}
                </div> 
            </div>
        </div>
      </div>
    </div>
  );
}