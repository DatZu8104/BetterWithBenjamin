'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/home/header';
import { SmartReviewPage } from '@/components/smart-review/SmartReviewPage';

export default function SmartReviewRoute() {
    const router = useRouter();
    const [isAuth, setIsAuth] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Lấy thông tin từ sessionStorage giống page.tsx chính
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
                <SmartReviewPage />
            </div>
        </div>
    );
}