'use client';
import { cn } from '../../lib/utils';
import { SrsStats, WordType } from '../../lib/srsApi';
import { Calendar, RotateCcw, Target, TrendingUp, Clock } from 'lucide-react';

interface SmartReviewCardProps {
    word: string;
    definition: string;
    wordType: WordType;
    srs: SrsStats | null;
    isSelected: boolean;
    onToggle: () => void;
}

function getDueLabel(nextReview: string | null): {
    label: string;
    color: string;
} {
    if (!nextReview) return { label: 'Not reviewed', color: 'text-zinc-500' };

    const now = new Date();
    const due = new Date(nextReview);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: `Overdue ${Math.abs(diffDays)}d`, color: 'text-red-400' };
    if (diffDays === 0) return { label: 'Due today', color: 'text-amber-400' };
    if (diffDays === 1) return { label: 'Due tomorrow', color: 'text-yellow-400' };
    return { label: `In ${diffDays} days`, color: 'text-zinc-400' };
}

function getAccuracyColor(accuracy: number): string {
    if (accuracy >= 80) return 'text-green-400';
    if (accuracy >= 50) return 'text-amber-400';
    return 'text-red-400';
}

export function SmartReviewCard({
    word,
    definition,
    wordType,
    srs,
    isSelected,
    onToggle
}: SmartReviewCardProps) {
    const due = getDueLabel(srs?.nextReview ?? null);

    return (
        <div
            onClick={onToggle}
            className={cn(
                'relative flex flex-col gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 select-none',
                isSelected
                    ? 'border-violet-500 bg-violet-950/30'
                    : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'
            )}
        >
            {/* Checkbox góc trên phải */}
            <div className={cn(
                'absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                isSelected ? 'border-violet-500 bg-violet-500' : 'border-zinc-600'
            )}>
                {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                )}
            </div>

            {/* Word + type badge */}
            <div className="pr-6">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-bold text-base">{word}</span>
                    <span className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider',
                        wordType === 'system'
                            ? 'bg-purple-900/50 text-purple-300 border border-purple-800'
                            : 'bg-blue-900/50 text-blue-300 border border-blue-800'
                    )}>
                        {wordType === 'system' ? 'Oxford' : 'Personal'}
                    </span>
                </div>
                <p className="text-zinc-400 text-sm mt-1 line-clamp-2">{definition}</p>
            </div>

            {/* Stats row */}
            {srs ? (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
                    {/* Due date */}
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className={cn('text-xs font-medium', due.color)}>
                            {due.label}
                        </span>
                    </div>

                    {/* Accuracy */}
                    <div className="flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className={cn('text-xs font-medium', getAccuracyColor(srs.accuracy))}>
                            {srs.accuracy}% accuracy
                        </span>
                    </div>

                    {/* Total SRS reviews */}
                    <div className="flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="text-xs text-zinc-400">
                            {srs.totalReviews} SRS reviews
                        </span>
                    </div>

                    {/* Interval */}
                    <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="text-xs text-zinc-400">
                            Every {srs.interval}d
                        </span>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-800">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-xs text-zinc-500">No SRS data yet</span>
                </div>
            )}
        </div>
    );
}