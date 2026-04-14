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

    updateRect();

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    
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

  const enhancedChild = React.cloneElement(child as React.ReactElement, {
    id: elementId,
    style: {
      ...(child as React.ReactElement).props.style,
    }
  });

  // Tính toán vị trí popover dựa trên rect và side/align
  const getPopoverStyle = (): React.CSSProperties => {
    if (!rect) return { display: 'none' };

    const OFFSET = 16;
    const POPOVER_W = 280;
    const POPOVER_H = 120; // ước tính

    let top = 0;
    let left = 0;

    switch (side) {
      case 'bottom':
        top = rect.bottom + OFFSET;
        left = rect.left + rect.width / 2 - POPOVER_W / 2;
        break;
      case 'top':
        top = rect.top - POPOVER_H - OFFSET;
        left = rect.left + rect.width / 2 - POPOVER_W / 2;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - POPOVER_H / 2;
        left = rect.right + OFFSET;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - POPOVER_H / 2;
        left = rect.left - POPOVER_W - OFFSET;
        break;
    }

    // Clamp vào viewport
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    left = Math.max(8, Math.min(left, vw - POPOVER_W - 8));
    top = Math.max(8, Math.min(top, vh - POPOVER_H - 8));

    return { top, left, width: POPOVER_W };
  };

  return (
    <>
      {/* OVERLAY + HIGHLIGHT PORTAL */}
      {shouldShow && mounted && createPortal(
        <>
          {/* Dim overlay toàn màn hình */}
          <div
            className="fixed inset-0 animate-in fade-in duration-300"
            style={{ 
              zIndex: 2147483600, // MAX z-index để luôn trên cùng
              pointerEvents: 'auto',
              backgroundColor: 'rgba(0,0,0,0.45)',
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />

          {/* Lỗ hổng highlight - dùng clip-path hoặc box-shadow */}
          {rect && (
            <>
              {/* Vùng trong suốt (clear hole) */}
              <div
                style={{
                  position: 'fixed',
                  top: rect.top - 4,
                  left: rect.left - 4,
                  width: rect.width + 8,
                  height: rect.height + 8,
                  zIndex: 2147483601,
                  pointerEvents: 'none',
                  borderRadius: '0.5rem',
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0)',
                  background: 'transparent',
                }}
              />

              {/* Viền highlight tím */}
              <div
                className="animate-pulse"
                style={{
                  position: 'fixed',
                  top: rect.top - 6,
                  left: rect.left - 6,
                  width: rect.width + 12,
                  height: rect.height + 12,
                  border: '3px solid #7c3aed',
                  borderRadius: '0.75rem',
                  boxShadow: '0 0 20px 4px rgba(124, 58, 237, 0.4)',
                  zIndex: 2147483602,
                  pointerEvents: 'none',
                }}
              />

              {/* Click interceptor - bắt click trên element gốc */}
              <div
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  markAsSeen();

                  const targetElement = document.getElementById(elementId);
                  if (targetElement) {
                    const eventConfig = { bubbles: true, cancelable: true, view: window };
                    targetElement.dispatchEvent(new PointerEvent('pointerdown', eventConfig));
                    targetElement.dispatchEvent(new MouseEvent('mousedown', eventConfig));
                    targetElement.dispatchEvent(new MouseEvent('mouseup', eventConfig));
                    targetElement.dispatchEvent(new MouseEvent('click', eventConfig));
                  }
                }}
                style={{
                  position: 'fixed',
                  top: rect.top,
                  left: rect.left,
                  width: rect.width,
                  height: rect.height,
                  zIndex: 2147483603,
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  borderRadius: '0.5rem',
                }}
                title="Click here to proceed"
              />
            </>
          )}

          {/* POPOVER TỰ VẼ - luôn hiển thị trên cùng, không bị che */}
          {rect && (
            <div
              className="animate-in fade-in zoom-in-95 duration-200"
              style={{
                position: 'fixed',
                ...getPopoverStyle(),
                zIndex: 2147483640, // Cao nhất - luôn trên overlay
                pointerEvents: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  border: '1px solid rgba(96, 165, 250, 0.4)',
                  borderRadius: '1rem',
                  padding: '1rem',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
                  color: 'white',
                  maxWidth: '280px',
                }}
              >
                {/* Mũi tên chỉ hướng */}
                {rect && (
                  <div
                    style={{
                      position: 'absolute',
                      ...(side === 'bottom' ? {
                        top: '-8px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        borderLeft: '8px solid transparent',
                        borderRight: '8px solid transparent',
                        borderBottom: '8px solid #2563eb',
                      } : side === 'top' ? {
                        bottom: '-8px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        borderLeft: '8px solid transparent',
                        borderRight: '8px solid transparent',
                        borderTop: '8px solid #2563eb',
                      } : side === 'right' ? {
                        left: '-8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        borderTop: '8px solid transparent',
                        borderBottom: '8px solid transparent',
                        borderRight: '8px solid #2563eb',
                      } : {
                        right: '-8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        borderTop: '8px solid transparent',
                        borderBottom: '8px solid transparent',
                        borderLeft: '8px solid #2563eb',
                      }),
                      width: 0,
                      height: 0,
                    }}
                  />
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-medium leading-relaxed">
                    {message}
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      markAsSeen();
                    }}
                    style={{
                      flexShrink: 0,
                      padding: '4px',
                      borderRadius: '6px',
                      background: 'rgba(255,255,255,0.15)',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>,
        document.body
      )}

      {/* Element gốc - render bình thường với ID để tìm được */}
      {enhancedChild}
    </>
  );
}