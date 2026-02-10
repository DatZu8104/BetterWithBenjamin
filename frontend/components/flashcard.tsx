'use client';

import { useState, useEffect, useRef } from 'react';
import { Volume2, ExternalLink, BookOpen, RotateCw } from 'lucide-react';
import { cn } from '../lib/utils';

interface FlashcardProps {
  word: any; 
  className?: string;
  color?: string;
}

export function Flashcard({ word, className, color }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Ref để kiểm soát việc auto-play không bị lặp lại
  const hasPlayedRef = useRef(false);

  // --- HÀM PHÁT AUDIO ---
  const playAudio = (url: string | undefined, text: string) => {
    if (url && url.startsWith('http')) {
      // Nếu có link file mp3 từ Oxford
      const audio = new Audio(url);
      audio.play().catch(e => console.error("Audio play error:", e));
    } else {
      // Fallback: Dùng Google Text-to-Speech nếu không có link audio
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        
        // Cố gắng chọn giọng Google US
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => 
             v.lang === 'en-US' && (v.name.includes('Google') || v.name.includes('Samantha'))
        );
        if (preferredVoice) utterance.voice = preferredVoice;
        
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  // --- AUTO-PLAY KHI ĐỔI TỪ ---
  useEffect(() => {
    setIsFlipped(false); // Reset mặt thẻ
    hasPlayedRef.current = false;

    const timer = setTimeout(() => {
        if (!hasPlayedRef.current && word) {
            // Mặc định ưu tiên giọng US
            const audioUrl = word.audio?.us || word.audio?.uk;
            const textToRead = word.word || word.english;
            playAudio(audioUrl, textToRead); 
            hasPlayedRef.current = true;
        }
    }, 600); // Delay nhẹ 0.6s để người dùng kịp nhìn thấy từ

    return () => clearTimeout(timer);
  }, [word]); // Chạy lại khi prop "word" thay đổi

  // Xử lý bấm nút loa thủ công
  const handleManualPlay = (e: React.MouseEvent, type: 'us' | 'uk') => {
    e.stopPropagation(); // Ngăn lật thẻ
    const audioUrl = word.audio?.[type];
    const textToRead = word.word || word.english;
    playAudio(audioUrl, textToRead);
  };

  // --- CHUẨN BỊ DỮ LIỆU HIỂN THỊ ---
  // Hỗ trợ cả dữ liệu cũ (chưa import lại) và mới
  const displayWord = word.word || word.english;
  const displayLevel = word.level || (word.group?.includes('Level') ? word.group.split('Level ')[1] : null);
  
  // Xử lý definitions: Nếu là cấu trúc mới thì dùng mảng, nếu cũ thì tạo mảng giả
  const definitions = (word.definitions && word.definitions.length > 0) 
      ? word.definitions 
      : [{ 
          order: 1, 
          label: 'Definition', 
          definition: word.definition, 
          examples: word.example ? [word.example] : [] 
        }];

  const phonetics = word.phonetics || {};

  return (
    <div 
      className={cn("w-full h-[65vh] min-h-[500px] cursor-pointer select-none perspective-1000", className)}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div 
        className={cn(
          "relative w-full h-full transition-all duration-500 ease-in-out",
          isFlipped ? "rotate-y-180" : ""
        )}
        style={{ transformStyle: 'preserve-3d' }} 
      >
        
        {/* === MẶT TRƯỚC (TỪ VỰNG & AUDIO) === */}
        <div 
            className="absolute inset-0 w-full h-full rounded-3xl border-2 shadow-2xl flex flex-col items-center justify-center p-4 text-center bg-zinc-900 border-zinc-800"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
           <div className="w-full h-full flex flex-col justify-center items-center gap-6 m-auto relative">
              
              {/* Badge Level (Góc phải trên) */}
              {displayLevel && (
                  <span className="absolute top-4 right-4 px-3 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-lg text-sm font-bold shadow-sm">
                      {displayLevel}
                  </span>
              )}

              {/* Từ chính */}
              <h2 className="text-5xl sm:text-7xl font-bold text-white break-words w-full px-4 leading-tight tracking-tight">
                {displayWord}
              </h2>
              
              {/* Loại từ (noun, verb...) */}
              {word.type && (
                 <span className="text-xl text-blue-400 italic font-serif opacity-90">
                    ({Array.isArray(word.type) ? word.type.join(', ') : word.type})
                 </span>
              )}

              {/* Khu vực Audio & Phonetics */}
              <div className="flex flex-col gap-3 mt-6 w-full max-w-[280px]">
                  {/* US Audio Row */}
                  <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5 hover:border-blue-500/30 transition-colors group">
                      <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded uppercase tracking-wider">US</span>
                          <span className="text-zinc-300 font-mono text-sm">{phonetics.us || "---"}</span>
                      </div>
                      <button 
                        onClick={(e) => handleManualPlay(e, 'us')}
                        className="p-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg active:scale-95 group-hover:scale-105"
                        title="Listen US"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                  </div>

                  {/* UK Audio Row */}
                  <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5 hover:border-rose-500/30 transition-colors group">
                      <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded uppercase tracking-wider">UK</span>
                          <span className="text-zinc-300 font-mono text-sm">{phonetics.uk || "---"}</span>
                      </div>
                      <button 
                        onClick={(e) => handleManualPlay(e, 'uk')}
                        className="p-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-lg active:scale-95 group-hover:scale-105"
                        title="Listen UK"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                  </div>
              </div>
           </div>
           
           <p className="absolute bottom-6 text-xs text-zinc-600 font-medium animate-pulse uppercase tracking-widest flex items-center gap-2">
             <RotateCw className="w-3 h-3"/> Tap to flip
           </p>
        </div>

        {/* === MẶT SAU (DEFINITIONS) === */}
        <div 
            className="absolute inset-0 w-full h-full rounded-3xl border-2 border-blue-900/50 bg-zinc-800 shadow-xl overflow-hidden rotate-y-180"
            style={{ 
                transform: 'rotateY(180deg)', 
                backfaceVisibility: 'hidden', 
                WebkitBackfaceVisibility: 'hidden' 
            }}
        >
           <div className="w-full h-full overflow-y-auto custom-scrollbar flex flex-col p-6 text-left relative">
             
             {/* Link gốc Oxford */}
             {word.href && (
                 <div className="absolute top-4 right-4 z-10">
                     <a href={word.href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] text-blue-400 flex items-center gap-1 hover:underline bg-blue-950/50 px-2 py-1 rounded-full border border-blue-900">
                         Oxford <ExternalLink className="w-3 h-3"/>
                     </a>
                 </div>
             )}

             <div className="space-y-6 pb-4 mt-2">
                 {definitions.map((def: any, idx: number) => (
                     <div key={idx} className="relative pl-4 border-l-2 border-blue-500/30">
                         {/* Label (Meaning 1...) */}
                         <div className="flex items-center gap-2 mb-1.5">
                             <div className="bg-blue-500/10 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-wide">
                                 {def.label || `Meaning ${idx + 1}`}
                             </div>
                         </div>

                         {/* Nội dung định nghĩa */}
                         <h3 className="text-lg text-white font-medium leading-snug mb-3">
                             {def.definition}
                         </h3>

                         {/* Ví dụ */}
                         {def.examples && def.examples.length > 0 && (
                             <div className="space-y-2 bg-black/20 p-3 rounded-xl border border-white/5">
                                 {def.examples.map((ex: string, i: number) => (
                                     <div key={i} className="flex gap-2 items-start">
                                         <span className="text-blue-500/50 text-xs mt-1">●</span>
                                         <p className="text-zinc-400 text-sm italic leading-relaxed">
                                             "{ex}"
                                         </p>
                                     </div>
                                 ))}
                             </div>
                         )}
                     </div>
                 ))}
             </div>
           </div>
        </div>

      </div>
    </div>
  );
}