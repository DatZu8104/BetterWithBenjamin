'use client';
import { srsApi, DueWord, ReviewButton } from '../../lib/srsApi';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Flashcard } from '../flashcard';
import { ArrowLeft, CheckCircle2, XCircle, Keyboard, Layers, HelpCircle, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { VocabChatbot } from '../home/vocab-chatbot';
import { SmartReviewSummary, ReviewResult } from './SmartReviewSummary';

type Mode = 'flashcard' | 'quiz' | 'typing';

// cardFlex: tỷ lệ flex của card (zone lấy phần còn lại)
// min: 3 (~33% card), max: 8 (~80% card), default: 6
const CARD_FLEX_MIN = 3;
const CARD_FLEX_MAX = 8;
const CARD_FLEX_DEFAULT = 6;
const STORAGE_KEY = 'srs_card_flex';

const SRS_BUTTONS: {
    key: ReviewButton; label: string; sublabel: string; className: string; hotkey: string;
}[] = [
    { key: 'again', label: 'Again', sublabel: 'Forgot',     className: 'border-red-800 bg-red-950/40 hover:bg-red-900/50 text-red-300',           hotkey: '1' },
    { key: 'hard',  label: 'Hard',  sublabel: 'Difficult',  className: 'border-orange-800 bg-orange-950/40 hover:bg-orange-900/50 text-orange-300', hotkey: '2' },
    { key: 'good',  label: 'Good',  sublabel: 'Remembered', className: 'border-blue-800 bg-blue-950/40 hover:bg-blue-900/50 text-blue-300',         hotkey: '3' },
    { key: 'easy',  label: 'Easy',  sublabel: 'Too easy',   className: 'border-green-800 bg-green-950/40 hover:bg-green-900/50 text-green-300',     hotkey: '4' },
];

const ZONE_CONFIG = [
    { key: 'hard'  as ReviewButton, label: 'Hard',  arrow: '↑', activeColor: 'rgba(234,179,8,0.28)',  textColor: '#f59e0b', bgColor: 'rgba(234,179,8,0.07)',  position: 'top'    as const },
    { key: 'again' as ReviewButton, label: 'Again', arrow: '↓', activeColor: 'rgba(239,68,68,0.28)',  textColor: '#f87171', bgColor: 'rgba(239,68,68,0.07)',  position: 'bottom' as const },
    { key: 'easy'  as ReviewButton, label: 'Easy',  arrow: '←', activeColor: 'rgba(34,197,94,0.28)',  textColor: '#4ade80', bgColor: 'rgba(34,197,94,0.07)',  position: 'left'   as const },
    { key: 'good'  as ReviewButton, label: 'Good',  arrow: '→', activeColor: 'rgba(59,130,246,0.28)', textColor: '#60a5fa', bgColor: 'rgba(59,130,246,0.07)', position: 'right'  as const },
];

interface SmartReviewLearnProps { words: DueWord[]; }

export function SmartReviewLearn({ words }: SmartReviewLearnProps) {
    const router = useRouter();

    const [mode, setMode] = useState<Mode>('flashcard');
    const [studyQueue, setStudyQueue] = useState<DueWord[]>([]);
    const [localCurrentWord, setLocalCurrentWord] = useState<DueWord | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [quizOptions, setQuizOptions] = useState<DueWord[]>([]);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [typingInput, setTypingInput] = useState('');
    const [typingStatus, setTypingStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');

    const [results, setResults] = useState<ReviewResult[]>([]);
    const [showSummary, setShowSummary] = useState(false);

    // Swipe zone state
    const [zoneTouch, setZoneTouch] = useState<{ x: number; y: number } | null>(null);
    const [zoneActive, setZoneActive] = useState<ReviewButton | null>(null);

    // Drag handle state (mobile only)
    const [cardFlex, setCardFlex] = useState<number>(CARD_FLEX_DEFAULT);
    const [isDraggingHandle, setIsDraggingHandle] = useState(false);
    const [hasEverDragged, setHasEverDragged] = useState(false);
    const handleDragStartY = useRef<number | null>(null);
    const handleDragStartFlex = useRef<number>(CARD_FLEX_DEFAULT);
    const containerRef = useRef<HTMLDivElement>(null);

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

    // Zone flex = tổng flex - cardFlex, tối thiểu 2
    const zoneFlex = Math.max(2, (CARD_FLEX_MAX + 2) - cardFlex);

    // Load saved preference
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const v = parseFloat(saved);
                if (v >= CARD_FLEX_MIN && v <= CARD_FLEX_MAX) {
                    setCardFlex(v);
                    if (v !== CARD_FLEX_DEFAULT) setHasEverDragged(true);
                }
            }
        } catch { }
    }, []);

    useEffect(() => {
        if (hasInitialized.current) return;
        const shuffled = [...words].sort(() => Math.random() - 0.5);
        setStudyQueue(shuffled);
        setLocalCurrentWord(shuffled[0] || null);
        hasInitialized.current = true;
    }, [words]);

    useEffect(() => { return () => { hasInitialized.current = false; }; }, []);

    const switchWord = (newWord: DueWord | null) => {
        setIsAnimating(true);
        setTimeout(() => { setLocalCurrentWord(newWord); resetModeState(); setIsAnimating(false); }, 100);
    };

    const resetModeState = () => { setSelectedAnswer(null); setTypingInput(''); setTypingStatus('idle'); };

    const handleSrsButton = useCallback(async (button: ReviewButton) => {
        if (!localCurrentWord || isSubmitting) return;
        setIsSubmitting(true);
        const currentId = getWordId(localCurrentWord);
        let nextInterval = 1;
        try {
            const res = await srsApi.submitReview(currentId, localCurrentWord.wordType, button);
            nextInterval = res.interval;
        } catch { }
        const newResults = [...results, { word: localCurrentWord as any, button, nextInterval }];
        setResults(newResults);
        const newQueue = studyQueue.filter(w => getWordId(w) !== currentId);
        setStudyQueue(newQueue);
        if (newQueue.length === 0) { setShowSummary(true); } else { switchWord(newQueue[0]); }
        setIsSubmitting(false);
    }, [localCurrentWord, studyQueue, results, isSubmitting]);

    const handleQuizAnswer = (wordId: string) => {
        if (selectedAnswer) return;
        setSelectedAnswer(wordId);
        setTimeout(() => handleSrsButton(wordId === getWordId(localCurrentWord) ? 'good' : 'again'), 800);
    };

    const handleTypingSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (typingStatus !== 'idle') return;
        if (typingInput.trim().toLowerCase() === getWordText(localCurrentWord).trim().toLowerCase()) {
            setTypingStatus('correct');
            setTimeout(() => handleSrsButton('good'), 800);
        } else { setTypingStatus('wrong'); }
    };

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!localCurrentWord) return;
            const btn = SRS_BUTTONS.find(b => b.hotkey === e.key);
            if (btn && mode === 'flashcard') handleSrsButton(btn.key);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [localCurrentWord, mode, handleSrsButton]);

    useEffect(() => {
        if (mode === 'quiz' && localCurrentWord) {
            const correctId = getWordId(localCurrentWord);
            const others = words.filter(w => getWordId(w) !== correctId);
            const options = [localCurrentWord, ...others.sort(() => 0.5 - Math.random()).slice(0, 3)].sort(() => 0.5 - Math.random());
            setQuizOptions(options);
            setSelectedAnswer(null);
        }
    }, [localCurrentWord, mode, words]);

    // === SWIPE ZONE ===
    const getSwipeDir = (dx: number, dy: number): ReviewButton | null => {
        if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return null;
        if (Math.abs(dy) > Math.abs(dx)) return dy < 0 ? 'hard' : 'again';
        return dx < 0 ? 'easy' : 'good';
    };
    const handleZoneTouchStart = (e: React.TouchEvent) => {
        if (isDraggingHandle) return;
        e.stopPropagation();
        const t = e.targetTouches[0];
        setZoneTouch({ x: t.clientX, y: t.clientY });
        setZoneActive(null);
    };
    const handleZoneTouchMove = (e: React.TouchEvent) => {
        if (isDraggingHandle) return;
        e.stopPropagation();
        if (!zoneTouch) return;
        const t = e.targetTouches[0];
        setZoneActive(getSwipeDir(t.clientX - zoneTouch.x, t.clientY - zoneTouch.y));
    };
    const handleZoneTouchEnd = (e: React.TouchEvent) => {
        if (isDraggingHandle) return;
        e.stopPropagation();
        if (zoneActive) handleSrsButton(zoneActive);
        setZoneTouch(null);
        setZoneActive(null);
    };

    // === DRAG HANDLE ===
    const handleDragTouchStart = (e: React.TouchEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setIsDraggingHandle(true);
        setHasEverDragged(true);
        handleDragStartY.current = e.targetTouches[0].clientY;
        handleDragStartFlex.current = cardFlex;
    };

    const handleDragTouchMove = useCallback((e: TouchEvent) => {
        if (!isDraggingHandle || handleDragStartY.current === null) return;
        e.preventDefault();
        const dy = e.targetTouches[0].clientY - handleDragStartY.current;
        const containerH = containerRef.current?.clientHeight ?? 500;
        const flexDelta = (dy / containerH) * (CARD_FLEX_MAX - CARD_FLEX_MIN);
        const newFlex = Math.min(CARD_FLEX_MAX, Math.max(CARD_FLEX_MIN, handleDragStartFlex.current + flexDelta));
        setCardFlex(newFlex);
    }, [isDraggingHandle]);

    const handleDragTouchEnd = useCallback(() => {
        if (!isDraggingHandle) return;
        setIsDraggingHandle(false);
        handleDragStartY.current = null;
        // Snap về giá trị gần nhất với step 0.5
        setCardFlex(prev => {
            const snapped = Math.round(prev * 2) / 2;
            const clamped = Math.min(CARD_FLEX_MAX, Math.max(CARD_FLEX_MIN, snapped));
            try { localStorage.setItem(STORAGE_KEY, String(clamped)); } catch { }
            return clamped;
        });
    }, [isDraggingHandle]);

    // Global listeners để bắt move/end dù ngón tay rời khỏi handle
    useEffect(() => {
        if (isDraggingHandle) {
            window.addEventListener('touchmove', handleDragTouchMove, { passive: false });
            window.addEventListener('touchend', handleDragTouchEnd);
        }
        return () => {
            window.removeEventListener('touchmove', handleDragTouchMove);
            window.removeEventListener('touchend', handleDragTouchEnd);
        };
    }, [isDraggingHandle, handleDragTouchMove, handleDragTouchEnd]);

    // Dot indicator trong swipe zone
    const dotOffsetX = zoneActive === 'easy' ? -16 : zoneActive === 'good' ? 16 : 0;
    const dotOffsetY = zoneActive === 'hard' ? -16 : zoneActive === 'again' ? 16 : 0;
    const dotColor = zoneActive ? ZONE_CONFIG.find(z => z.key === zoneActive)?.textColor ?? '#3f3f46' : '#3f3f46';

    if (showSummary) {
        return (
            <SmartReviewSummary
                results={results}
                onClose={() => router.push(`/smart-review?tab=${sessionStorage.getItem('srs_learn_tab') || 'personal'}`)}
                onReviewAgain={() => {
                    const shuffled = [...words].sort(() => Math.random() - 0.5);
                    setStudyQueue(shuffled); setLocalCurrentWord(shuffled[0] || null);
                    setResults([]); setShowSummary(false); hasInitialized.current = true;
                }}
            />
        );
    }

    return (
        <div className="w-full bg-black text-white" style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* TOP BAR */}
            <div className="flex items-center justify-between px-4 border-b border-zinc-800 bg-black z-20 gap-4" style={{ height: '56px', flexShrink: 0 }}>
                <Button variant="ghost" size="sm"
                    onClick={() => router.push(`/smart-review?tab=${sessionStorage.getItem('srs_learn_tab') || 'personal'}`)}
                    className="h-9 -ml-2 text-zinc-400 hover:text-white hover:bg-zinc-900"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" /><span className="font-medium">Exit</span>
                </Button>
                <div className="flex-1 flex justify-center max-w-xs">
                    <div className="bg-zinc-900 p-1 rounded-lg flex w-full border border-zinc-800">
                        {[
                            { id: 'flashcard', icon: Layers,     label: 'Flashcard' },
                            { id: 'quiz',      icon: HelpCircle, label: 'Quiz'      },
                            { id: 'typing',    icon: Keyboard,   label: 'Typing'    },
                        ].map(item => (
                            <button key={item.id} onClick={() => setMode(item.id as Mode)}
                                className={cn('flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-all outline-none',
                                    mode === item.id ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                                )}
                            >
                                <item.icon className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <span className="text-xs text-zinc-400 font-mono">{displayLearned}/{totalCount}</span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-zinc-900 shrink-0">
                <div className="h-full bg-violet-500 transition-all duration-500"
                    style={{ width: `${totalCount > 0 ? (displayLearned / totalCount) * 100 : 0}%` }}
                />
            </div>

            {/* BODY */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div
                    style={{
                        flex: 1,
                        overflowY: mode === 'flashcard' ? 'hidden' : 'auto',
                        overflowX: 'hidden',
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                    className="px-4 py-4"
                >
                    <div className="max-w-4xl mx-auto w-full flex flex-col flex-1 min-h-0">

                        {!localCurrentWord && (
                            <div className="flex flex-col items-center justify-center flex-1">
                                <RotateCcw className="w-10 h-10 animate-spin text-zinc-600 mb-3" />
                                <p className="text-zinc-500">Loading...</p>
                            </div>
                        )}

                        {localCurrentWord && (
                            <div className={cn(
                                'w-full flex flex-col flex-1 min-h-0 transition-opacity duration-300',
                                isAnimating ? 'opacity-0' : 'opacity-100'
                            )}>

                                {/* ══ FLASHCARD MODE ══ */}
                                {mode === 'flashcard' && (
                                    <div ref={containerRef} className="flex flex-col flex-1 min-h-0">

                                        {/* DESKTOP: flex-1 card + 4 nút */}
                                        <div className="hidden md:flex flex-col flex-1 min-h-0 gap-3">
                                            <div className="flex-1 min-h-0">
                                                <Flashcard word={localCurrentWord} className="text-white w-full h-full shadow-2xl" />
                                            </div>
                                            <div className="shrink-0 grid grid-cols-4 gap-2 pt-3 border-t border-zinc-900/50">
                                                {SRS_BUTTONS.map(btn => (
                                                    <button key={btn.key} onClick={() => handleSrsButton(btn.key)}
                                                        disabled={isAnimating || isSubmitting}
                                                        className={cn('flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all disabled:opacity-40', btn.className)}
                                                    >
                                                        <span className="font-bold text-sm">{btn.label}</span>
                                                        <span className="text-[10px] opacity-70">{btn.sublabel}</span>
                                                        <span className="text-[10px] opacity-40 mt-0.5">[{btn.hotkey}]</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* MOBILE: card + drag handle + swipe zone */}
                                        <div className="flex md:hidden flex-col flex-1 min-h-0">

                                            {/* Flashcard */}
                                            <div style={{
                                                flex: cardFlex,
                                                minHeight: 0,
                                                transition: isDraggingHandle ? 'none' : 'flex 0.2s ease',
                                            }}>
                                                <Flashcard word={localCurrentWord} className="text-white w-full h-full shadow-2xl" />
                                            </div>

                                            {/* DRAG HANDLE */}
                                            <div
                                                className="shrink-0 flex flex-col items-center justify-center gap-1 select-none"
                                                style={{ height: '28px', touchAction: 'none', cursor: 'ns-resize' }}
                                                onTouchStart={handleDragTouchStart}
                                            >
                                                <div
                                                    className="rounded-full transition-all duration-150"
                                                    style={{
                                                        width: isDraggingHandle ? '48px' : '32px',
                                                        height: '4px',
                                                        background: isDraggingHandle ? '#8b5cf6' : '#3f3f46',
                                                        boxShadow: isDraggingHandle ? '0 0 10px rgba(139,92,246,0.6)' : 'none',
                                                    }}
                                                />
                                                {/* Hint lần đầu */}
                                                {!hasEverDragged && (
                                                    <span className="text-[9px] text-zinc-700 tracking-wider pointer-events-none">
                                                        kéo để điều chỉnh
                                                    </span>
                                                )}
                                            </div>

                                            {/* SWIPE ZONE */}
                                            <div
                                                className="relative rounded-2xl overflow-hidden border border-zinc-800/60"
                                                style={{
                                                    flex: zoneFlex,
                                                    minHeight: 0,
                                                    background: '#0a0a0a',
                                                    touchAction: 'none',
                                                    transition: isDraggingHandle ? 'none' : 'flex 0.2s ease',
                                                }}
                                                onTouchStart={handleZoneTouchStart}
                                                onTouchMove={handleZoneTouchMove}
                                                onTouchEnd={handleZoneTouchEnd}
                                            >
                                                {ZONE_CONFIG.map(zone => {
                                                    const isActive = zoneActive === zone.key;
                                                    const isOther = zoneActive !== null && !isActive;
                                                    const posStyle: React.CSSProperties =
                                                        zone.position === 'top'    ? { top: 0, left: 0, right: 0, height: '33%', borderBottom: '1px solid #1a1a1a', flexDirection: 'row', gap: '5px' } :
                                                        zone.position === 'bottom' ? { bottom: 0, left: 0, right: 0, height: '33%', borderTop:    '1px solid #1a1a1a', flexDirection: 'row', gap: '5px' } :
                                                        zone.position === 'left'   ? { top: '33%', bottom: '33%', left: 0,   width: '28%', borderRight: '1px solid #1a1a1a', flexDirection: 'column', gap: '2px' } :
                                                                                     { top: '33%', bottom: '33%', right: 0,  width: '28%', borderLeft:  '1px solid #1a1a1a', flexDirection: 'column', gap: '2px' };
                                                    return (
                                                        <div
                                                            key={zone.key}
                                                            style={{
                                                                position: 'absolute',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                background: isActive ? zone.activeColor : zone.bgColor,
                                                                opacity: isOther ? 0.2 : 1,
                                                                transition: 'background 0.1s, opacity 0.1s',
                                                                ...posStyle,
                                                            }}
                                                        >
                                                            <span style={{ fontSize: isActive ? '20px' : '15px', color: zone.textColor, lineHeight: 1, transition: 'font-size 0.1s', fontWeight: 700 }}>
                                                                {zone.arrow}
                                                            </span>
                                                            <span style={{ fontSize: isActive ? '14px' : '11px', fontWeight: 700, color: zone.textColor, transition: 'font-size 0.1s' }}>
                                                                {zone.label}
                                                            </span>
                                                        </div>
                                                    );
                                                })}

                                                {/* Chấm tròn theo ngón tay */}
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '50%', left: '50%',
                                                    transform: `translate(calc(-50% + ${dotOffsetX}px), calc(-50% + ${dotOffsetY}px))`,
                                                    width: zoneActive ? '12px' : '8px',
                                                    height: zoneActive ? '12px' : '8px',
                                                    borderRadius: '50%',
                                                    background: dotColor,
                                                    transition: 'transform 0.08s, background 0.1s, width 0.1s, height 0.1s',
                                                    pointerEvents: 'none',
                                                    zIndex: 10,
                                                }} />
                                            </div>
                                        </div>
                                    </div>
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
                                            {quizOptions.map((opt) => {
                                                const optId = getWordId(opt);
                                                const isCorrect = optId === getWordId(localCurrentWord);
                                                const isSelected = selectedAnswer === optId;
                                                let style = 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300';
                                                if (selectedAnswer) {
                                                    if (isCorrect) style = 'border-green-900 bg-green-950/40 text-green-400 font-bold ring-1 ring-green-900';
                                                    else if (isSelected) style = 'border-red-900 bg-red-950/40 text-red-400 opacity-80';
                                                    else style = 'opacity-30 grayscale border-transparent';
                                                }
                                                return (
                                                    <button key={optId}
                                                        className={cn('h-14 px-4 rounded-2xl border text-base font-medium transition-all shadow-sm flex items-center justify-center text-center active:scale-[0.98]', style)}
                                                        onClick={() => handleQuizAnswer(optId)} disabled={!!selectedAnswer}
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
                                                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-3 shrink-0">Type the English word</p>
                                                <h2 className={cn('font-normal leading-relaxed text-white mb-3 break-words', currentWordDef.length > 80 ? 'text-xl' : 'text-2xl')}>
                                                    "{currentWordDef}"
                                                </h2>
                                                {(localCurrentWord as any).type && (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                                                        {Array.isArray((localCurrentWord as any).type) ? (localCurrentWord as any).type.join(', ') : (localCurrentWord as any).type}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <form onSubmit={handleTypingSubmit} className="relative w-full">
                                            <Input autoFocus placeholder="Enter word..."
                                                className={cn('h-16 text-xl text-center rounded-2xl border-2 bg-black text-white placeholder:text-zinc-700 transition-all pr-12 focus:border-zinc-600 border-zinc-800 focus-visible:ring-0',
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
                                                <div className="h-full flex items-center justify-between px-4 bg-red-950/20 rounded-2xl border border-red-900/50 cursor-pointer hover:bg-red-950/30 transition-colors" onClick={() => handleSrsButton('again')}>
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

            {/* Keyboard hint — desktop only */}
            <div className="hidden md:flex items-center justify-center gap-6 py-2 border-t border-zinc-900 shrink-0">
                <span className="text-xs text-zinc-600">1 Again · 2 Hard · 3 Good · 4 Easy</span>
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
        </div>
    );
}