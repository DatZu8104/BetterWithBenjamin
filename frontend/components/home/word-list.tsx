'use client';

import { useState } from 'react';
import { WordForm } from '../word-form';
import { ArrowLeft, Plus, Trash2, X, Pencil, PlayCircle, ListPlus, Save, CheckCircle, Loader2, Search, BookOpen } from 'lucide-react';
import { cn } from '../../lib/utils';

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
  groupName, words, onBack, onAddWord, onEditWord, onDeleteWord, onLearn, onUpdate 
}: WordListViewProps) {
  
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editingWord, setEditingWord] = useState<any | null>(null);
  const [localSearch, setLocalSearch] = useState('');

  // Bulk Import State
  const [bulkText, setBulkText] = useState('');
  const [parsedWords, setParsedWords] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

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
          for (const w of parsedWords) {
              await onAddWord(w.english, w.definition, w.type);
          }
          alert(`✅ Successfully added ${parsedWords.length} words!`);
          cancelForm();
      } catch (error) {
          alert("⚠️ Connection error. Please login again.");
      } finally {
          setIsSaving(false);
      }
  };

  const filteredWords = words.filter(w => 
    w.english.toLowerCase().includes(localSearch.toLowerCase()) || 
    w.definition.toLowerCase().includes(localSearch.toLowerCase())
  );

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
              <button 
                onClick={onLearn} 
                className="hidden sm:flex px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-900/20 font-bold rounded-xl items-center gap-2 transition-all active:scale-95"
              >
                <PlayCircle className="w-4 h-4"/> Learn Now
              </button>
              <button onClick={onLearn} className="sm:hidden p-2 bg-blue-600 rounded-full text-white"><PlayCircle className="w-5 h-5"/></button>

              <button 
                onClick={() => setShowForm(true)} 
                title="Add Word"
                className="p-2 sm:px-3 sm:py-2 bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-white rounded-xl flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4"/> <span className="hidden sm:inline">Add</span>
              </button>
              
              <button 
                onClick={() => setShowBulk(true)} 
                title="Bulk Import"
                className="p-2 sm:px-3 sm:py-2 bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-white rounded-xl flex items-center gap-2 transition-colors"
              >
                <ListPlus className="w-4 h-4"/> <span className="hidden sm:inline">Import</span>
              </button>
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
          
          {!showForm && !showBulk && words.length > 5 && (
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text" 
                    placeholder="Search in this group..." 
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
              </div>
          )}

          {showForm && (
            <div className="p-6 border border-white/10 rounded-2xl bg-zinc-900/80 backdrop-blur shadow-2xl animate-in fade-in zoom-in-95 duration-300">
              <h3 className="text-lg font-bold mb-6 text-white flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-blue-500"/>
                  {editingWord ? 'Edit Card' : 'Create New Card'}
              </h3>
              <WordForm onSave={handleSaveWord} onCancel={cancelForm} initialData={editingWord} />
            </div>
          )}
          
          {showBulk && (
            <div className="p-6 border border-white/10 rounded-2xl bg-zinc-900/80 backdrop-blur shadow-2xl animate-in fade-in zoom-in-95 duration-300">
               <div className="flex justify-between items-start mb-4">
                  <div>
                      <h3 className="text-lg font-bold text-white mb-1">Bulk Import</h3>
                      <p className="text-xs text-zinc-400 font-mono bg-zinc-800 px-2 py-1 rounded inline-block">Format: word - definition - type</p>
                  </div>
               </div>
               
               <textarea 
                  className="w-full h-48 bg-black/50 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none font-mono leading-relaxed"
                  placeholder={`run - chạy bộ - verb\nbeautiful - xinh đẹp - adjective\napple - quả táo`}
                  value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
                  spellCheck={false}
               />
               
               <div className="flex gap-3 mt-4">
                  <button onClick={handlePreview} className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors">
                    Check
                  </button>
                  <button onClick={() => { setBulkText(''); setParsedWords([]); }} className="px-5 py-2.5 text-zinc-400 hover:text-white transition-colors">
                    Clear
                  </button>
               </div>

               {parsedWords.length > 0 && (
                  <div className="mt-6 border-t border-white/10 pt-4 animate-in slide-in-from-bottom-2">
                      <p className="text-sm font-bold text-green-400 mb-3 flex items-center gap-2">
                         <CheckCircle className="w-4 h-4"/> Valid: {parsedWords.length} words
                      </p>
                      <div className="max-h-60 overflow-y-auto bg-black/30 rounded-xl border border-white/5 p-3 space-y-2 mb-4 custom-scrollbar">
                          {parsedWords.map((w, i) => (
                              <div key={i} className="text-sm flex gap-3 items-center border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                  <span className="text-white font-bold min-w-[80px]">{w.english}</span>
                                  <span className="text-zinc-600">→</span>
                                  <span className="text-zinc-300 truncate">{w.definition}</span>
                                  <span className="text-xs text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded ml-auto border border-blue-500/20">
                                    {w.type.join(', ')}
                                  </span>
                              </div>
                          ))}
                      </div>
                      <button 
                        onClick={handleBulkSave} 
                        disabled={isSaving}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                         {isSaving ? <><Loader2 className="w-5 h-5 animate-spin"/> Saving...</> : <><Save className="w-5 h-5"/> Save All</>}
                      </button>
                  </div>
               )}
            </div>
          )}

          {!showForm && !showBulk && (
            <div className="space-y-3">
                {words.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                        <BookOpen className="w-12 h-12 mb-4 opacity-20"/>
                        <p className="text-lg">No words in this group.</p>
                        <p className="text-sm">Add a new word or use Bulk Import.</p>
                    </div>
                ) : filteredWords.length === 0 ? (
                    <div className="text-center py-10 text-zinc-500">No matching words found.</div>
                ) : (
                    filteredWords.map((word) => (
                      <div key={word.id} className="group flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-zinc-900 hover:bg-zinc-800 hover:border-blue-500/30 transition-all duration-300 shadow-sm hover:shadow-md">
                        <div className="min-w-0 pr-4">
                          <div className="flex items-baseline gap-2 flex-wrap mb-1">
                            <span className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">{word.english}</span>
                            {word.type && (
                                <span className="text-[10px] uppercase font-bold text-zinc-500 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded">
                                    {Array.isArray(word.type) ? word.type.join(', ') : word.type}
                                </span>
                            )}
                            {word.learned && <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">Learned</span>}
                          </div>
                          <p className="text-sm text-zinc-400 truncate group-hover:text-zinc-300">{word.definition}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all transform sm:translate-x-2 group-hover:translate-x-0">
                          <button onClick={() => startEdit(word)} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors" title="Edit"><Pencil className="w-4 h-4"/></button>
                          <button onClick={() => onDeleteWord(word.id)} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors" title="Delete"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      </div>
                    ))
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}