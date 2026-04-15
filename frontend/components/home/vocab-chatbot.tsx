'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface VocabChatbotProps {
  currentWord: string;
  wordType?: string | string[];
  wordDefinition?: string;
  wordExamples?: string[];
}

const buildSystemPrompt = (word: string, type: string, def: string, examples: string[]) => {
  const exampleLine = examples.length > 0
    ? `\nCác câu ví dụ có sẵn: ${examples.slice(0, 2).join(' / ')}`
    : '';
  return `Bạn là trợ lý từ vựng tiếng Anh thông minh. Người dùng đang học từ "${word}" (${type || 'từ vựng'}${def ? `: ${def}` : ''}).${exampleLine}

Nhiệm vụ: Chỉ trả lời các câu hỏi liên quan đến từ vựng tiếng Anh này:
- Cách dùng & ngữ cảnh (formal / informal / slang)
- Collocation và cụm từ phổ biến đi kèm
- Phân biệt với từ đồng nghĩa / gần nghĩa
- Word family và các dạng biến thể (danh từ, động từ, tính từ...)
- Ví dụ câu trong nhiều tình huống thực tế

Phong cách: Ngắn gọn, dùng bullet khi liệt kê. Có thể giải thích bằng tiếng Việt để dễ hiểu.
Nếu câu hỏi không liên quan đến từ vựng / học tiếng Anh, nhẹ nhàng hướng về chủ đề từ "${word}".`;
};

const QUICK_QUESTIONS = [
  '3 ví dụ câu thực tế?',
  'Formal hay Informal?',
  'Collocation phổ biến?',
  'Word family?',
  'Phân biệt với từ đồng nghĩa?',
];

const FAB_SIZE = 56; // w-14 h-14 = 56px

