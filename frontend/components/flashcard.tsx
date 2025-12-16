'use client';

import { useState, useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface FlashcardProps {
  word: any;
  className?: string;
  color?: string;
}

export function Flashcard({ word, className, color }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  // Reset trạng thái lật khi đổi từ
  useEffect(() => {
    setIsFlipped(false);
  }, [word]);

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    const utterance = new SpeechSynthesisUtterance(word.english);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div 
      className={cn("w-full max-w-3xl mx-auto h-64 sm:h-72 cursor-pointer select-none perspective-1000", className)}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div 
        className={cn(
          "relative w-full h-full transition-all duration-500 ease-in-out",
          isFlipped ? "rotate-y-180" : ""
        )}
        style={{ transformStyle: 'preserve-3d' }} // ✅ Quan trọng: Giữ không gian 3D
      >
        
        {/* --- MẶT TRƯỚC (TIẾNG ANH) --- */}
        <div 
            className="absolute inset-0 w-full h-full rounded-3xl border-2 shadow-2xl flex flex-col items-center justify-center p-6 text-center bg-zinc-900 border-zinc-800"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }} // ✅ Quan trọng: Ẩn mặt sau khi lật
        >
           <div className="flex flex-col items-center gap-4 w-full">
              {/* Từ vựng */}
              <h2 className="text-4xl sm:text-5xl font-bold text-white break-words w-full px-2 leading-tight">
                {word.english}
              </h2>
              
              {/* Loa & Loại từ */}
              <div className="flex items-center gap-3 mt-2">
                  <button 
                    onClick={handleSpeak}
                    className="p-3 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors active:scale-95 shadow-lg border border-zinc-700"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>

                  {word.type && word.type.length > 0 && (
                     <div className="flex gap-2">
                        {(Array.isArray(word.type) ? word.type : [word.type]).map((t: string, i: number) => (
                            <span key={i} className="px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-blue-900/40 border border-blue-500/50">
                                {t}
                            </span>
                        ))}
                     </div>
                  )}
              </div>
           </div>
           <p className="absolute bottom-4 text-xs text-zinc-600 font-medium animate-pulse">
             Chạm để xem nghĩa
           </p>
        </div>

        {/* --- MẶT SAU (TIẾNG VIỆT) --- */}
        <div 
            className="absolute inset-0 w-full h-full rounded-3xl border-2 border-blue-900/50 bg-zinc-800 shadow-xl flex flex-col items-center justify-center p-8 text-center rotate-y-180"
            style={{ 
                transform: 'rotateY(180deg)', 
                backfaceVisibility: 'hidden', 
                WebkitBackfaceVisibility: 'hidden' 
            }} // ✅ Quan trọng: Xoay sẵn 180 độ
        >
           <div className="w-full overflow-y-auto max-h-full custom-scrollbar">
             <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Định nghĩa</p>
             <h3 className="text-2xl sm:text-3xl font-bold text-white leading-relaxed break-words mb-4">
               {word.definition}
             </h3>
             
             {word.example && (
                <div className="relative p-4 rounded-xl bg-black/20 border border-white/5">
                    <span className="absolute top-2 left-2 text-4xl text-white/10 font-serif">"</span>
                    <p className="text-lg text-zinc-300 italic relative z-10">{word.example}</p>
                </div>
             )}
           </div>
        </div>

      </div>
    </div>
  );
}