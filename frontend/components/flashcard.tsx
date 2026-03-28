'use client';

import { useState, useEffect, useRef } from 'react';
import { Volume2, ExternalLink, RotateCw } from 'lucide-react';
import { cn } from '../lib/utils';

interface FlashcardProps {
  word: any; 
  className?: string;
  color?: string;
}

export function Flashcard({ word, className, color }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const hasPlayedRef = useRef(false);

  const actualData = word?.wordId || word || {};

  // --- HÀM TRỢ GIÚP: GOOGLE TEXT-TO-SPEECH (TTS) ---
  const playTTS = (text: string, type: 'us' | 'uk') => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Chọn ngôn ngữ tương ứng
      utterance.lang = type === 'uk' ? 'en-GB' : 'en-US';
      
      // Cố gắng tìm giọng đọc hay nhất có sẵn trong máy
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => 
           v.lang === utterance.lang && (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel'))
      ) || voices.find(v => v.lang.includes(type === 'uk' ? 'GB' : 'US'));
      
      if (preferredVoice) utterance.voice = preferredVoice;
      window.speechSynthesis.speak(utterance);
    }
  };

  // --- 🚀 HÀM PHÁT AUDIO THÔNG MINH (3 LỚP FALLBACK) ---
  const playAudioWithFallback = (preferredType: 'us' | 'uk', text: string) => {
    if (!text) return;

    let audioUrl = actualData.audio?.[preferredType];
    
    // 1. Lớp Fallback 1: Nếu không có link ưu tiên, thử mượn link của giọng còn lại
    if (!audioUrl || !audioUrl.startsWith('http')) {
        const alternativeType = preferredType === 'us' ? 'uk' : 'us';
        audioUrl = actualData.audio?.[alternativeType];
    }

    // 2. Phát Audio nếu có link
    if (audioUrl && audioUrl.startsWith('http')) {
        const audio = new Audio(audioUrl);
        // Lớp Fallback 2: Bắt lỗi nếu file hỏng hoặc lỗi mạng (404)
        audio.play().catch(e => {
            console.warn(`Lỗi file audio gốc, chuyển sang Google TTS:`, e);
            playTTS(text, preferredType); 
        });
    } else {
        // 3. Không có bất kỳ link nào cả -> Nhờ chị Google đọc
        playTTS(text, preferredType);
    }
  };

  // --- AUTO-PLAY KHI ĐỔI TỪ ---
  useEffect(() => {
    setIsFlipped(false); 
    hasPlayedRef.current = false;

    const timer = setTimeout(() => {
        if (!hasPlayedRef.current && actualData) {
            const textToRead = actualData.word || actualData.english || "";
            // Auto-play ưu tiên phát giọng Mỹ (US)
            playAudioWithFallback('us', textToRead); 
            hasPlayedRef.current = true;
        }
    }, 600); 

    return () => clearTimeout(timer);
  }, [word]);

  // --- KHI BẤM NÚT THỦ CÔNG ---
  const handleManualPlay = (e: React.MouseEvent, type: 'us' | 'uk') => {
    e.stopPropagation(); 
    const textToRead = actualData.word || actualData.english || "";
    playAudioWithFallback(type, textToRead);
  };

  // --- CHUẨN BỊ DỮ LIỆU HIỂN THỊ ---
  const displayWord = actualData.word || actualData.english || "Đang tải...";
  const displayLevel = actualData.level || (actualData.group?.includes('Level') ? actualData.group.split('Level ')[1] : null);
  
  const definitions = (actualData.definitions && actualData.definitions.length > 0) 
      ? actualData.definitions 
      : [{ 
          order: 1, 
          label: 'Definition', 
          definition: actualData.definition || "Không có định nghĩa", 
          examples: actualData.example ? [actualData.example] : [] 
        }];

  const phonetics = actualData.phonetics || {};

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
              
              {displayLevel && (
                  <span className="absolute top-4 right-4 px-3 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-lg text-sm font-bold shadow-sm">
                      {displayLevel}
                  </span>
              )}

              <h2 className="text-5xl sm:text-7xl font-bold text-white break-words w-full px-4 leading-tight tracking-tight">
                {displayWord}
              </h2>
              
              {actualData.type && (
                 <span className="text-xl text-blue-400 italic font-serif opacity-90">
                    ({Array.isArray(actualData.type) ? actualData.type.join(', ') : actualData.type})
                 </span>
              )}

              <div className="flex flex-col gap-3 mt-6 w-full max-w-[280px]">
                  {/* Nút Loa US */}
                  <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5 hover:border-blue-500/30 transition-colors group">
                      <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded uppercase tracking-wider">US</span>
                          <span className="text-zinc-300 font-mono text-sm">{phonetics.us || "---"}</span>
                      </div>
                      <button onClick={(e) => handleManualPlay(e, 'us')} className="p-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg active:scale-95 group-hover:scale-105">
                        <Volume2 className="w-4 h-4" />
                      </button>
                  </div>

                  {/* Nút Loa UK */}
                  <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5 hover:border-rose-500/30 transition-colors group">
                      <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded uppercase tracking-wider">UK</span>
                          <span className="text-zinc-300 font-mono text-sm">{phonetics.uk || "---"}</span>
                      </div>
                      <button onClick={(e) => handleManualPlay(e, 'uk')} className="p-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-lg active:scale-95 group-hover:scale-105">
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
            style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
           <div className="w-full h-full overflow-y-auto custom-scrollbar flex flex-col p-6 text-left relative">
             
             {actualData.href && (
                 <div className="absolute top-4 right-4 z-10">
                     <a href={actualData.href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] text-blue-400 flex items-center gap-1 hover:underline bg-blue-950/50 px-2 py-1 rounded-full border border-blue-900">
                         Oxford <ExternalLink className="w-3 h-3"/>
                     </a>
                 </div>
             )}

             <div className="space-y-6 pb-4 mt-2">
                 {definitions.map((def: any, idx: number) => (
                     <div key={idx} className="relative pl-4 border-l-2 border-blue-500/30">
                         <div className="flex items-center gap-2 mb-1.5">
                             <div className="bg-blue-500/10 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-wide">
                                 {def.label || `Meaning ${idx + 1}`}
                             </div>
                         </div>
                         <h3 className="text-lg text-white font-medium leading-snug mb-3">{def.definition}</h3>
                         {def.examples && def.examples.length > 0 && (
                             <div className="space-y-2 bg-black/20 p-3 rounded-xl border border-white/5">
                                 {def.examples.map((ex: string, i: number) => (
                                     <div key={i} className="flex gap-2 items-start">
                                         <span className="text-blue-500/50 text-xs mt-1">●</span>
                                         <p className="text-zinc-400 text-sm italic leading-relaxed">"{ex}"</p>
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