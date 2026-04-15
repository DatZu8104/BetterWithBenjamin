'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import { Volume2, ChevronLeft, ChevronRight } from 'lucide-react';
import { srsApi, DueWord, ReviewButton, WordType } from '../../lib/srsApi';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface SmartReviewStudyProps {
    words: DueWord[];
    onFinish: (results: ReviewResult[]) => void;
    onExit: () => void;
}

export interface ReviewResult {
    word: DueWord;
    button: ReviewButton;
    nextInterval: number;
}

const BUTTON_CONFIG: {
    key: ReviewButton;
    label: string;
    sublabel: string;
    color: string;
    hotkey: string;
}[] = [
    { key: 'again',  label: 'Again',  sublabel: 'Forgot',         color: 'border-red-800 bg-red-950/40 hover:bg-red-900/50 text-red-300',    hotkey: '1' },
    { key: 'hard',   label: 'Hard',   sublabel: 'Difficult',       color: 'border-orange-800 bg-orange-950/40 hover:bg-orange-900/50 text-orange-300', hotkey: '2' },
    { key: 'good',   label: 'Good',   sublabel: 'Remembered',      color: 'border-blue-800 bg-blue-950/40 hover:bg-blue-900/50 text-blue-300', hotkey: '3' },
    { key: 'easy',   label: 'Easy',   sublabel: 'Too easy',        color: 'border-green-800 bg-green-950/40 hover:bg-green-900/50 text-green-300', hotkey: '4' },
];

export function SmartReviewStudy({ words, onFinish, onExit }: SmartReviewStudyProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isRevealed, setIsRevealed] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [results, setResults] = useState<ReviewResult[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const hasHandled = useRef(false);

    const currentWord = words[currentIndex];
    const progress = ((currentIndex) / words.length) * 100;

    const getWordText = (w: DueWord) => w.word || w.english || '';
    const getDefinition = (w: DueWord) =>
        w.definition || w.definitions?.[0]?.definition || '';
    const getIpa = (w: DueWord): string =>
        (w as any).phonetics?.us || (w as any).ipa || '';
    const getExample = (w: DueWord): string =>
        (w as any).example || (w as any).definitions?.[0]?.examples?.[0] || '';

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

    // Auto speak khi chuyển từ
    useEffect(() => {
        if (currentWord) speakWord(getWordText(currentWord));
        setIsRevealed(false);
        hasHandled.current = false;
    }, [currentIndex]);

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                if (!isRevealed) setIsRevealed(true);
                return;
            }
            if (!isRevealed) return;
            const btn = BUTTON_CONFIG.find(b => b.hotkey === e.key);
            if (btn) handleAnswer(btn.key);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isRevealed, currentIndex, isSubmitting]);

    const handleAnswer = useCallback(async (button: ReviewButton) => {
        if (isSubmitting || hasHandled.current || !currentWord) return;
        hasHandled.current = true;
        setIsSubmitting(true);

        let nextInterval = 1;
        try {
            const res = await srsApi.submitReview(
                currentWord._id,
                currentWord.wordType as WordType,
                button
            );
            nextInterval = res.interval;
        } catch {
            // silent — không làm gián đoạn session
        }

        const newResult: ReviewResult = { word: currentWord, button, nextInterval };
        const newResults = [...results, newResult];
        setResults(newResults);

        // Chuyển từ tiếp theo
        setIsAnimating(true);
        setTimeout(() => {
            if (currentIndex + 1 >= words.length) {
                onFinish(newResults);
            } else {
                setCurrentIndex(i => i + 1);
                setIsAnimating(false);
            }
            setIsSubmitting(false);
        }, 200);

    }, [isSubmitting, currentWord, results, currentIndex, words.length, onFinish]);

    if (!currentWord) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">

            {/* Top bar */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-800 shrink-0">
                <Button variant="ghost" size="sm" onClick={onExit}
                    className="text-zinc-400 hover:text-white">
                    <ChevronLeft className="w-4 h-4 mr-1" /> Exit
                </Button>
                <span className="text-sm text-zinc-400 font-medium">
                    {currentIndex + 1} / {words.length}
                </span>
                <div className="w-16" />
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-zinc-900 shrink-0">
                <div
                    className="h-full bg-violet-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Card area */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 overflow-hidden">
                <div className={cn(
                    'w-full max-w-xl transition-all duration-200',
                    isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
                )}>

                    {/* Word card */}
                    <div
                        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 cursor-pointer select-none"
                        onClick={() => !isRevealed && setIsRevealed(true)}
                    >
                        {/* Word + audio */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <h2 className="text-4xl font-bold text-white break-words leading-tight">
                                {getWordText(currentWord)}
                            </h2>
                            <button
                                onClick={(e) => { e.stopPropagation(); speakWord(getWordText(currentWord)); }}
                                className="mt-1 p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all shrink-0"
                            >
                                <Volume2 className="w-5 h-5" />
                            </button>
                        </div>

                        {/* IPA */}
                        {getIpa(currentWord) && (
                            <p className="text-zinc-500 text-sm mb-4 font-mono">
                                /{getIpa(currentWord)}/
                            </p>
                        )}

                        {/* Word type badge */}
                        {(currentWord as any).type && (
                            <span className="text-xs text-blue-400 italic">
                                {Array.isArray((currentWord as any).type)
                                    ? (currentWord as any).type.join(', ')
                                    : (currentWord as any).type}
                            </span>
                        )}

                        {/* Revealed content */}
                        {isRevealed ? (
                            <div className="mt-4 pt-4 border-t border-zinc-700 space-y-3 animate-in fade-in duration-200">
                                <p className="text-white text-lg leading-relaxed">
                                    {getDefinition(currentWord)}
                                </p>
                                {getExample(currentWord) && (
                                    <p className="text-zinc-400 text-sm italic border-l-2 border-zinc-700 pl-3">
                                        "{getExample(currentWord)}"
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="mt-4 pt-4 border-t border-zinc-800">
                                <p className="text-zinc-600 text-sm text-center">
                                    Tap to reveal · Space / Enter
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Answer buttons */}
                    {isRevealed ? (
                        <div className="grid grid-cols-4 gap-2 mt-4">
                            {BUTTON_CONFIG.map(btn => (
                                <button
                                    key={btn.key}
                                    onClick={() => handleAnswer(btn.key)}
                                    disabled={isSubmitting}
                                    className={cn(
                                        'flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all disabled:opacity-40',
                                        btn.color
                                    )}
                                >
                                    <span className="font-bold text-sm">{btn.label}</span>
                                    <span className="text-[10px] opacity-70">{btn.sublabel}</span>
                                    <span className="text-[10px] opacity-40 mt-0.5">[{btn.hotkey}]</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <Button
                            onClick={() => setIsRevealed(true)}
                            className="w-full mt-4 bg-zinc-800 hover:bg-zinc-700 text-white h-12 rounded-xl"
                        >
                            Show Answer
                            <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Keyboard hint — desktop only */}
            <div className="hidden md:flex items-center justify-center gap-6 py-3 border-t border-zinc-900 shrink-0">
                <span className="text-xs text-zinc-600">Space / Enter — reveal</span>
                <span className="text-xs text-zinc-600">1 Again · 2 Hard · 3 Good · 4 Easy</span>
            </div>
        </div>
    );
}