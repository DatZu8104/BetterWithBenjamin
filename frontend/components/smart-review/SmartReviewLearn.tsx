'use client';
import { api } from '../../lib/api';
import { srsApi, DueWord, ReviewButton } from '../../lib/srsApi';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Flashcard } from '../flashcard';
import { ArrowLeft, CheckCircle2, XCircle, Keyboard, Layers, HelpCircle, RotateCcw, X, ChevronLeft, ChevronRight, Volume2, MousePointerClick, Hand, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { VocabChatbot } from '../home/vocab-chatbot';
import { SmartReviewSummary, ReviewResult } from './SmartReviewSummary';

type Mode = 'flashcard' | 'quiz' | 'typing';

const SRS_BUTTONS: {
    key: ReviewButton;
    label: string;
    sublabel: string;
    className: string;
    hotkey: string;
}[] = [
    { key: 'again', label: 'Again', sublabel: 'Forgot',      className: 'border-red-800 bg-red-950/40 hover:bg-red-900/50 text-red-300',       hotkey: '1' },
    { key: 'hard',  label: 'Hard',  sublabel: 'Difficult',   className: 'border-orange-800 bg-orange-950/40 hover:bg-orange-900/50 text-orange-300', hotkey: '2' },
    { key: 'good',  label: 'Good',  sublabel: 'Remembered',  className: 'border-blue-800 bg-blue-950/40 hover:bg-blue-900/50 text-blue-300',     hotkey: '3' },
    { key: 'easy',  label: 'Easy',  sublabel: 'Too easy',    className: 'border-green-800 bg-green-950/40 hover:bg-green-900/50 text-green-300', hotkey: '4' },
];

interface SmartReviewLearnProps {
    words: DueWord[];
}

export function SmartReviewLearn({ words }: SmartReviewLearnProps) {
    const router = useRouter();

    const [mode, setMode] = useState<Mode>('flashcard');
    const [studyQueue, setStudyQueue] = useState<DueWord[]>([]);
    const [localCurrentWord, setLocalCurrentWord] = useState<DueWord | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [quizOptions, setQuizOptions] = useState<DueWord[]>([]);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [typingInput, setTypingInput] = useState('');
    const [typingStatus, setTypingStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');

    const [results, setResults] = useState<ReviewResult[]>([]);
    const [showSummary, setShowSummary] = useState(false);

    const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
    const [touchEndX, setTouchEndX] = useState<number | null>(null);
    const [swipeDirection, setSwipeDirection] = useState<'horizontal' | 'vertical' | null>(null);
    const [swipeOffset, setSwipeOffset] = useState(0);

    const hasInitialized = useRef(false);

    const getActual = (w: any) => w?.wordId || w || {};
    const getWordText = (w: any) => getActual(w).word || getActual(w).english || '';
    const getWordDef = (w: any) => getActual(w).definition || getActual(w).definitions?.[0]?.definition || 'No definition';
    const getWordId = (w: any) => w?._id || w?.id || w?.savedWordId;

    const totalCount = words.length;
    const remainingCount = studyQueue.length;
    const displayLearned = totalCount - remainingCount;
    const currentWordText = localCurrentWord ? getWordText(localCurrentWord) : '';
    const currentWordDef = localCurrentWord ? getWordDef(localCurrentWord) : '';

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (hasInitialized.current) return;
        const shuffled = [...words].sort(() => Math.random() - 0.5);
        setStudyQueue(shuffled);
        setLocalCurrentWord(shuffled[0] || null);
        hasInitialized.current = true;
    }, [words]);

    useEffect(() => { return () => { hasInitialized.current = false; }; }, []);

    const speakWord = (text: string) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v => v.lang === 'en-US' && v.name.includes('Google'));
        if (preferred) utterance.voice = preferred;
        window.speechSynthesis.speak(utterance);
    };

    const switchWord = (newWord: DueWord | null) => {
        setIsAnimating(true);
        setSwipeOffset(0);
        setTimeout(() => {
            setLocalCurrentWord(newWord);
            resetModeState();
            setIsAnimating(false);
        }, 100);
    };

    const resetModeState = () => {
        setSelectedAnswer(null);
        setTypingInput('');
        setTypingStatus('idle');
    };

    // ── 4 NÚT SRS thay cho Known/Unknown ──
    const handleSrsButton = useCallback(async (button: ReviewButton) => {
        if (!localCurrentWord || isSubmitting) return;
        setIsSubmitting(true);

        const currentId = getWordId(localCurrentWord);
        const wordType = localCurrentWord.wordType;

        // Gọi API SRS
        let nextInterval = 1;
        try {
            const res = await srsApi.submitReview(currentId, wordType, button);
            nextInterval = res.interval;
        } catch {
            // silent
        }

        // Lưu result
        const newResult: ReviewResult = {
            word: localCurrentWord as any,
            button,
            nextInterval
        };
        const newResults = [...results, newResult];
        setResults(newResults);

        // Chuyển từ tiếp theo
        const newQueue = studyQueue.filter(w => getWordId(w) !== currentId);
        setStudyQueue(newQueue);

        if (newQueue.length === 0) {
            setShowSummary(true);
        } else {
            switchWord(newQueue[0]);
        }

        setIsSubmitting(false);
    }, [localCurrentWord, studyQueue, results, isSubmitting]);

    // Quiz dùng good/again
    const handleQuizAnswer = (wordId: string) => {
        if (selectedAnswer) return;
        speakWord(getWordText(localCurrentWord));
        setSelectedAnswer(wordId);
        const isCorrect = wordId === getWordId(localCurrentWord);
        setTimeout(() => handleSrsButton(isCorrect ? 'good' : 'again'), 800);
    };

    // Typing dùng good/again
    const handleTypingSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (typingStatus !== 'idle') return;
        speakWord(getWordText(localCurrentWord));
        const correct = getWordText(localCurrentWord).trim().toLowerCase();
        if (typingInput.trim().toLowerCase() === correct) {
            setTypingStatus('correct');
            setTimeout(() => handleSrsButton('good'), 800);
        } else {
            setTypingStatus('wrong');
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!localCurrentWord) return;
            const btn = SRS_BUTTONS.find(b => b.hotkey === e.key);
            if (btn && mode === 'flashcard') handleSrsButton(btn.key);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [localCurrentWord, mode, handleSrsButton]);

    // Touch handlers
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
            if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)
                setSwipeDirection(Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical');
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
            setTimeout(() => { handleSrsButton('good'); setSwipeOffset(0); }, 200);
        } else if (distance > 75) {
            setSwipeOffset(500);
            setTimeout(() => { handleSrsButton('again'); setSwipeOffset(0); }, 200);
        } else {
            setSwipeOffset(0);
        }
    };

    // Quiz options
    useEffect(() => {
        if (mode === 'quiz' && localCurrentWord) {
            const correctId = getWordId(localCurrentWord);
            const others = words.filter(w => getWordId(w) !== correctId);
            const distractors = others.sort(() => 0.5 - Math.random()).slice(0, 3);
            const options = [localCurrentWord, ...distractors].sort(() => 0.5 - Math.random());
            setQuizOptions(options);
            setSelectedAnswer(null);
        }
    }, [localCurrentWord, mode, words]);

    // Summary
    if (showSummary) {
        return (
            <SmartReviewSummary
                results={results}
                onClose={() => {
                    const tab = sessionStorage.getItem('srs_learn_tab') || 'personal';
                    router.push(`/smart-review?tab=${tab}`);
                }}
                onReviewAgain={() => {
                    const shuffled = [...words].sort(() => Math.random() - 0.5);
                    setStudyQueue(shuffled);
                    setLocalCurrentWord(shuffled[0] || null);
                    setResults([]);
                    setShowSummary(false);
                    hasInitialized.current = true;
                }}
            />
        );
    }

    return (
    <div
        className="w-full bg-black text-white"
        style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
        {/* ── TOP BAR — shrink-0, cố định ── */}
        <div
            className="flex items-center justify-between px-4 border-b border-zinc-800 bg-black z-20 gap-4"
            style={{ height: '56px', flexShrink: 0 }}
        >
            <Button
                variant="ghost" size="sm"
onClick={() => {
    const tab = sessionStorage.getItem('srs_learn_tab') || 'personal';
    router.push(`/smart-review?tab=${tab}`);
}}
                className="h-9 -ml-2 text-zinc-400 hover:text-white hover:bg-zinc-900"
            >
                <ArrowLeft className="w-5 h-5 mr-2" />
                <span className="font-medium">Exit</span>
            </Button>

            {/* Mode switcher */}
            <div className="flex-1 flex justify-center max-w-xs">
                <div className="bg-zinc-900 p-1 rounded-lg flex w-full border border-zinc-800">
                    {[
                        { id: 'flashcard', icon: Layers,     label: 'Flashcard' },
                        { id: 'quiz',      icon: HelpCircle, label: 'Quiz'      },
                        { id: 'typing',    icon: Keyboard,   label: 'Typing'    },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setMode(item.id as Mode)}
                            className={cn(
                                'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-all outline-none',
                                mode === item.id
                                    ? 'bg-white text-black shadow-sm'
                                    : 'text-zinc-500 hover:text-zinc-300'
                            )}
                        >
                            <item.icon className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Progress */}
            <div className="text-right shrink-0">
                <span className="text-xs text-zinc-400 font-mono">{displayLearned}/{totalCount}</span>
            </div>
        </div>

        {/* Progress bar — shrink-0 */}
        <div className="h-1 bg-zinc-900 shrink-0">
            <div
                className="h-full bg-violet-500 transition-all duration-500"
                style={{ width: `${totalCount > 0 ? (displayLearned / totalCount) * 100 : 0}%` }}
            />
        </div>

        {/* ── BODY — flex-1, overflow hidden, flex column ── */}
        <div
            style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}
        >
            {/* Scrollable inner */}
            <div
                style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}
                className="px-4 py-4"
            >
                <div className="max-w-xl mx-auto">

                    {/* Loading */}
                    {!localCurrentWord && (
                        <div className="flex flex-col items-center justify-center min-h-[300px]">
                            <RotateCcw className="w-10 h-10 animate-spin text-zinc-600 mb-3" />
                            <p className="text-zinc-500">Loading...</p>
                        </div>
                    )}

                    {localCurrentWord && (
                        <div className={cn(
                            'w-full flex flex-col transition-all duration-300 ease-in-out pb-4',
                            isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
                        )}>

                            {/* ══ FLASHCARD MODE ══ */}
                            {mode === 'flashcard' && (
                                <>
                                    {/* Flashcard — bỏ nút mũi tên trái phải */}
                                    <div
                                        className="w-full transition-transform duration-200 relative"
                                        style={{ transform: `translateX(${swipeOffset}px) rotate(${swipeOffset * 0.04}deg)` }}
                                        onTouchStart={handleTouchStart}
                                        onTouchMove={handleTouchMove}
                                        onTouchEnd={handleTouchEnd}
                                    >
                                        {swipeOffset < -30 && <div className="absolute inset-0 bg-green-500/20 rounded-3xl pointer-events-none z-10" />}
                                        {swipeOffset > 30 && <div className="absolute inset-0 bg-red-500/20 rounded-3xl pointer-events-none z-10" />}
                                        <Flashcard word={localCurrentWord} className="text-white w-full shadow-2xl" />
                                    </div>

                                    {/* 4 SRS buttons */}
                                    <div className="grid grid-cols-4 gap-2 mt-4">
                                        {SRS_BUTTONS.map(btn => (
                                            <button
                                                key={btn.key}
                                                onClick={() => handleSrsButton(btn.key)}
                                                disabled={isAnimating || isSubmitting}
                                                className={cn(
                                                    'flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all disabled:opacity-40',
                                                    btn.className
                                                )}
                                            >
                                                <span className="font-bold text-sm">{btn.label}</span>
                                                <span className="text-[10px] opacity-70">{btn.sublabel}</span>
                                                <span className="text-[10px] opacity-40 mt-0.5">[{btn.hotkey}]</span>
                                            </button>
                                        ))}
                                    </div>

                                    {isMobile && (
                                        <p className="text-center text-xs text-zinc-600 mt-3">
                                            Swipe left = Good · Swipe right = Again
                                        </p>
                                    )}
                                </>
                            )}

                            {/* ══ QUIZ MODE ══ */}
                            {mode === 'quiz' && (
                                <div className="flex flex-col w-full gap-4">
                                    <div className="bg-zinc-900 border-2 border-zinc-800 rounded-3xl text-center flex flex-col overflow-hidden" style={{ minHeight: '160px', maxHeight: '30vh' }}>
                                        <div className="w-full h-full overflow-y-auto p-6 flex flex-col justify-center items-center">
                                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-3">Definition</p>
                                            <h2 className={cn('font-normal leading-relaxed text-white break-words', currentWordDef.length > 80 ? 'text-xl' : 'text-2xl')}>
                                                "{currentWordDef}"
                                            </h2>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        {quizOptions.map(opt => {
                                            const optId = getWordId(opt);
                                            const correctId = getWordId(localCurrentWord);
                                            const isSelected = selectedAnswer === optId;
                                            const isCorrect = optId === correctId;
                                            let style = 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300';
                                            if (selectedAnswer) {
                                                if (isCorrect) style = 'border-green-900 bg-green-950/40 text-green-400 font-bold ring-1 ring-green-900';
                                                else if (isSelected) style = 'border-red-900 bg-red-950/40 text-red-400 opacity-80';
                                                else style = 'opacity-30 grayscale border-transparent';
                                            }
                                            return (
                                                <button
                                                    key={optId}
                                                    className={cn('h-14 px-4 rounded-2xl border text-base font-medium transition-all flex items-center justify-center text-center active:scale-[0.98]', style)}
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

                            {/* ══ TYPING MODE ══ */}
                            {mode === 'typing' && (
                                <div className="flex flex-col w-full gap-4">
                                    <div className="bg-zinc-900 border-2 border-zinc-800 rounded-3xl text-center flex flex-col overflow-hidden" style={{ minHeight: '160px', maxHeight: '30vh' }}>
                                        <div className="w-full h-full overflow-y-auto p-6 flex flex-col justify-center items-center">
                                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-3">Type the English word</p>
                                            <h2 className={cn('font-normal leading-relaxed text-white mb-3 break-words', currentWordDef.length > 80 ? 'text-xl' : 'text-2xl')}>
                                                "{currentWordDef}"
                                            </h2>
                                            {(localCurrentWord as any).type && (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                                                    {Array.isArray((localCurrentWord as any).type)
                                                        ? (localCurrentWord as any).type.join(', ')
                                                        : (localCurrentWord as any).type}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <form onSubmit={handleTypingSubmit} className="relative w-full">
                                        <Input
                                            autoFocus
                                            placeholder="Enter word..."
                                            className={cn(
                                                'h-16 text-xl text-center rounded-2xl border-2 bg-black text-white placeholder:text-zinc-700 transition-all pr-12 focus:border-zinc-600 border-zinc-800 focus-visible:ring-0',
                                                typingStatus === 'correct' && 'border-green-800 text-green-500 bg-green-950/20',
                                                typingStatus === 'wrong' && 'border-red-800 text-red-500 bg-red-950/20'
                                            )}
                                            value={typingInput}
                                            onChange={e => { setTypingInput(e.target.value); if (typingStatus === 'wrong') setTypingStatus('idle'); }}
                                            disabled={typingStatus === 'correct'}
                                        />
                                        <div className="absolute right-4 top-5">
                                            {typingStatus === 'correct' && <CheckCircle2 className="text-green-500 w-6 h-6 animate-in zoom-in" />}
                                            {typingStatus === 'wrong' && <XCircle className="text-red-500 w-6 h-6 animate-in zoom-in" />}
                                        </div>
                                    </form>
                                    <div className="h-14">
                                        {typingStatus === 'idle' && (
                                            <div className="grid grid-cols-2 gap-3 h-full">
                                                <Button size="lg" onClick={() => handleSrsButton('again')} className="h-full text-base font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl">Skip</Button>
                                                <Button size="lg" onClick={handleTypingSubmit} className="h-full text-base font-bold bg-white text-black hover:bg-zinc-200 rounded-2xl">Check</Button>
                                            </div>
                                        )}
                                        {typingStatus === 'wrong' && (
                                            <div
                                                className="h-full flex items-center justify-between px-4 bg-red-950/20 rounded-2xl border border-red-900/50 cursor-pointer hover:bg-red-950/30 transition-colors"
                                                onClick={() => handleSrsButton('again')}
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
                    )}
                </div>
            </div>
        </div>

        {/* AI Chatbot */}
        {localCurrentWord && (
            <VocabChatbot
                currentWord={getWordText(localCurrentWord)}
                wordType={getActual(localCurrentWord)?.type}
                wordDefinition={getWordDef(localCurrentWord)}
                wordExamples={getActual(localCurrentWord)?.definitions?.[0]?.examples}
            />
        )}

        {/* Keyboard hint desktop */}
        <div className="hidden md:flex items-center justify-center gap-6 py-2 border-t border-zinc-900 shrink-0">
            <span className="text-xs text-zinc-600">1 Again · 2 Hard · 3 Good · 4 Easy</span>
        </div>
    </div>
);
}