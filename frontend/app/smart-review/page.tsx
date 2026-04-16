'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/home/header';
import { SmartReviewPage } from '@/components/smart-review/SmartReviewPage';

// Tách riêng component đọc searchParams vì Next.js yêu cầu Suspense
function SmartReviewContent() {
    const searchParams = useSearchParams();
    const defaultTab = (searchParams.get('tab') as 'personal' | 'system') || 'personal';
    return <SmartReviewPage defaultTab={defaultTab} />;
}

export default function SmartReviewRoute() {
    const router = useRouter();
    const [isAuth, setIsAuth] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const username = typeof window !== 'undefined'
        ? sessionStorage.getItem('current_user') || ''
        : '';
    const role = typeof window !== 'undefined'
        ? sessionStorage.getItem('user_role') || 'user'
        : 'user';

    useEffect(() => {
        const token = sessionStorage.getItem('auth_token');
        if (!token) {
            router.replace('/');
            return;
        }
        setIsAuth(true);
        setIsLoading(false);
    }, [router]);

    const handleLogout = () => {
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('current_user');
        sessionStorage.removeItem('user_role');
        router.replace('/');
    };

    if (isLoading) return (
        <div className="h-screen bg-black flex items-center justify-center text-white">
            Loading...
        </div>
    );

    if (!isAuth) return null;

    return (
        <div className="min-h-screen bg-black flex flex-col">
            <Header
                onSearchChange={() => {}}
                searchTerm=""
                onReset={() => router.push('/')}
                username={username}
                role={role}
                onLogout={handleLogout}
                currentMode="personal"
                onModeChange={() => router.push('/')}
            />
            <div className="flex-1">
                {/* Suspense bắt buộc khi dùng useSearchParams */}
                <Suspense fallback={
                    <div className="flex items-center justify-center h-40 text-zinc-500">
                        Loading...
                    </div>
                }>
                    <SmartReviewContent />
                </Suspense>
            </div>
        </div>
    );
}