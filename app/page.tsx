'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WordForm } from '@/components/word-form';
import { Flashcard } from '@/components/flashcard';
import { db } from '@/lib/db';
import { BulkForm } from '@/components/bulk-form';

interface Word {
  id: string;
  english: string;
  definition: string;
  type: string[];
  group: string;
}

export default function Home() {
  const [words, setWords] = useState<Word[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  // learn
  const [learnMode, setLearnMode] = useState(false);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [learnedIds, setLearnedIds] = useState<string[]>([]);
  const [isResetting, setIsResetting] = useState(false);

  const loadWords = async () => {
    const arr = await db.words.toArray();

    const normalized = arr.map((w: any) => ({
      ...w,
      type: Array.isArray(w.type) ? w.type : w.type ? [w.type] : [],
      group: w.group || 'default',
    }));

    await db.words.bulkPut(normalized);
    setWords(normalized);

    const names = Array.from(new Set(normalized.map((w) => w.group)));
    setGroups(names);
  };

  useEffect(() => {
    loadWords();
  }, []);

  const filteredWords = selectedGroup
    ? words.filter((w) => w.group === selectedGroup)
    : [];

  const addWord = async (english: string, definition: string, type: string[]) => {
    if (!selectedGroup) return alert('Chưa chọn group!');

    await db.words.add({
      id: crypto.randomUUID(),
      english,
      definition,
      type,
      group: selectedGroup,
    });

    loadWords();
    setShowForm(false);
  };

  const addGroup = () => {
    const name = prompt('Nhập tên group:');
    if (!name) return;

    if (groups.includes(name)) return alert('Group đã tồn tại!');

    setGroups((prev) => [...prev, name]);
  };

  const deleteGroup = async (group: string) => {
    if (!confirm(`Xóa group "${group}" và toàn bộ từ?`)) return;

    const list = words.filter((w) => w.group === group);

    for (const w of list) {
      await db.words.delete(w.id);
      await db.learned.delete(w.id);
    }

    await loadWords();
    setSelectedGroup(null);
    setLearnMode(false);
  };

  const deleteWord = async (id: string) => {
    await db.words.delete(id);
    await db.learned.delete(id);
    loadWords();
  };

  const exportAll = async () => {
    const words = await db.words.toArray();
    const learned = await db.learned.toArray();

    const data = {
      exportedAt: new Date().toISOString(),
      groups: [...new Set(words.map((w) => w.group))],
      words,
      learned: learned.map((x) => x.id),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vocab_backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importAll = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.words) return alert('File không hợp lệ!');

      // CLEAN data like BulkForm
      const cleanedWords = data.words.map((w: any) => ({
        id: w.id ?? crypto.randomUUID(),
        english: w.english ?? '',
        definition: w.definition ?? '',
        type: Array.isArray(w.type) ? w.type : w.type ? [w.type] : [],
        group: w.group ?? 'default',
      }));

      const cleanedLearned = (data.learned ?? []).map((id: string) => ({ id }));

      await db.words.clear();
      await db.learned.clear();

      await db.words.bulkPut(cleanedWords);
      if (cleanedLearned.length > 0) {
        await db.learned.bulkPut(cleanedLearned);
      }

      alert('Import thành công!');
      loadWords();
    } catch (err) {
      console.error('Import failed', err);
      alert('Import thất bại. Kiểm tra console.');
    }
  };

  const startLearn = async () => {
    const learned = await db.learned.toArray();
    setLearnedIds(learned.map((l) => l.id));
    setLearnMode(true);
    setTimeout(() => pickRandomWord(), 80);
  };

  const pickRandomWord = async () => {
    const remaining = filteredWords.filter((w) => !learnedIds.includes(w.id));
    if (remaining.length === 0) {
      setCurrentWord(null);
      return;
    }

    const rand = remaining[Math.floor(Math.random() * remaining.length)];
    setCurrentWord(rand);

    await db.learned.add({ id: rand.id }).catch(() => {});
    setLearnedIds((prev) => [...prev, rand.id]);
  };

  const resetLearn = async () => {
    setIsResetting(true);
    await db.learned.clear();
    setLearnedIds([]);
    setCurrentWord(null);
    await new Promise((r) => setTimeout(r, 80));
    pickRandomWord();
    setIsResetting(false);
  };

  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto relative">
      {/* TOP */}
      <div className="absolute top-4 right-4 flex gap-3 z-50">
        <Button onClick={exportAll} className="bg-blue-600 hover:bg-blue-700">
          📤 Export
        </Button>

        <label className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded cursor-pointer">
          📥 Import
          <input type="file" accept="application/json" className="hidden" onChange={importAll} />
        </label>
      </div>

      <h1 className="text-4xl font-bold text-center mb-10 mt-16">Vocabulary Groups</h1>

      {/* HOME */}
      {selectedGroup === null && !learnMode && (
        <>
          <div className="text-center">
            <Button size="lg" onClick={addGroup}>➕ Tạo Group</Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-10">
            {groups.map((g) => {
              const cnt = words.filter((w) => w.group === g).length;
              return (
                <Card key={g} className="p-5 flex flex-col items-center border rounded-xl">
                  <p className="text-xl font-semibold">{g}</p>
                  <p className="text-sm text-muted-foreground">{cnt} từ</p>

                  <div className="flex gap-2 mt-4">
                    <Button onClick={() => setSelectedGroup(g)}>Xem</Button>
                    <Button onClick={() => { setSelectedGroup(g); startLearn(); }}>Học</Button>
                    <Button variant="destructive" onClick={() => deleteGroup(g)}>Xóa</Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* INSIDE GROUP */}
      {selectedGroup !== null && !learnMode && (
        <div>
          <Button variant="secondary" onClick={() => setSelectedGroup(null)}>← Quay lại</Button>

          <h2 className="text-3xl font-bold text-center mt-6">Group: {selectedGroup}</h2>
          <div className="flex justify-center mt-4 mb-6">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={startLearn}>📘 Học nhóm này</Button>
          </div>

          <div className="flex justify-between items-center mb-6">
            {!showForm ? (
              <div className="flex items-center gap-2">
                <Button onClick={() => setShowForm(true)}>➕ Add Word</Button>
                <Button onClick={() => setShowBulk((s) => !s)}>📥 Bulk Add</Button>
              </div>
            ) : (
              <div>
                <WordForm onAdd={addWord} onCancel={() => setShowForm(false)} />
              </div>
            )}

            <Button variant="destructive" onClick={() => deleteGroup(selectedGroup)}>Xóa group</Button>
          </div>

          {/* Bulk form appears below Add Word (option A) */}
          {showBulk && (
            <BulkForm
              group={selectedGroup}
              onDone={() => {
                setShowBulk(false);
                loadWords();
              }}
            />
          )}

          {/* LIST WORDS */}
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            {filteredWords.map((word) => (
              <Card key={word.id} className="w-full flex items-center justify-between px-4 py-3 border rounded-lg bg-[#111]" style={{ minHeight: '64px' }}>
                <div className="flex flex-col flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="font-semibold text-lg whitespace-nowrap">{word.english}</p>
                    {word.type.length > 0 && <span className="text-sm text-blue-400 whitespace-nowrap">[{word.type.join(', ')}]</span>}
                  </div>
                  <p className="text-muted-foreground text-sm truncate">{word.definition}</p>
                </div>

                <Button variant="destructive" className="shrink-0 w-[80px]" onClick={() => deleteWord(word.id)}>Delete</Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* LEARN MODE */}
      {learnMode && (
        <div className="text-center mt-12">
          <Button variant="secondary" onClick={() => { setLearnMode(false); setCurrentWord(null); setLearnedIds([]); db.learned.clear(); }}>
            ← Thoát học
          </Button>

          <p className="text-muted-foreground mt-4">Đã học {learnedIds.length} / {filteredWords.length}</p>

          <div className="mt-8">
            {isResetting ? (
              <p className="text-muted-foreground">Đang bắt đầu lại…</p>
            ) : currentWord ? (
              <>
                <Flashcard word={currentWord} />
                <Button className="mt-6" onClick={pickRandomWord}>Từ tiếp theo</Button>
              </>
            ) : (
              <Button size="lg" onClick={resetLearn}>Học lại từ đầu</Button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
