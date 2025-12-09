'use client';

import { useState } from 'react';
import { Button } from '@/frontend/components/ui/button';
import { WordForm } from '@/frontend/components/word-form';
import { BulkForm } from '@/frontend/components/bulk-form';
import { ArrowLeft, Plus, Trash2, X, Pencil } from 'lucide-react'; // Thêm Pencil icon

interface WordListViewProps {
  groupName: string;
  words: any[];
  onBack: () => void;
  onAddWord: (eng: string, def: string, type: string[]) => void;
  onEditWord: (id: string, eng: string, def: string, type: string[]) => void; // Thêm prop này
  onDeleteWord: (id: string) => void;
  onLearn: () => void;
  onReload: () => void;
}

export function WordListView({ 
  groupName, words, onBack, onAddWord, onEditWord, onDeleteWord, onLearn, onReload 
}: WordListViewProps) {
  
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editingWord, setEditingWord] = useState<any | null>(null); // State lưu từ đang sửa

  const handleSaveWord = (e: string, d: string, t: string[]) => {
    if (editingWord) {
      // Logic sửa
      onEditWord(editingWord.id, e, d, t);
      setEditingWord(null);
    } else {
      // Logic thêm mới
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
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex flex-wrap items-center justify-between gap-3 bg-card/20 min-h-[64px]">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { onBack(); cancelForm(); setShowBulk(false); }}>
              <ArrowLeft className="w-5 h-5"/>
          </Button>
          <h2 className="text-xl font-bold truncate max-w-[150px] sm:max-w-xs">{groupName}</h2>
        </div>
        <div className="flex items-center gap-2">
           {!showForm && !showBulk ? (
             <>
              <Button onClick={onLearn} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">▶ Học</Button>
              <Button variant="outline" size="icon" title="Thêm từ" onClick={() => setShowForm(true)}><Plus className="w-4 h-4"/></Button>
              <Button variant="outline" onClick={() => setShowBulk(true)}>Bulk</Button>
             </>
           ) : (
              <Button variant="secondary" onClick={() => { cancelForm(); setShowBulk(false); }}><X className="w-4 h-4 mr-1"/> Quay lại</Button>
           )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4 pb-10">
          
          {/* FORM: Dùng chung cho cả Thêm và Sửa */}
          {showForm && (
            <div className="mb-6 p-6 border rounded-xl bg-card shadow-sm animate-in fade-in zoom-in-95 duration-200">
              <WordForm 
                onSave={handleSaveWord} 
                onCancel={cancelForm} 
                initialData={editingWord} // Truyền dữ liệu cũ vào nếu đang sửa
              />
            </div>
          )}
          
          {showBulk && (
            <div className="mb-6 animate-in fade-in zoom-in-95 duration-200">
              <BulkForm group={groupName} onDone={() => { setShowBulk(false); onReload(); }} />
            </div>
          )}

          {!showForm && !showBulk && (
            <div className="grid gap-2">
                {words.length === 0 && <div className="text-center text-muted-foreground mt-20">Danh sách trống.</div>}
                {words.map((word) => (
                  <div key={word.id} className="group flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition">
                    <div className="min-w-0 pr-4">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-semibold text-lg">{word.english}</span>
                        {word.type.length > 0 && <span className="text-xs text-blue-500 bg-blue-500/10 px-1.5 rounded">{word.type.join(', ')}</span>}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{word.definition}</p>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Nút Sửa */}
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={() => startEdit(word)}>
                        <Pencil className="w-4 h-4"/>
                      </Button>
                      
                      {/* Nút Xóa */}
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => onDeleteWord(word.id)}>
                        <Trash2 className="w-4 h-4"/>
                      </Button>
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