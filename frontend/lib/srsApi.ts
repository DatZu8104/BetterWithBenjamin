/**
 * SRS API client
 * Tách riêng khỏi api.ts để dễ maintain
 * Dùng chung getHeaders pattern với api.ts
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const getHeaders = () => {
    let token = '';
    if (typeof window !== 'undefined') {
        token = localStorage.getItem('token') || sessionStorage.getItem('auth_token') || '';
        token = token.replace(/(^"|"$)/g, '');
        token = token.replace(/^Bearer\s+/i, '');
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': token
    };
};

export type WordType = 'personal' | 'system';
export type ReviewButton = 'again' | 'hard' | 'good' | 'easy';

export interface SrsStats {
    interval: number;
    repetition: number;
    easeFactor: number;
    nextReview: string;
    totalReviews: number;
    correctReviews: number;
    accuracy: number;
    lastReviewed: string | null;
}

export interface DueWord {
    _id: string;
    word?: string;
    english?: string;
    definition?: string;
    definitions?: any[];
    type?: string | string[];
    wordType: WordType;
    savedWordId?: string;
    srs: SrsStats | null;
}

export interface DueWordsResponse {
    personal: DueWord[];
    system: DueWord[];
    totalDue: number;
}

export const srsApi = {

    // Lấy số lượng từ đến hạn (dùng cho badge & notification)
    getDueCount: async (): Promise<number> => {
        try {
            const res = await fetch(`${API_URL}/srs/count`, {
                headers: getHeaders(),
                cache: 'no-store'
            });
            if (!res.ok) return 0;
            const data = await res.json();
            return data.count ?? 0;
        } catch {
            return 0;
        }
    },

    // Lấy toàn bộ từ đến hạn hôm nay
    getDueWords: async (): Promise<DueWordsResponse> => {
        const res = await fetch(`${API_URL}/srs/due`, {
            headers: getHeaders(),
            cache: 'no-store'
        });
        if (!res.ok) throw new Error('Failed to fetch due words');
        return res.json();
    },

    // Cập nhật sau mỗi lần ôn trong Smart Review
    submitReview: async (
        wordId: string,
        wordType: WordType,
        button: ReviewButton
    ): Promise<{ nextReview: string; interval: number; easeFactor: number }> => {
        const res = await fetch(`${API_URL}/srs/review`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ wordId, wordType, button })
        });
        if (!res.ok) throw new Error('Failed to submit review');
        return res.json();
    },

    // Khởi tạo SRS record khi nhấn "Đã thuộc" lần đầu trong learn mode
    initRecord: async (
        wordId: string,
        wordType: WordType
    ): Promise<{ success: boolean; alreadyExists: boolean }> => {
        try {
            const res = await fetch(`${API_URL}/srs/init`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ wordId, wordType })
            });
            if (!res.ok) return { success: false, alreadyExists: false };
            return res.json();
        } catch {
            // Không throw — lỗi SRS không được làm gián đoạn learn mode
            return { success: false, alreadyExists: false };
        }
    },

    // Lấy thống kê SRS của 1 từ (dùng cho SmartReviewCard)
    getWordStats: async (
        wordId: string,
        wordType: WordType
    ): Promise<SrsStats | null> => {
        try {
            const res = await fetch(
                `${API_URL}/srs/stats/${wordId}?wordType=${wordType}`,
                { headers: getHeaders() }
            );
            if (!res.ok) return null;
            return res.json();
        } catch {
            return null;
        }
    },

    // Xóa SRS record (khi user xóa từ, sau khi đã confirm)
    deleteRecord: async (
        wordId: string,
        wordType: WordType
    ): Promise<boolean> => {
        try {
            const res = await fetch(
                `${API_URL}/srs/${wordId}?wordType=${wordType}`,
                { method: 'DELETE', headers: getHeaders() }
            );
            return res.ok;
        } catch {
            return false;
        }
    }
};