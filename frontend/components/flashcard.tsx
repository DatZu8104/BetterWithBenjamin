'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/frontend/components/ui/card';
import { Volume2, RotateCcw } from 'lucide-react';
import { cn } from '@/frontend/lib/utils';

interface FlashcardProps {
  word: { id: string; english: string; definition: string; type: string[]; };
  className?: string;
}

export function Flashcard({ word, className }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const speak = () => {
    const utter = new SpeechSynthesisUtterance(word.english);
    utter.lang = 'en-US'; utter.rate = 1; speechSynthesis.cancel(); speechSynthesis.speak(utter);
  };

  useEffect(() => { speak(); setIsFlipped(false); }, [word]);

  return (
    <div className={cn("relative w-full h-full perspective select-none group", className)}>
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="relative w-full h-full transition-transform duration-500 cursor-pointer shadow-lg rounded-2xl"
        style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
      >
        {/* FRONT: NỀN TỐI (Zinc-900) */}
        <Card className="absolute inset-0 flex flex-col items-center justify-center p-6 backface-hidden border border-zinc-800 bg-zinc-900 rounded-2xl">
          <div className="flex-1 w-full flex flex-col items-center justify-center min-h-0">
            {/* Chữ trắng */}
            <h2 className="font-bold tracking-tight text-white text-center break-words w-full px-2 leading-tight"
                style={{ fontSize: 'clamp(2rem, 6vw, 4rem)' }}>
              {word.english}
            </h2>
            
            <div className="mt-6 p-3 rounded-full bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-all cursor-pointer shrink-0"
                 onClick={(e) => { e.stopPropagation(); speak(); }}>
              <Volume2 className="w-6 h-6 md:w-8 md:h-8" />
            </div>

            {word.type?.length > 0 && (
                <div className="mt-6 flex flex-wrap justify-center gap-1.5 shrink-0">
                {word.type.map(t => (
                    <span key={t} className="text-xs font-bold uppercase px-3 py-1 rounded-full bg-zinc-950 text-zinc-500 border border-zinc-800">
                    {t}
                    </span>
                ))}
                </div>
            )}
          </div>
          
          <div className="shrink-0 mt-4 text-xs text-zinc-600 flex items-center gap-1.5 font-medium">
             <RotateCcw size={12}/> Chạm để lật
          </div>
        </Card>

        {/* BACK: NỀN TỐI HƠN (Zinc-950) */}
        <Card className="absolute inset-0 flex flex-col items-center justify-center p-6 backface-hidden bg-zinc-950 text-white border border-zinc-800 rounded-2xl"
              style={{ transform: 'rotateY(180deg)' }}>
          <span className="shrink-0 text-xs font-bold uppercase tracking-widest text-zinc-600 border-b border-zinc-800 mb-4 pb-1">
            Định nghĩa
          </span>
          <div className="flex-1 w-full flex items-center justify-center overflow-y-auto px-2 scrollbar-hide">
             <p className="font-medium text-center leading-relaxed break-words text-zinc-200"
                style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}>
                {word.definition}
             </p>
          </div>
        </Card>
      </div>

      <style jsx>{`
        .perspective { perspective: 1000px; }
        .backface-hidden { backface-visibility: hidden; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}