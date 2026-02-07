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

  // --- LOGIC PHÁT ÂM ---
  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
        v.lang === 'en-US' && (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Premium'))
    );
    if (preferredVoice) utterance.voice = preferredVoice;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    setIsFlipped(false);
    if (word && word.english) {
        speakText(word.english);
    }
    return () => { window.speechSynthesis.cancel(); };
  }, [word]);

  const handleSpeakClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    speakText(word.english);
  };

  // Tách ví dụ
  const examples = word.example 
    ? word.example.split('\n').filter((ex: string) => ex.trim().length > 0) 
    : [];

  return (
    <div 
      className={cn("w-full h-[60vh] min-h-[450px] cursor-pointer select-none perspective-1000", className)}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div 
        className={cn(
          "relative w-full h-full transition-all duration-500 ease-in-out",
          isFlipped ? "rotate-y-180" : ""
        )}
        style={{ transformStyle: 'preserve-3d' }} 
      >
        
        {/* --- MẶT TRƯỚC (ENGLISH) --- */}
        <div 
            className="absolute inset-0 w-full h-full rounded-3xl border-2 shadow-2xl flex flex-col items-center justify-center p-8 text-center bg-zinc-900 border-zinc-800"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
           <div className="w-full h-full flex flex-col justify-center items-center gap-8 m-auto">
              <h2 className="text-5xl sm:text-7xl font-bold text-white break-words w-full px-4 leading-tight">
                {word.english}
              </h2>
                  
              <div className="flex items-center gap-4">
                  <button 
                    onClick={handleSpeakClick}
                    className="p-5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors active:scale-95 shadow-lg border border-zinc-700"
                  >
                    <Volume2 className="w-10 h-10" />
                  </button>

                  {word.type && (
                     <div className="flex gap-2">
                        {(Array.isArray(word.type) ? word.type : [word.type]).map((t: string, i: number) => (
                            <span key={i} className="px-4 py-2 rounded-full bg-blue-600 text-white text-base font-bold uppercase tracking-wider shadow-lg shadow-blue-900/40 border border-blue-500/50">
                                {t}
                            </span>
                        ))}
                     </div>
                  )}
              </div>
              
              {word.pronunciation && (
                  <p className="text-zinc-500 text-2xl font-mono opacity-80">/{word.pronunciation.replace(/\//g, '')}/</p>
              )}
           </div>
           
           <p className="absolute bottom-6 text-sm text-zinc-600 font-medium animate-pulse uppercase tracking-widest">
             Tap to flip
           </p>
        </div>

        {/* --- MẶT SAU (DEFINITION & EXAMPLES) --- */}
        <div 
            className="absolute inset-0 w-full h-full rounded-3xl border-2 border-blue-900/50 bg-zinc-800 shadow-xl overflow-hidden rotate-y-180"
            style={{ 
                transform: 'rotateY(180deg)', 
                backfaceVisibility: 'hidden', 
                WebkitBackfaceVisibility: 'hidden' 
            }}
        >
           <div className="w-full h-full overflow-y-auto custom-scrollbar flex flex-col p-8">
             <div className="m-auto w-full flex flex-col h-full">
                 
                 {/* 1. Phần Định Nghĩa */}
                 <div className="flex flex-col items-center justify-center shrink-0 mb-8 w-full">
                    <p className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-4">
                      Definition
                    </p>
                    
                    {/* ✨ FIX: Bỏ font-bold (dùng font-normal), Luôn căn giữa (text-center) */}
                    <h3 className={cn("font-normal text-white leading-relaxed break-words w-full text-center", 
                        word.definition.length > 150 ? "text-xl" : // Dài quá thì chữ nhỏ lại xíu nhưng vẫn căn giữa
                        word.definition.length > 80 ? "text-2xl" : "text-3xl"
                    )}>
                      {word.definition}
                    </h3>
                 </div>
                 
                 {/* 2. Phần Ví dụ */}
                 {examples.length > 0 && (
                    <div className="w-full space-y-4 pb-4">
                        <div className="flex items-center gap-4 w-full">
                            <div className="h-px bg-zinc-700 flex-1"></div>
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Examples</span>
                            <div className="h-px bg-zinc-700 flex-1"></div>
                        </div>
                        
                        {examples.map((ex: string, i: number) => (
                             <div key={i} className="relative p-4 rounded-xl bg-black/20 border border-white/5 w-full flex gap-4 text-left hover:bg-black/30 transition-colors">
                                <span className="text-blue-400 font-bold text-base mt-0.5 shrink-0 select-none w-6 text-right">
                                    {i + 1}.
                                </span>
                                <p className="text-lg text-zinc-300 italic leading-snug w-full">
                                    "{ex}"
                                </p>
                             </div>
                        ))}
                    </div>
                 )}

             </div>
           </div>
        </div>

      </div>
    </div>
  );
}