'use client';

import { useState } from 'react';
import { Button } from '../ui/button';
import { WordForm } from '../word-form';
import { BulkForm } from '../bulk-form';
import { ArrowLeft, Plus, Trash2, X, Pencil, PlayCircle } from 'lucide-react';

// ✅ KHAI BÁO GIAO DIỆN CHÍNH XÁC
interface WordListViewProps {
  groupName: string;
  words: any[];
  onBack: () => void; // ✅ Có cái này thì MainApp truyền mới nhận được
  onAddWord: (eng: string, def: string, type: string[]) => void;
  onEditWord?: (id: string, eng: string, def: string, type: string[]) => void;
  onDeleteWord: (id: string) => void;
  onLearn: () => void;
  onUpdate: () => void; // ✅ Đổi onReload -> onUpdate
}

export function WordListView({ 
  groupName, words, onBack, onAddWord, onEditWord, onDeleteWord, onLearn, onUpdate 
}: WordListViewProps) {
  
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editingWord, setEditingWord] = useState<any | null>(null);

  const handleSaveWord = (e: string, d: string, t: string[]) => {
    if (editingWord && onEditWord) {
      onEditWord(editingWord.id, e, d, t);
      setEditingWord(null);
    } else {
      onAddWord(e, d, t);
    }
    setShowForm(false);
  };

  const startEdit = (word: any) => {
    setEditingWord(word);
    setShowForm(true);
    setShowBulk(false);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingWord(null);
  };

  return (
    <div className="h-full flex flex-col bg-black text-white">
      <div className="p-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-zinc-900/50 min-h-[64px]">
        <div className="flex items-center gap-3">
          {/* ✅ NÚT BACK GỌI HÀM onBack */}
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={() => { onBack(); cancelForm(); setShowBulk(false); }}>
              <ArrowLeft className="w-5 h-5"/>
          </Button>
          <h2 className="text-xl font-bold truncate max-w-[150px] sm:max-w-xs">{groupName}</h2>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full">{words.length} từ</span>
        </div>
        <div className="flex items-center gap-2">
           {!showForm && !showBulk ? (
             <>
              <Button onClick={onLearn} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-bold">
                <PlayCircle className="w-4 h-4 mr-2"/> Học ngay
              </Button>
              <Button variant="outline" size="icon" title="Thêm từ" onClick={() => setShowForm(true)} className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white">
                <Plus className="w-4 h-4"/>
              </Button>
              <Button variant="outline" onClick={() => setShowBulk(true)} className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white hidden sm:flex">
                Nhập nhanh
              </Button>
             </>
           ) : (
              <Button variant="secondary" onClick={() => { cancelForm(); setShowBulk(false); }}><X className="w-4 h-4 mr-1"/> Hủy</Button>
           )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-black">
        <div className="max-w-4xl mx-auto space-y-4 pb-20">
          
          {showForm && (
            <div className="mb-6 p-6 border border-zinc-800 rounded-xl bg-zinc-900 shadow-sm animate-in fade-in zoom-in-95 duration-200">
              <h3 className="font-bold mb-4 text-zinc-400">{editingWord ? 'Chỉnh sửa từ' : 'Thêm từ mới'}</h3>
              <WordForm onSave={handleSaveWord} onCancel={cancelForm} initialData={editingWord} />
            </div>
          )}
          
          {showBulk && (
            <div className="mb-6 animate-in fade-in zoom-in-95 duration-200">
              <BulkForm group={groupName} onDone={() => { setShowBulk(false); onUpdate(); }} />
            </div>
          )}

          {!showForm && !showBulk && (
            <div className="grid gap-3">
                {words.length === 0 && <div className="text-center text-zinc-500 mt-20 italic">Chưa có từ nào trong nhóm này.</div>}
                
                {words.map((word) => (
                  <div key={word.id} className="group flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800/80 hover:border-zinc-700 transition duration-200">
                    <div className="min-w-0 pr-4">
                      <div className="flex items-baseline gap-2 flex-wrap mb-1">
                        <span className="font-bold text-lg text-white">{word.english}</span>
                        {word.type && word.type.length > 0 && (
                            <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-950/50 border border-blue-900/50 px-1.5 py-0.5 rounded">
                                {Array.isArray(word.type) ? word.type.join(', ') : word.type}
                            </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400 truncate">{word.definition}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-white hover:bg-zinc-700" onClick={() => startEdit(word)}><Pencil className="w-4 h-4"/></Button>
                      <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-red-400 hover:bg-red-950/30" onClick={() => onDeleteWord(word.id)}><Trash2 className="w-4 h-4"/></Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}