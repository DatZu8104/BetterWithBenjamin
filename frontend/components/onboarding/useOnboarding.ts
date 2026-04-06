'use client';

import { useState, useEffect, useCallback } from 'react';
import { OnboardingId } from './constants';

export function useOnboarding(id: OnboardingId, delayMs: number = 150, waitFor?: OnboardingId) {
  const [isReady, setIsReady] = useState(false);
  const [hasSeen, setHasSeen] = useState<boolean>(true);
  const [isWaiting, setIsWaiting] = useState<boolean>(!!waitFor); 

  const checkStatus = useCallback(() => {
  const seenCurrent = localStorage.getItem(`has_seen_${id}`) === 'true';
    setHasSeen(seenCurrent);

    if (waitFor) {
       const seenWait = localStorage.getItem(`has_seen_${waitFor}`) === 'true';
       setIsWaiting(!seenWait); 
    }
  }, [id, waitFor]);

  useEffect(() => {
    checkStatus();
    const timer = setTimeout(() => setIsReady(true), delayMs);

    const handleUpdate = () => checkStatus();
    window.addEventListener('onboarding_updated', handleUpdate);

    return () => {
       clearTimeout(timer);
       window.removeEventListener('onboarding_updated', handleUpdate);
    };
  }, [checkStatus, delayMs]);

  const markAsSeen = useCallback(() => {
    localStorage.setItem(`has_seen_${id}`, 'true');
    setHasSeen(true);
    window.dispatchEvent(new Event('onboarding_updated')); 
  }, [id]);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(`has_seen_${id}`);
    setHasSeen(false);
    window.dispatchEvent(new Event('onboarding_updated'));
  }, [id]);

  return {
    isReady,      
    shouldShow: isReady && !hasSeen && !isWaiting, 
    markAsSeen,
    resetOnboarding
  };
}