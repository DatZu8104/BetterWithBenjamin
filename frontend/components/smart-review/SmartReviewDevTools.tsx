'use client';
import { useState, useEffect } from 'react';
import { Zap, RotateCcw, ChevronDown, ChevronUp, FlaskConical } from 'lucide-react';
import { srsApi } from '../../lib/srsApi';
import { cn } from '../../lib/utils';

interface SmartReviewDevToolsProps {
    onRefresh: () => void;
}

const SHIFT_OPTIONS = [
    { label: '+1 day',   days: 1  },
    { label: '+3 days',  days: 3  },
    { label: '+7 days',  days: 7  },
    { label: '+30 days', days: 30 },
];

// Key lưu vào sessionStorage
const SHIFTED_KEY = 'srs_dev_shifted_days';

export function SmartReviewDevTools({ onRefresh }: SmartReviewDevToolsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [lastMessage, setLastMessage] = useState<string | null>(null);

    // Đọc từ sessionStorage để giữ trạng thái khi đóng/mở modal
    const [shiftedDays, setShiftedDays] = useState<number>(() => {
        if (typeof window === 'undefined') return 0;
        return parseInt(sessionStorage.getItem(SHIFTED_KEY) || '0', 10);
    });

    const isShifted = shiftedDays > 0;

    const handleShift = async (days: number) => {
        setIsLoading(true);
        setLastMessage(null);
        try {
            const res = await srsApi.adminTimeShift(days);
            const newTotal = shiftedDays + days;
            setShiftedDays(newTotal);
            sessionStorage.setItem(SHIFTED_KEY, newTotal.toString());
            setLastMessage(`✓ ${res.message}`);
            onRefresh();
        } catch {
            setLastMessage('✗ Failed to shift time');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = async () => {
        setIsLoading(true);
        setLastMessage(null);
        try {
            const res = await srsApi.adminTimeReset();
            setShiftedDays(0);
            sessionStorage.removeItem(SHIFTED_KEY);
            setLastMessage(`✓ ${res.message}`);
            onRefresh();
        } catch {
            setLastMessage('✗ Failed to reset time');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="border border-amber-800/50 rounded-xl overflow-hidden">
            {/* Header — toggle */}
            <button
                onClick={() => setIsOpen(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-amber-950/30 hover:bg-amber-950/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                        Dev Tools
                    </span>
                    {/* Badge luôn hiện nếu đang shifted — kể cả khi panel đóng */}
                    {isShifted && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-700/50 font-medium">
                            +{shiftedDays}d shifted
                        </span>
                    )}
                </div>
                {isOpen
                    ? <ChevronUp className="w-3.5 h-3.5 text-amber-500" />
                    : <ChevronDown className="w-3.5 h-3.5 text-amber-500" />
                }
            </button>

            {/* Panel */}
            {isOpen && (
                <div className="px-3 py-3 bg-amber-950/10 space-y-3">
                    <p className="text-xs text-amber-400/70 leading-relaxed">
                        Simulate future dates to test SRS scheduling.
                        Reset restores all real review dates.
                    </p>

                    {/* Shift buttons — highlight nút đang active */}
                    <div>
                        <p className="text-[10px] text-amber-500/60 uppercase tracking-wider font-bold mb-1.5">
                            Fast forward {isShifted && <span className="text-amber-300">(total: +{shiftedDays}d)</span>}
                        </p>
                        <div className="grid grid-cols-4 gap-1.5">
                            {SHIFT_OPTIONS.map(opt => (
                                <button
                                    key={opt.days}
                                    onClick={() => handleShift(opt.days)}
                                    disabled={isLoading}
                                    className={cn(
                                        'py-2 px-1 rounded-lg border text-xs font-semibold transition-all',
                                        'flex items-center justify-center gap-1',
                                        'disabled:opacity-40 disabled:cursor-not-allowed',
                                        // Active nếu đây là số ngày đang shifted
                                        shiftedDays > 0 && shiftedDays % opt.days === 0 && opt.days === shiftedDays
                                            ? 'border-amber-500 bg-amber-900/60 text-amber-200 ring-1 ring-amber-600'
                                            : 'border-amber-800/60 bg-amber-900/20 text-amber-300 hover:bg-amber-900/40 hover:border-amber-700'
                                    )}
                                >
                                    <Zap className="w-3 h-3" />
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Reset button — chỉ hiện khi đang shifted */}
                    {isShifted && (
                        <button
                            onClick={handleReset}
                            disabled={isLoading}
                            className={cn(
                                'w-full py-2 px-3 rounded-lg border text-xs font-semibold transition-all',
                                'flex items-center justify-center gap-2',
                                'border-zinc-600 bg-zinc-800 hover:bg-zinc-700 text-zinc-200',
                                'disabled:opacity-40 disabled:cursor-not-allowed'
                            )}
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Reset to real dates
                        </button>
                    )}

                    {/* Last action message */}
                    {lastMessage && (
                        <p className={cn(
                            'text-xs px-2 py-1.5 rounded-lg font-medium',
                            lastMessage.startsWith('✓')
                                ? 'text-green-400 bg-green-950/30 border border-green-900/50'
                                : 'text-red-400 bg-red-950/30 border border-red-900/50'
                        )}>
                            {lastMessage}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}