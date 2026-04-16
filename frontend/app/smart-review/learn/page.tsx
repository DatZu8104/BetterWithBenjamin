'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SmartReviewLearn } from '@/components/smart-review/SmartReviewLearn';
import { DueWord } from '@/lib/srsApi';

export default function SmartReviewLearnRoute() {
    const router = useRouter();
    const [words, setWords] = useState<DueWord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Kiểm tra auth
        const token = sessionStorage.getItem('auth_token');
        if (!token) {
            router.replace('/');
            return;
        }

        // Đọc words từ sessionStorage do SmartReviewPage lưu
        const raw = sessionStorage.getItem('srs_learn_words');
        if (!raw) {
            // Không có words → quay về trang smart-review
            router.replace('/smart-review');
            return;
        }

        try {
            const parsed = JSON.parse(raw) as DueWord[];
            if (!parsed || parsed.length === 0) {
                router.replace('/smart-review');
                return;
            }
            setWords(parsed);
        } catch {
            router.replace('/smart-review');
            return;
        }

        setIsLoading(false);
    }, [router]);

    if (isLoading) return (
        <div className="h-screen bg-black flex items-center justify-center text-white">
            Loading...
        </div>
    );

    return <SmartReviewLearn words={words} />;
}