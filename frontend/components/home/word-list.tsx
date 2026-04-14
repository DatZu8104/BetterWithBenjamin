'use client';

import { useState, useRef, useEffect } from 'react';
import { WordForm } from '../word-form';
import { ArrowLeft, Plus, Trash2, X, Pencil, PlayCircle, ListPlus, Save, CheckCircle, Loader2, Search, BookOpen, Volume2, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';
import { FeatureHint } from '../onboarding/FeatureHint';
import { notify } from '../../lib/notify';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface WordListViewProps {
  groupName: string;
  words: any[];
  onBack: () => void;
  onAddWord: (eng: string, def: string, type: string[]) => Promise<void>;
  onEditWord?: (id: string, eng: string, def: string, type: string[]) => void;
  onDeleteWord: (id: string) => void;
  onLearn: () => void;
  allowEdit?: boolean;
  onUpdate: () => void;
}

export function WordListView({ 
  groupName, words, onBack, onAddWord, onEditWord, onDeleteWord, onLearn, onUpdate, allowEdit 
}: WordListViewProps) {
  
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editingWord, setEditingWord] = useState<any | null>(null);
  const [localSearch, setLocalSearch] = useState('');

  // Bulk Import State
  const [bulkText, setBulkText] = useState('');
  const [parsedWords, setParsedWords] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Modal State
  const [detailWord, setDetailWord] = useState<any | null>(null);

  // Infinite Scroll State & Ref
  const [visibleCount, setVisibleCount] = useState(50);
  // --- STATE CHO XÓA TỪ ---
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [wordToDelete, setWordToDelete] = useState<string | null>(null);

  // Hàm 1: Khi bấm vào thùng rác -> Chưa xóa vội, chỉ lưu ID lại và mở bảng hỏi
  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setWordToDelete(id);
    setIsConfirmOpen(true);
  };

  // Hàm 2: Khi người dùng chọn "Delete" trên bảng hỏi -> Mới thực sự xóa
  const confirmDelete = () => {
    if (wordToDelete) {
      onDeleteWord(wordToDelete); // Gọi hàm xóa thật sự
      setIsConfirmOpen(false);    // Đóng bảng
      setWordToDelete(null);      // Xóa ID tạm
    }
  };
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      setVisibleCount(50);
  }, [groupName, localSearch]);

  useEffect(() => {
      const observer = new IntersectionObserver((entries) => {
           if (entries[0].isIntersecting) {
              setVisibleCount(prev => prev + 50); 
          }
      }, { 
          rootMargin: "200px"
      });

      if (loaderRef.current) {
          observer.observe(loaderRef.current);
      }

      return () => observer.disconnect();
  }, []); 

  // --- HÀM PHÁT AUDIO NHANH ---
  const playAudio = (e: React.MouseEvent, url: string | undefined, text: string, type: 'us' | 'uk' = 'us') => {
    e.stopPropagation(); 
    if (url && url.startsWith('http')) {
        new Audio(url).play().catch(err => console.log("Audio play error:", err));
    } else {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = type === 'uk' ? 'en-GB' : 'en-US';
        window.speechSynthesis.speak(u);
    }
  };

  const handleSaveWord = async (e: string, d: string, t: string[]) => {
    try {
        if (editingWord && onEditWord) {
            onEditWord(editingWord.id, e, d, t);
            setEditingWord(null);
        } else {
            await onAddWord(e, d, t);
        }
        setShowForm(false);
    } catch (err) {
        alert("Error saving word. Please try again.");
    }
  };

  const startEdit = (word: any) => {
    if (word.isGlobal && !allowEdit) {
        alert("You cannot edit Oxford system vocabulary.");
        return;
    }
    setEditingWord(word);
    setShowForm(true);
    setShowBulk(false);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingWord(null);
    setShowBulk(false);
    setBulkText('');
    setParsedWords([]);
  };

  const handlePreview = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.split('\n');
    const validWords: any[] = [];
    lines.forEach(line => {
        if (!line.trim()) return;
        const parts = line.split('-').map(p => p.trim());
        if (parts.length >= 2) {
            validWords.push({
                english: parts[0],
                definition: parts[1],
                type: parts[2] ? parts[2].split(',').map(t => t.trim()) : ['noun']
            });
        }
    });
    setParsedWords(validWords);
  };

  const handleBulkSave = async () => {
      if (parsedWords.length === 0) return;
      setIsSaving(true);
      try {
          for (const w of parsedWords) await onAddWord(w.english, w.definition, w.type);
          alert(`✅ Successfully added ${parsedWords.length} words!`);
          cancelForm();
      } catch (error) { alert("⚠️ Connection error."); } finally { setIsSaving(false); }
  };

  const filteredWords = words.filter(w => {
    const mainWord = w.word || w.english || "";
    const mainDef = w.definition || (w.definitions?.[0]?.definition) || "";
    return mainWord.toLowerCase().includes(localSearch.toLowerCase()) || 
           mainDef.toLowerCase().includes(localSearch.toLowerCase());
  });

  const displayedWords = filteredWords.slice(0, visibleCount);

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-white relative">
      {/* --- HEADER --- */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => { onBack(); cancelForm(); }} className="p-2 rounded-full hover:bg-white/10 transition-colors text-zinc-400 hover:text-white">
              <ArrowLeft className="w-5 h-5"/>
          </button>
          <div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent truncate max-w-[150px] sm:max-w-xs">
                  {groupName}
              </h2>
              <p className="text-xs text-zinc-500 font-medium">{words.length} cards</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           {!showForm && !showBulk ? (
             <>
              <button onClick={onLearn} className="hidden sm:flex px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-900/20">
                <PlayCircle className="w-4 h-4"/> Learn Now
              </button>
              <button onClick={onLearn} className="sm:hidden p-2 bg-blue-600 rounded-full text-white"><PlayCircle className="w-5 h-5"/></button>

              {allowEdit && (
                  <>
                    <button onClick={() => setShowForm(true)} className="p-2 sm:px-3 sm:py-2 bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-white rounded-xl flex items-center gap-2 transition-colors">
                        <Plus className="w-4 h-4"/> <span className="hidden sm:inline">Add</span>
                    </button>
                    <button onClick={() => setShowBulk(true)} className="p-2 sm:px-3 sm:py-2 bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-white rounded-xl flex items-center gap-2 transition-colors">
                        <ListPlus className="w-4 h-4"/> <span className="hidden sm:inline">Import</span>
                    </button>
                  </>
              )}
             </>
           ) : (
              <button onClick={cancelForm} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-bold flex items-center gap-2 transition-colors">
                  <X className="w-4 h-4"/> Close
              </button>
           )}
        </div>
      </div>

      {/* --- BODY --- */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
          
          {/* Search Bar */}
          {!showForm && !showBulk && words.length > 5 && (
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text" 
                    placeholder="Search word or definition..." 
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
              </div>
          )}

          {/* Forms */}
          {showForm && (
            <div className="p-6 border border-white/10 rounded-2xl bg-zinc-900/80 backdrop-blur shadow-2xl animate-in fade-in zoom-in-95 duration-300">
              <h3 className="text-lg font-bold mb-6 text-white flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-blue-500"/> {editingWord ? 'Edit Card' : 'Create New Card'}
              </h3>
              <WordForm onSave={handleSaveWord} onCancel={cancelForm} initialData={editingWord} />
            </div>
          )}
          
          {showBulk && (
            <div className="p-6 border border-white/10 rounded-2xl bg-zinc-900/80 backdrop-blur shadow-2xl">
               <h3 className="text-lg font-bold text-white mb-2">Bulk Import</h3>
               <textarea className="w-full h-48 bg-black/50 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-blue-500 outline-none resize-none font-mono"
                  placeholder={`run - chạy bộ - verb`} value={bulkText} onChange={e => setBulkText(e.target.value)} />
               <div className="flex gap-3 mt-4">
                  <button onClick={handlePreview} className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl">Check</button>
                  <button onClick={() => { setBulkText(''); setParsedWords([]); }} className="px-5 py-2.5 text-zinc-400 hover:text-white">Clear</button>
               </div>
               {parsedWords.length > 0 && (
                  <div className="mt-6 border-t border-white/10 pt-4">
                      <p className="text-sm font-bold text-green-400 mb-3 flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Valid: {parsedWords.length}</p>
                      <button onClick={handleBulkSave} disabled={isSaving} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2">{isSaving ? "Saving..." : "Save All"}</button>
                  </div>
               )}
            </div>
          )}

          {/* WORD LIST */}
          {!showForm && !showBulk && (
            <div className="space-y-3">
                {words.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                        <BookOpen className="w-12 h-12 mb-4 opacity-20"/>
                        <p className="text-lg">No words in this group.</p>
                    </div>
                ) : filteredWords.length === 0 ? (
                    <div className="text-center py-10 text-zinc-500">No matching words found.</div>
                ) : (
                    <>
                        {displayedWords.map((word, index) => {
                          const displayWord = word.word || word.english;
                          const displayLevel = word.level || (word.group?.includes('Level') ? word.group.split('Level ')[1] : null);
                          const displayPhonetic = word.phonetics?.us || word.phonetics?.uk || word.ipa || "";

                          const cardInnerContent = (
                            <>
                              <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:gap-3 pr-2 sm:pr-4">
                                  {/* HÀNG 1 (Mobile) / CỤM 1 (Desktop) */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                      {displayLevel && (
                                          <span className="text-[10px] font-bold bg-yellow-600/20 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-600/30">
                                              {displayLevel}
                                          </span>
                                      )}
                                      {!displayLevel && word.group && (
                                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 font-medium truncate max-w-[100px] sm:max-w-[140px] shrink-0">
                                              {word.group}
                                          </span>
                                      )}
                                      <span className="font-bold text-base sm:text-lg text-white group-hover:text-blue-400 transition-colors truncate">
                                          {displayWord}
                                      </span>
                                      {word.learned && (
                                          <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                                              Learned
                                          </span>
                                      )}
                                  </div>

                                  {/* HÀNG 2 (Mobile) / CỤM 2 (Desktop) */}
                                  <div className="flex items-center gap-2 mt-1 sm:mt-0">
                                      {word.type && (
                                          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-zinc-500 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded shrink-0">
                                              {Array.isArray(word.type) ? word.type.join(', ') : word.type}
                                          </span>
                                      )}
                                      {displayPhonetic && (
                                          <span className="text-[11px] sm:text-xs text-zinc-500 font-mono shrink-0">
                                              {displayPhonetic}
                                          </span>
                                      )}
                                  </div>
                              </div>

                              {/* BÊN PHẢI: Các nút hành động */}
                              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                  {allowEdit && (
                                    <button onClick={(e) => { e.stopPropagation(); startEdit(word); }} className="p-1.5 sm:p-2 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors">
                                        <Pencil className="w-4 h-4"/>
                                    </button>
                                  )}
                                  {allowEdit && (
                                    <button onClick={(e) => handleDeleteClick(e, word.id)} className="p-1.5 sm:p-2 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4"/>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </>
                          );

                          const cardClasses = "group flex items-center justify-between p-3 sm:p-4 rounded-2xl border border-white/5 bg-zinc-900 hover:bg-zinc-800 hover:border-blue-500/30 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer w-full";

                          if (index === 0) {
                              return (
                                  <FeatureHint
                                      key={word.id}
                                      id={"word_detail_click_tour" as any}
                                      side="bottom"
                                      align="start"
                                      delay={400}
                                      message={
                                          <div className="space-y-1.5 w-[220px]">
                                              <p className="font-bold text-white flex items-center gap-1.5">
                                                  <BookOpen className="w-4 h-4 text-blue-400" />
                                                  View Definition!
                                              </p>
                                              <p className="text-zinc-100 text-sm leading-snug font-normal">
                                                  Click anywhere on a word card to see its full meaning and examples.
                                              </p>
                                          </div>
                                      }
                                  >
                                      <div onClick={() => setDetailWord(word)} className={cardClasses}>
                                          {cardInnerContent}
                                      </div>
                                  </FeatureHint>
                              );
                          }

                          return (
                            <div key={word.id} onClick={() => setDetailWord(word)} className={cardClasses}>
                                {cardInnerContent}
                            </div>
                          )
                        })}

                        {visibleCount < filteredWords.length && (
                            <div ref={loaderRef} className="w-full h-16 flex items-center justify-center mt-6">
                                <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
                            </div>
                        )}
                    </>
                )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL HIỂN THỊ CHI TIẾT NGHĨA TỪ */}
      {detailWord && (() => {
          const actualData = detailWord?.wordId || detailWord || {};
          const definitions = (actualData.definitions && actualData.definitions.length > 0)
              ? actualData.definitions
              : [{
                  order: 1,
                  label: 'Definition',
                  definition: actualData.definition || "There is no definition available.",
                  examples: actualData.example ? [actualData.example] : []
              }];
          const phonetics = actualData.phonetics || {};
          const displayWord = actualData.word || actualData.english || "Unknown";

          return (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setDetailWord(null)}>
                  
                  <div className="w-[95vw] sm:w-[90vw] max-w-5xl h-[95vh] sm:h-[90vh] bg-zinc-800 border-2 border-blue-900/50 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>

                      {/* Modal Header */}
                      <div className="p-4 sm:p-5 px-5 sm:px-8 border-b border-zinc-900/50 bg-zinc-900 flex justify-between items-start shrink-0">
                          
                          <div className="flex-1 min-w-0 pr-3 sm:pr-4 flex flex-col justify-center">
                              
                              <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                                  <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight break-words">{displayWord}</h2>
                                  {actualData.type && (
                                      <span className="text-sm sm:text-base text-blue-400 italic font-serif opacity-90 shrink-0">
                                          {Array.isArray(actualData.type) ? actualData.type.join(', ') : actualData.type}
                                      </span>
                                  )}
                              </div>
                              
                              {/* --- BỌC HIỆU ỨNG TOUR CHO CỤM NÚT ÂM THANH --- */}
                              {(phonetics.us || actualData.audio?.us || phonetics.uk || actualData.audio?.uk) && (
                                  <FeatureHint
                                      id={"modal_audio_tour" as any}
                                      side="bottom"
                                      align="start"
                                      delay={300} // Chờ 0.3s để modal mở xong mới hiện Tour
                                      message={
                                          <div className="space-y-1.5 w-[220px]">
                                              <p className="font-bold text-white flex items-center gap-1.5">
                                                  <Volume2 className="w-4 h-4 text-blue-400" />
                                                  Listen to pronunciation!
                                              </p>
                                              <p className="text-zinc-100 text-sm leading-snug font-normal">
                                                  Click the US or UK button to hear the correct pronunciation of this word.
                                              </p>
                                          </div>
                                      }
                                  >
                                      <div className="flex items-center gap-3 sm:gap-5 mt-1 sm:mt-1.5 w-full flex-nowrap overflow-hidden">
                                          
                                          {(phonetics.us || actualData.audio?.us) && (
                                              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink">
                                                  <button 
                                                      onClick={(e) => playAudio(e, actualData.audio?.us, displayWord, 'us')} 
                                                      className="shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all text-[9px] sm:text-[10px] font-bold"
                                                      title="Play US pronunciation"
                                                  >
                                                      US
                                                  </button>
                                                  {phonetics.us && <span className="text-[10px] sm:text-xs text-zinc-400 font-mono tracking-wide truncate">{phonetics.us}</span>}
                                              </div>
                                          )}

                                          {(phonetics.uk || actualData.audio?.uk) && (
                                              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink">
                                                  <button 
                                                      onClick={(e) => playAudio(e, actualData.audio?.uk, displayWord, 'uk')} 
                                                      className="shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-white transition-all text-[9px] sm:text-[10px] font-bold"
                                                      title="Play UK pronunciation"
                                                  >
                                                      UK
                                                  </button>
                                                  {phonetics.uk && <span className="text-[10px] sm:text-xs text-zinc-400 font-mono tracking-wide truncate">{phonetics.uk}</span>}
                                              </div>
                                          )}
                                      </div>
                                  </FeatureHint>
                              )}
                          </div>

                          <button onClick={() => setDetailWord(null)} className="p-1.5 sm:p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-400 hover:text-white transition-colors shrink-0 mt-0.5">
                              <X className="w-5 h-5"/>
                          </button>
                      </div>

                      {/* Modal Body (Definitions) */}
                      <div className="p-4 sm:p-6 px-5 sm:px-8 overflow-y-auto custom-scrollbar flex-1 bg-zinc-800 text-left relative">
                          {actualData.href && (
                              <div className="absolute top-4 sm:top-5 right-4 sm:right-5 z-10">
                                  <a href={actualData.href} target="_blank" rel="noopener noreferrer" className="text-[10px] sm:text-xs font-bold text-blue-400 flex items-center gap-1.5 hover:bg-blue-600 hover:text-white bg-blue-950/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-blue-900 transition-all">
                                      View on Oxford <ExternalLink className="w-3 h-3"/>
                                  </a>
                              </div>
                          )}

                          <div className="space-y-5 sm:space-y-6 pb-6 pt-1">
                              {definitions.map((def: any, idx: number) => (
                                  <div key={idx} className="relative pl-3 sm:pl-4 border-l-2 sm:border-l-[3px] border-blue-500/30">
                                      <div className="flex items-center gap-2 mb-1.5">
                                          <div className="bg-blue-500/10 text-blue-300 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-wider">
                                              {def.label || `Meaning ${idx + 1}`}
                                          </div>
                                      </div>
                                      
                                      <h3 className="text-base sm:text-lg text-white font-medium leading-relaxed mb-2 sm:mb-2.5">{def.definition}</h3>
                                      
                                      {def.examples && def.examples.length > 0 && (
                                          <div className="space-y-1.5 sm:space-y-2 bg-black/20 p-3 sm:p-4 rounded-xl border border-white/5">
                                              {def.examples.map((ex: string, i: number) => (
                                                  <div key={i} className="flex gap-2 items-start">
                                                      <span className="text-blue-500/50 text-[10px] sm:text-xs mt-1 sm:mt-1.5">●</span>
                                                      <p className="text-zinc-300 text-sm italic leading-relaxed">"{ex}"</p>
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
          );
      })()}
      <ConfirmDialog 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Word"
        description="Are you sure you want to delete this word? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    
    </div>
  );
}