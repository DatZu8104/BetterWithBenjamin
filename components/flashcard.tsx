'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Volume2 } from 'lucide-react'; // icon loa
import { Input } from '@/components/ui/input'; 
import { Label } from '@/components/ui/label';

interface Word {
  id: string;
  english: string;
  definition: string;
  type: string[]; 
}


interface FlashcardProps {
  word: Word;
}

export function Flashcard({ word }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [example, setExample] = useState(''); // ví dụ do người dùng nhập

  const speak = () => {
    const utter = new SpeechSynthesisUtterance(word.english);
    utter.lang = 'en-US';
    utter.rate = 1;
    utter.pitch = 1;
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
  };

  // tự đọc khi tới thẻ mới
  useEffect(() => {
    speak();
  }, [word]);

  return (
    <div className="relative w-full h-[380px] perspective">
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="relative w-full h-full transition-transform duration-500 cursor-pointer"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >

        {/* FRONT */}
        <Card className="absolute inset-0 flex flex-col items-center justify-center p-12 backface-hidden">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-5xl font-bold">{word.english}</h2>

            {/* 🔊 NÚT LOA */}
            <button
              className="p-2 rounded-full hover:bg-muted transition"
              onClick={(e) => {
                e.stopPropagation(); // tránh lật thẻ khi nhấn loa
                speak();
              }}
            >
              <Volume2 size={28} />
            </button>
          </div>

          {/* loại từ */}
          {word.type && (
            <p className="text-md text-muted-foreground italic">
              ({word.type})
            </p>
          )}

          <p className="text-xs text-muted-foreground mt-6">
            Click to reveal definition
          </p>
        </Card>

        {/* BACK */}
        <Card
          className="absolute inset-0 flex flex-col items-center justify-start p-10 backface-hidden"
          style={{ transform: 'rotateY(180deg)' }}
        >
          <p className="text-sm text-muted-foreground uppercase tracking-wide">
            Definition
          </p>

          <p className="text-2xl mt-4 leading-relaxed text-center">
            {word.definition}
          </p>

          <p className="text-xs text-muted-foreground mt-6">
            Click to reveal word
          </p>
        </Card>
      </div>

      <style jsx>{`
        .perspective {
          perspective: 1000px;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
      `}</style>
    </div>
  );
}