export function VocabChatbot({
  currentWord,
  wordType,
  wordDefinition,
  wordExamples = [],
}: VocabChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Drag state
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragMoved = useRef(false);
  const fabRef = useRef<HTMLButtonElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Khởi tạo vị trí mặc định (bottom-6 right-6)
  useEffect(() => {
    const initPos = () => {
      setPos({
        x: window.innerWidth - FAB_SIZE - 24,
        y: window.innerHeight - FAB_SIZE - 24,
      });
    };
    initPos();
    window.addEventListener('resize', initPos);
    return () => window.removeEventListener('resize', initPos);
  }, []);

  // Clamp vị trí trong màn hình
  const clamp = useCallback((x: number, y: number) => ({
    x: Math.max(0, Math.min(x, window.innerWidth - FAB_SIZE)),
    y: Math.max(0, Math.min(y, window.innerHeight - FAB_SIZE)),
  }), []);

  // ── Mouse drag ──
  const onMouseDown = (e: React.MouseEvent) => {
    if (isOpen) return;
    isDragging.current = true;
    dragMoved.current = false;
    dragOffset.current = {
      x: e.clientX - (pos?.x ?? 0),
      y: e.clientY - (pos?.y ?? 0),
    };
    e.preventDefault();
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      dragMoved.current = true;
      setPos(clamp(e.clientX - dragOffset.current.x, e.clientY - dragOffset.current.y));
    };
    const onMouseUp = () => { isDragging.current = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [clamp]);

  // ── Touch drag ──
  const onTouchStart = (e: React.TouchEvent) => {
    if (isOpen) return;
    isDragging.current = true;
    dragMoved.current = false;
    const t = e.touches[0];
    dragOffset.current = {
      x: t.clientX - (pos?.x ?? 0),
      y: t.clientY - (pos?.y ?? 0),
    };
  };

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      dragMoved.current = true;
      const t = e.touches[0];
      setPos(clamp(t.clientX - dragOffset.current.x, t.clientY - dragOffset.current.y));
      e.preventDefault();
    };
    const onTouchEnd = () => { isDragging.current = false; };
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [clamp]);

  const handleFabClick = () => {
    if (dragMoved.current) return; // kéo xong không mở
    setIsOpen(true);
  };

  useEffect(() => { setMessages([]); setInput(''); }, [currentWord]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 300); }, [isOpen]);
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const typeText =
    typeof wordType === 'string' ? wordType
    : Array.isArray(wordType) ? wordType.join(', ') : '';

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { role: 'user', content: text };
    const newMessages: Message[] = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/vocab-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: buildSystemPrompt(currentWord, typeText, wordDefinition || '', wordExamples),
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi không xác định');
      setMessages((prev) => [...prev, { role: 'assistant', content: data.text }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `⚠️ ${err.message || 'Không thể kết nối. Vui lòng thử lại.'}`,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* ── FAB draggable ── */}
      {pos && (
        <button
          ref={fabRef}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onClick={handleFabClick}
          aria-label="Mở Vocab Assistant"
          style={{ left: pos.x, top: pos.y, touchAction: 'none' }}
          className={[
            'fixed z-40 w-14 h-14 rounded-full',
            'bg-gradient-to-br from-violet-600 to-blue-600',
            'shadow-lg shadow-violet-900/40',
            'flex items-center justify-center',
            'transition-opacity duration-300',
            'cursor-grab active:cursor-grabbing select-none',
            isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100',
          ].join(' ')}
        >
          <span className="absolute inset-0 rounded-full bg-violet-500/30 animate-ping" />
          <Sparkles className="w-6 h-6 text-white relative z-10" />
          <span className="absolute -top-1 -right-1 text-[9px] font-black bg-amber-400 text-black px-1.5 py-0.5 rounded-full leading-none">
            AI
          </span>
        </button>
      )}

      {/* ── Chat Panel ── */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={() => setIsOpen(false)} />

          <div
            className={[
              'fixed z-50 flex flex-col overflow-hidden bg-zinc-950',
              'bottom-0 left-0 right-0',
              'h-[75dvh] max-h-[75dvh]',
              'rounded-t-3xl border-t-2 border-violet-900/50',
              'md:left-auto md:right-4 md:bottom-4',
              'md:w-[400px] md:h-[580px] md:max-h-[calc(100dvh-2rem)]',
              'md:rounded-2xl md:border-2 md:shadow-2xl md:shadow-violet-950/60',
            ].join(' ')}
            style={{ animation: 'slideUp 0.25s ease-out' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">Vocab Assistant</p>
                  <p className="text-[11px] text-violet-400 font-medium truncate">
                    Đang hỏi về: <span className="font-black text-violet-300">{currentWord}</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors shrink-0 ml-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 min-h-0">
              {messages.length === 0 && (
                <div className="text-center pt-4 pb-2">
                  <div className="w-14 h-14 rounded-2xl bg-violet-950/50 border border-violet-900/50 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-7 h-7 text-violet-400" />
                  </div>
                  <h3 className="font-bold text-white text-base mb-1">Hỏi về &ldquo;{currentWord}&rdquo;</h3>
                  <p className="text-xs text-zinc-500 max-w-[220px] mx-auto leading-relaxed">
                    Hỏi bất cứ điều gì về từ này: cách dùng, ví dụ, collocation...
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={[
                    'max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words',
                    msg.role === 'user'
                      ? 'bg-violet-600 text-white rounded-br-sm'
                      : 'bg-zinc-800 text-zinc-100 rounded-bl-sm border border-zinc-700/50',
                  ].join(' ')}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800 border border-zinc-700/50 px-4 py-3 rounded-2xl rounded-bl-sm">
                    <div className="flex gap-1.5 items-center h-4">
                      <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick chips */}
            {messages.length === 0 && (
              <div className="px-4 pb-2 flex gap-2 overflow-x-auto shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {QUICK_QUESTIONS.map((q) => (
                  <button key={q} onClick={() => sendMessage(q)} disabled={isLoading}
                    className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-violet-900/40 hover:border-violet-700 hover:text-violet-300 transition-all whitespace-nowrap disabled:opacity-40">
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-4 pb-4 pt-3 border-t border-zinc-800 shrink-0">
              <div className="flex gap-2 items-center bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-2.5 focus-within:border-violet-600 transition-colors">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const val = (e.currentTarget as HTMLInputElement).value; if (val.trim()) sendMessage(val); } }}
                  placeholder={`Hỏi về "${currentWord}"...`}
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none min-w-0"
                />
                <button onClick={() => { const val = inputRef.current?.value || ''; if (val.trim()) sendMessage(val); }} disabled={isLoading}
                  className="w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-30 flex items-center justify-center transition-all active:scale-95 shrink-0">
                  <Send className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}