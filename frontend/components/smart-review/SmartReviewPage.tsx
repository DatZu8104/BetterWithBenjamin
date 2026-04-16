'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, RefreshCw, Shuffle, User, Library } from 'lucide-react';
import { srsApi, DueWord } from '../../lib/srsApi';
import { SmartReviewCard } from './SmartReviewCard';
import { SmartReviewDevTools } from './SmartReviewDevTools';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

type Tab = 'personal' | 'system';
const QUICK_SELECT = [10, 20, 30];

interface SmartReviewPageProps {
    defaultTab?: 'personal' | 'system';
}

export function SmartReviewPage({ defaultTab = 'personal' }: SmartReviewPageProps) {
    const router = useRouter();
    const [tab, setTab] = useState<Tab>(defaultTab);

    useEffect(() => {
        setTab(defaultTab);
    }, [defaultTab]);
    const [personalWords, setPersonalWords] = useState<DueWord[]>([]);
    const [systemWords, setSystemWords] = useState<DueWord[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);

    const isAdmin = typeof window !== 'undefined'
        ? sessionStorage.getItem('user_role') === 'admin'
        : false;

    const loadWords = async () => {
        setIsLoading(true);
        try {
            const data = await srsApi.getDueWords();
            setPersonalWords(data.personal);
            setSystemWords(data.system);
            const allIds = [...data.personal, ...data.system].map(w => w._id);
            setSelectedIds(new Set(allIds));
        } catch {
            // silent
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadWords(); }, []);

    const activeWords = tab === 'personal' ? personalWords : systemWords;

    const toggleWord = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        const allIds = activeWords.map(w => w._id);
        const allSelected = allIds.every(id => selectedIds.has(id));
        setSelectedIds(prev => {
            const next = new Set(prev);
            allIds.forEach(id => allSelected ? next.delete(id) : next.add(id));
            return next;
        });
    };

    const quickSelect = (count: number) => {
        const shuffled = [...activeWords].sort(() => Math.random() - 0.5).slice(0, count);
        setSelectedIds(prev => {
            const next = new Set(prev);
            activeWords.forEach(w => next.delete(w._id));
            shuffled.forEach(w => next.add(w._id));
            return next;
        });
    };

    const selectedWords = useMemo(() => {
        const allWords = [...personalWords, ...systemWords];
        return allWords.filter(w => selectedIds.has(w._id));
    }, [selectedIds, personalWords, systemWords]);

    const handleStart = () => {
        if (selectedWords.length === 0) return;
        // Lưu words vào sessionStorage để trang learn đọc
        sessionStorage.setItem('srs_learn_words', JSON.stringify(selectedWords));
        router.push('/smart-review/learn');
    };

    const allActiveSelected = activeWords.length > 0 &&
        activeWords.every(w => selectedIds.has(w._id));

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">

            {/* Page header */}
            <div className="border-b border-zinc-800 px-4 sm:px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-900/30 rounded-xl border border-violet-800/50">
                        <Brain className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-white font-bold text-lg">Smart Review</h1>
                        <p className="text-zinc-500 text-sm">
                            {isLoading
                                ? 'Loading...'
                                : `${personalWords.length + systemWords.length} words due today`
                            }
                        </p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="text-zinc-400 hover:text-white"
                >
                    ← Back
                </Button>
            </div>
            {/* Tab indicator — không có nút chuyển */}
<div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
    {tab === 'personal'
        ? <><User className="w-4 h-4 text-blue-400" /><span className="text-sm font-semibold text-blue-300">Personal vocabulary</span></>
        : <><Library className="w-4 h-4 text-purple-400" /><span className="text-sm font-semibold text-purple-300">System (Oxford)</span></>
    }
    <span className="text-xs text-zinc-500 ml-1">
        — {activeWords.length} words due
    </span>
</div>

            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 flex-wrap">
                <button
                    onClick={toggleAll}
                    className="text-xs text-zinc-400 hover:text-white transition-colors underline underline-offset-2"
                >
                    {allActiveSelected ? 'Deselect all' : 'Select all'}
                </button>
                <span className="text-zinc-700">|</span>
                <div className="flex items-center gap-1.5">
                    <Shuffle className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-xs text-zinc-500">Random:</span>
                    {QUICK_SELECT.map(n => (
                        <button
                            key={n}
                            onClick={() => quickSelect(n)}
                            disabled={activeWords.length < n}
                            className="text-xs px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            {n}
                        </button>
                    ))}
                </div>
            </div>

            {/* Word list */}
            <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                        <RefreshCw className="w-6 h-6 text-zinc-600 animate-spin" />
                    </div>
                ) : activeWords.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-2">
                        <Brain className="w-10 h-10 text-zinc-700" />
                        <p className="text-zinc-500 text-sm">No words due today</p>
                        <p className="text-zinc-600 text-xs">Keep learning to build your review queue!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl mx-auto">
                        {activeWords.map(w => (
                            <SmartReviewCard
                                key={w._id}
                                word={w.word || w.english || ''}
                                definition={w.definition || w.definitions?.[0]?.definition || ''}
                                wordType={w.wordType}
                                srs={w.srs}
                                isSelected={selectedIds.has(w._id)}
                                onToggle={() => toggleWord(w._id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Dev Tools — admin only */}
            {isAdmin && (
                <div className="px-4 py-3 border-t border-zinc-800 max-w-5xl mx-auto w-full">
                    <SmartReviewDevTools onRefresh={loadWords} />
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-zinc-800">
                <span className="text-sm text-zinc-400">
                    <span className="text-white font-bold">{selectedWords.length}</span> words selected
                </span>
                <Button
                    onClick={handleStart}
                    disabled={selectedWords.length === 0}
                    className="bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40 px-8"
                >
                    Start Review ({selectedWords.length})
                </Button>
            </div>
        </div>
    );
}