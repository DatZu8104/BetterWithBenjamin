'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // ID duy nhất để xác định phần tử cần highlight trên DOM
  const elementId = `tour-element-${id}`;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!shouldShow || !mounted) return;

    const updateRect = () => {
      const el = document.getElementById(elementId);
      if (el) {
        setRect(el.getBoundingClientRect());
      }
    };

    updateRect(); // Lấy tọa độ ban đầu

    // Cập nhật tọa độ khi cuộn hoặc đổi kích thước
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    
    // Polling nhẹ để mượt mà khi modal mở ra
    const interval = setInterval(updateRect, 50);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
      clearInterval(interval);
    };
  }, [shouldShow, mounted, elementId]);

  if (!isReady || !shouldShow) {
    return <>{children}</>;
  }

  const child = React.isValidElement(children) ? children : <div>{children}</div>;

  // Xóa bỏ pointerEvents: 'none' đi để bản thân phần tử gốc vẫn giữ được trạng thái bình thường
  const enhancedChild = React.cloneElement(child as React.ReactElement, {
    id: elementId,
    style: {
      ...(child as React.ReactElement).props.style,
    }
  });

  return (
    <>
      {shouldShow && mounted && createPortal(
        <div
            // Chặn click toàn màn hình nhưng trong suốt
            className="fixed inset-0 z-[99990] animate-in fade-in duration-500 overflow-hidden"
            style={{ pointerEvents: 'auto' }}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
        >
          {/* Lớp Overlay: Cắt một lỗ hổng trong suốt, xung quanh là màn mờ đen */}
          {rect && (
            <div
              style={{
                position: 'absolute',
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                // Đổ bóng khổng lồ để làm mờ toàn bộ phần còn lại của màn hình
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
                borderRadius: '0.5rem', 
                pointerEvents: 'none'   
              }}
            />
          )}

          {/* Lớp Viền Tím Nổi Bật */}
          {rect && (
            <div
              className="animate-pulse duration-[2000ms]" 
              style={{
                position: 'absolute',
                top: rect.top - 6,
                left: rect.left - 6,
                width: rect.width + 12,
                height: rect.height + 12,
                border: '4px solid #7c3aed', 
                borderRadius: '0.75rem', 
                boxShadow: '0 0 25px 5px rgba(124, 58, 237, 0.5)', 
                pointerEvents: 'none',   
                zIndex: 99991            
              }}
            />
          )}

          {/* LỚP MỚI THÊM: Khu vực trong suốt để "hứng" click thay cho nút thật */}
          {rect && (
            <div 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                markAsSeen(); // 1. Tắt tour ngay lập tức

                // 2. Tìm phần tử gốc bên dưới và ra lệnh click() mạnh mẽ hơn
                const targetElement = document.getElementById(elementId);
                if (targetElement) {
                  // Cấu hình sự kiện để nó có thể sủi bọt (bubble) lên các component cha của React
                  const eventConfig = { bubbles: true, cancelable: true, view: window };
                  
                  // Bắn một chuỗi sự kiện để bao lô tất cả các thư viện (đặc biệt là Radix UI)
                  targetElement.dispatchEvent(new PointerEvent('pointerdown', eventConfig));
                  targetElement.dispatchEvent(new MouseEvent('mousedown', eventConfig));
                  targetElement.dispatchEvent(new MouseEvent('mouseup', eventConfig));
                  targetElement.dispatchEvent(new MouseEvent('click', eventConfig));
                }
              }}
              style={{
                position: 'absolute',
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                zIndex: 99995, 
                cursor: 'pointer', 
                pointerEvents: 'auto' 
              }}
              title="Click here to proceed"
            />
          )}
        </div>,
        document.body
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

        <PopoverContent
          side={side}
          align={align}
          sideOffset={20} 
          onInteractOutside={(e) => e.preventDefault()}
          className="z-[99999] p-4 max-w-xs bg-gradient-to-br from-blue-600 to-blue-800 text-white border-blue-400/50 shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 duration-300"
        >
          <div className="flex items-start justify-between gap-4 relative">
            <div className="text-sm font-medium leading-relaxed drop-shadow-sm">
              {message}
            </div>

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