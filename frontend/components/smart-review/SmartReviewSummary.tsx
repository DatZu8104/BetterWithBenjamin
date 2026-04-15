'use client';
import { Brain, RotateCcw, CheckCircle2, XCircle, TrendingUp, Calendar, Target } from 'lucide-react';
import { ReviewResult } from './SmartReviewStudy';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface SmartReviewSummaryProps {
    results: ReviewResult[];
    onClose: () => void;
    onReviewAgain: () => void;
}

const BUTTON_COLORS: Record<string, string> = {
    again: 'text-red-400 bg-red-950/30 border-red-900',
    hard:  'text-orange-400 bg-orange-950/30 border-orange-900',
    good:  'text-blue-400 bg-blue-950/30 border-blue-900',
    easy:  'text-green-400 bg-green-950/30 border-green-900',
};

export function SmartReviewSummary({ results, onClose, onReviewAgain }: SmartReviewSummaryProps) {
    const total = results.length;
    const correct = results.filter(r => r.button === 'good' || r.button === 'easy').length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    const again = results.filter(r => r.button === 'again').length;
    const hard  = results.filter(r => r.button === 'hard').length;
    const good  = results.filter(r => r.button === 'good').length;
    const easy  = results.filter(r => r.button === 'easy').length;

    const getMessage = () => {
        if (accuracy === 100) return { text: "Perfect session! Outstanding! 🎉", color: 'text-green-400' };
        if (accuracy >= 80)  return { text: "Great job! Keep it up! 💪",        color: 'text-blue-400'  };
        if (accuracy >= 50)  return { text: "Good effort! Review again soon.",   color: 'text-amber-400' };
        return                      { text: "Keep practicing — you'll get there!", color: 'text-zinc-400' };
    };

    const msg = getMessage();

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md">

                {/* Header */}
                <div className="flex flex-col items-center gap-3 p-6 border-b border-zinc-800">
                    <div className="p-3 bg-violet-900/30 rounded-2xl border border-violet-800/50">
                        <Brain className="w-8 h-8 text-violet-400" />
                    </div>
                    <h2 className="text-white font-bold text-xl">Session Complete!</h2>
                    <p className={cn('text-sm font-medium', msg.color)}>{msg.text}</p>
                </div>

                {/* Stats */}
                <div className="p-6 space-y-4">

                    {/* Accuracy big number */}
                    <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                        <div className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-zinc-500" />
                            <span className="text-zinc-400 text-sm">Accuracy</span>
                        </div>
                        <span className={cn(
                            'text-2xl font-bold',
                            accuracy >= 80 ? 'text-green-400' : accuracy >= 50 ? 'text-amber-400' : 'text-red-400'
                        )}>
                            {accuracy}%
                        </span>
                    </div>

                    {/* Button breakdown */}
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { label: 'Again', count: again, key: 'again' },
                            { label: 'Hard',  count: hard,  key: 'hard'  },
                            { label: 'Good',  count: good,  key: 'good'  },
                            { label: 'Easy',  count: easy,  key: 'easy'  },
                        ].map(item => (
                            <div key={item.key}
                                className={cn(
                                    'flex items-center justify-between px-3 py-2 rounded-xl border',
                                    BUTTON_COLORS[item.key]
                                )}>
                                <span className="text-sm font-medium">{item.label}</span>
                                <span className="font-bold">{item.count}</span>
                            </div>
                        ))}
                    </div>

                    {/* Word list result */}
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {results.map((r, i) => (
                            <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-zinc-900/50">
                                <div className="flex items-center gap-2 min-w-0">
                                    {(r.button === 'good' || r.button === 'easy')
                                        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                                        : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                    }
                                    <span className="text-white text-sm font-medium truncate">
                                        {r.word.word || r.word.english}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={cn(
                                        'text-xs px-2 py-0.5 rounded-full border font-medium',
                                        BUTTON_COLORS[r.button]
                                    )}>
                                        {r.button}
                                    </span>
                                    <div className="flex items-center gap-1 text-zinc-500">
                                        <Calendar className="w-3 h-3" />
                                        <span className="text-xs">{r.nextInterval}d</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-4 border-t border-zinc-800">
                    <Button
                        variant="outline"
                        onClick={onReviewAgain}
                        className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Review Again
                    </Button>
                    <Button
                        onClick={onClose}
                        className="flex-1 bg-violet-600 hover:bg-violet-500 text-white gap-2"
                    >
                        <TrendingUp className="w-4 h-4" />
                        Done
                    </Button>
                </div>
            </div>
        </div>
    );
}