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

  // Giữ phần tử con nguyên bản, chỉ âm thầm gắn ID và khóa tương tác click
  const enhancedChild = React.cloneElement(child as React.ReactElement, {
    id: elementId,
    style: {
      ...(child as React.ReactElement).props.style,
      pointerEvents: 'none' // Khóa click vào phần tử này
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
                borderRadius: '0.5rem', // Bo góc nhẹ cho lỗ hổng
                pointerEvents: 'none'   // Cho phép click "rơi xuyên qua"
              }}
            />
          )}

          {/* Lớp Viền Tím Nổi Bật: Đây là thành phần nằm TRÊN CÙNG của mọi thứ */}
          {rect && (
            <div
              className="animate-pulse duration-[2000ms]" // Thêm hiệu ứng nhấp nháy nhẹ cho thu hút
              style={{
                position: 'absolute',
                // Nới rộng viền ra một chút so với kích thước thật của nút (mỗi bên 6px)
                top: rect.top - 6,
                left: rect.left - 6,
                width: rect.width + 12,
                height: rect.height + 12,
                // Viền màu tím đậm (Violet 600) rực rỡ
                border: '4px solid #7c3aed', 
                borderRadius: '0.75rem', // Bo góc lớn hơn cho viền
                // Bóng đổ màu tím lan tỏa (Purple glow effect)
                boxShadow: '0 0 25px 5px rgba(124, 58, 237, 0.5)', 
                pointerEvents: 'none',   // Trong suốt với click
                zIndex: 99991            // Đảm bảo nằm trên lớp màn mờ
              }}
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
          sideOffset={20} // Tăng offset để không đè lên viền tím mới
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