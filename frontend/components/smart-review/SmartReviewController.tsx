'use client';
import { useState } from 'react';
import { SmartReviewModal } from './SmartReviewModal';
import { SmartReviewStudy, ReviewResult } from './SmartReviewStudy';
import { SmartReviewSummary } from './SmartReviewSummary';
import { DueWord } from '../../lib/srsApi';

type Stage = 'select' | 'study' | 'summary';

interface SmartReviewControllerProps {
    onClose: () => void;
}

export function SmartReviewController({ onClose }: SmartReviewControllerProps) {
    const [stage, setStage] = useState<Stage>('select');
    const [selectedWords, setSelectedWords] = useState<DueWord[]>([]);
    const [results, setResults] = useState<ReviewResult[]>([]);

    if (stage === 'select') {
        return (
            <SmartReviewModal
                onClose={onClose}
                onStartSession={(words) => {
                    setSelectedWords(words);
                    setStage('study');
                }}
            />
        );
    }

    if (stage === 'study') {
        return (
            <SmartReviewStudy
                words={selectedWords}
                onFinish={(res) => {
                    setResults(res);
                    setStage('summary');
                }}
                onExit={onClose}
            />
        );
    }

    return (
        <SmartReviewSummary
            results={results}
            onClose={onClose}
            onReviewAgain={() => setStage('study')}
        />
    );
}