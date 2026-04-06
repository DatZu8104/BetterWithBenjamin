'use client';

import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'; 
import { X } from 'lucide-react';
import { useOnboarding } from './useOnboarding';
import { OnboardingId } from './constants';

interface FeatureHintProps {
  id: OnboardingId;
  waitFor?: OnboardingId; 
  delay?: number;         
  message: string | React.ReactNode;
  children: React.ReactNode; 
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
}

export function FeatureHint({ 
  id, 
  message, 
  children, 
  waitFor,               
  delay = 150,
  side = 'bottom', 
  align = 'center' 
}: FeatureHintProps) {
    const { isReady, shouldShow, markAsSeen } = useOnboarding(id, delay, waitFor);

  if (!isReady || !shouldShow) {
    return <>{children}</>;
  }

  return (
    <Popover 
        open={shouldShow} 
        onOpenChange={(open) => {
            if (!open) markAsSeen();
        }}
    >
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>

      <PopoverContent
        side={side}
        align={align}
        sideOffset={12} 
        onInteractOutside={(e) => e.preventDefault()}
        className="z-[99999] p-3 max-w-xs bg-blue-600 text-white border-blue-500 shadow-2xl rounded-xl animate-in fade-in zoom-in-95 duration-300"
      >
        <div className="flex items-start justify-between gap-3 relative">
          <div className="text-sm font-medium leading-relaxed">
            {message}
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              markAsSeen();
            }}
            className="text-blue-200 hover:text-white transition-colors shrink-0 p-1.5 bg-blue-700/50 rounded-md hover:bg-blue-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}