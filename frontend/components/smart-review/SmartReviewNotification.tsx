'use client';
import { useState, useEffect } from 'react';
import { Brain, X, Check } from 'lucide-react';
import { srsApi } from '../../lib/srsApi';
import { cn } from '../../lib/utils';

interface SmartReviewNotificationProps {
    onOpenSmartReview: (tab?: 'personal' | 'system') => void;
}

const DISMISSED_KEY = 'srs_notification_dismissed_date';

export function SmartReviewNotification({ onOpenSmartReview }: SmartReviewNotificationProps) {
    const [dueCount, setDueCount] = useState(0);
    const [duePersonal, setDuePersonal] = useState(0);
    const [dueSystem, setDueSystem] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissedToday, setIsDismissedToday] = useState(false);

    const getTodayString = () => new Date().toISOString().slice(0, 10); // "2025-01-15"

    useEffect(() => {
        // Kiểm tra đã dismiss hôm nay chưa
        const dismissed = localStorage.getItem(DISMISSED_KEY);
        if (dismissed === getTodayString()) {
            setIsDismissedToday(true);
            return;
        }

        // Lấy số từ đến hạn
        const load = async () => {
    try {
        const data = await srsApi.getDueWords();
        const total = data.personal.length + data.system.length;
        if (total > 0) {
            setDueCount(total);
            setDuePersonal(data.personal.length);
            setDueSystem(data.system.length);
            setIsVisible(true);
        }
    } catch {
        // silent
    }
};
        load();
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem(DISMISSED_KEY, getTodayString());
    };

    const handleDismissToday = () => {
        handleDismiss();
        setIsDismissedToday(true);
    };

    if (!isVisible || isDismissedToday) return null;

    return (
        <div className={cn(
            'fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md',
            'bg-zinc-900 border border-violet-800/60 rounded-2xl shadow-2xl shadow-violet-900/20',
            'animate-in slide-in-from-top-4 duration-300'
        )}>
            <div className="flex items-start gap-3 p-4">
                {/* Icon */}
                <div className="p-2 bg-violet-900/40 rounded-xl border border-violet-800/50 shrink-0">
                    <Brain className="w-5 h-5 text-violet-400" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">
                        {dueCount} word{dueCount > 1 ? 's' : ''} due for review!
                    </p>
                    <p className="text-zinc-400 text-xs mt-0.5">
                        Review now to keep your memory fresh.
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                        <button
    onClick={() => {
        handleDismiss();
        // Ưu tiên tab có từ, nếu cả 2 đều có thì vào personal trước
        if (duePersonal > 0 && dueSystem === 0) {
            onOpenSmartReview('personal');
        } else if (dueSystem > 0 && duePersonal === 0) {
            onOpenSmartReview('system');
        } else {
            onOpenSmartReview('personal'); // cả 2 đều có → vào personal
        }
    }}
    className="flex-1 py-1.5 px-3 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition-colors"
>
    Review Now
</button>
                        <button
                            onClick={handleDismissToday}
                            className="flex items-center gap-1 py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded-lg transition-colors"
                        >
                            <Check className="w-3 h-3" />
                            Not today
                        </button>
                    </div>
                </div>

                {/* X button */}
                <button
                    onClick={handleDismiss}
                    className="text-zinc-600 hover:text-white transition-colors shrink-0 mt-0.5"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}