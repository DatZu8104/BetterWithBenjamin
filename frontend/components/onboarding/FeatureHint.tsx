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

  // Clone thẻ HTML con để ép nó nổi lên trên bóng tối và khóa click, 
  // cách này giúp giữ nguyên 100% cấu trúc Layout gốc của bạn (không làm vỡ flex/grid)
  const child = React.isValidElement(children) ? children : <div>{children}</div>;
  
  const enhancedChild = React.cloneElement(child as React.ReactElement, {
    // @ts-ignore
    className: `${(child as React.ReactElement).props.className || ''} ring-2 ring-blue-500/50 rounded-xl shadow-[0_0_30px_rgba(59,130,246,0.2)] transition-all duration-500`.trim(),
    style: {
      ...(child as React.ReactElement).props.style,
      position: 'relative',
      zIndex: 99995, // Nổi lên trên lớp nền tối
      pointerEvents: 'none' // Khóa click vào phần tử này
    }
  });

  return (
    <>
      {/* LỚP BACKDROP: Làm tối nhẹ xung quanh và chặn toàn bộ click ra ngoài */}
      {shouldShow && (
        <div 
            className="fixed inset-0 z-[99990] bg-black/40 backdrop-blur-[1px] animate-in fade-in duration-500" 
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Không gọi markAsSeen() ở đây để ép người dùng phải bấm nút X
            }}
        />
      )}

      <Popover 
          open={shouldShow} 
          onOpenChange={(open) => {
              if (!open) markAsSeen();
          }}
      >
        <PopoverTrigger asChild>
          {enhancedChild}
        </PopoverTrigger>

        {/* BẢNG THÔNG BÁO (TOOLTIP) */}
        <PopoverContent
          side={side}
          align={align}
          sideOffset={16} 
          onInteractOutside={(e) => e.preventDefault()} // Ngăn việc Popover tự đóng khi bấm ra ngoài
          className="z-[99999] p-4 max-w-xs bg-gradient-to-br from-blue-600 to-blue-800 text-white border-blue-400/50 shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 duration-300"
        >
          <div className="flex items-start justify-between gap-4 relative">
            <div className="text-sm font-medium leading-relaxed drop-shadow-sm">
              {message}
            </div>
            
            {/* NÚT X ĐỂ ĐÓNG TOUR (Nút duy nhất click được) */}
            <button
              onClick={(e) => {
                e.preventDefault();
                markAsSeen();
              }}
              className="text-blue-200 hover:text-white transition-all shrink-0 p-1.5 bg-blue-900/40 rounded-lg hover:bg-blue-900/80 hover:scale-105 active:scale-95 border border-transparent hover:border-blue-400/30"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}