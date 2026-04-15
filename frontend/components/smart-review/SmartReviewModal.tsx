'use client';
import { useState, useEffect, useMemo } from 'react';
import { X, Brain, RefreshCw, Shuffle } from 'lucide-react';
import { srsApi, DueWord, WordType } from '../../lib/srsApi';
import { SmartReviewCard } from './SmartReviewCard';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface SmartReviewModalProps {
    onClose: () => void;
    onStartSession: (words: DueWord[]) => void;
}

type Tab = 'personal' | 'system';

const QUICK_SELECT = [10, 20, 30];

export function SmartReviewModal({ onClose, onStartSession }: SmartReviewModalProps) {
    const [tab, setTab] = useState<Tab>('personal');
    const [personalWords, setPersonalWords] = useState<DueWord[]>([]);
    const [systemWords, setSystemWords] = useState<DueWord[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const data = await srsApi.getDueWords();
                setPersonalWords(data.personal);
                setSystemWords(data.system);
                // Mặc định chọn tất cả
                const allIds = [...data.personal, ...data.system].map(w => w._id);
                setSelectedIds(new Set(allIds));
            } catch {
                // silent
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

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
            // Bỏ chọn tất cả từ tab hiện tại trước
            activeWords.forEach(w => next.delete(w._id));
            // Chọn random
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
        onStartSession(selectedWords);
    };

    const allActiveSelected = activeWords.length > 0 &&
        activeWords.every(w => selectedIds.has(w._id));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-zinc-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-900/30 rounded-xl border border-violet-800/50">
                            <Brain className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-lg">Smart Review</h2>
                            <p className="text-zinc-500 text-sm">
                                {isLoading ? 'Loading...' : `${personalWords.length + systemWords.length} words due today`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-4 border-b border-zinc-800 shrink-0">
                    {(['personal', 'system'] as Tab[]).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={cn(
                                'flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition-all',
                                tab === t
                                    ? t === 'personal'
                                        ? 'bg-blue-900/50 text-blue-300 border border-blue-800'
                                        : 'bg-purple-900/50 text-purple-300 border border-purple-800'
                                    : 'text-zinc-500 hover:text-zinc-300'
                            )}
                        >
                            {t === 'personal' ? 'Personal' : 'System (Oxford)'}
                            <span className="ml-2 text-xs opacity-70">
                                ({t === 'personal' ? personalWords.length : systemWords.length})
                            </span>
                        </button>
                    ))}
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 shrink-0 flex-wrap">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {activeWords.map(w => (
                                <SmartReviewCard
                                    key={w._id}
                                    word={w.word || w.english || ''}
                                    definition={
                                        w.definition ||
                                        (w.definitions?.[0]?.definition) ||
                                        ''
                                    }
                                    wordType={w.wordType}
                                    srs={w.srs}
                                    isSelected={selectedIds.has(w._id)}
                                    onToggle={() => toggleWord(w._id)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-zinc-800 shrink-0">
                    <span className="text-sm text-zinc-400">
                        <span className="text-white font-bold">{selectedWords.length}</span> words selected
                    </span>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleStart}
                            disabled={selectedWords.length === 0}
                            className="bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40"
                        >
                            Start Review ({selectedWords.length})
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}