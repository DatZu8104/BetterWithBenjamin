'use client';

import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { db } from '../lib/db';

type ParsedWord = {
  english: string;
  definition: string;
  type: string[];
  group: string;
  id: string;
};

export function BulkForm({ group, onDone }: { group: string; onDone: () => void; }) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<ParsedWord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const parseLine = (line: string): ParsedWord | null => {
    const sep = /—|–|-|\||\t/; // Các ký tự phân cách
    const parts = line.split(sep).map((p) => p.trim().toLowerCase()).filter(Boolean); // LOWERCASE HERE

    if (parts.length === 0) return null;

    const english = parts[0] ?? '';
    const definition = parts[1] ?? '';
    let typeField = parts[2] ?? '';

    const types = typeField.split(',').map((t) => t.trim()).filter(Boolean);

    return {
      english,
      definition,
      type: types,
      group, // group name giữ nguyên hoặc lowercase tùy logic chung
      id: crypto.randomUUID(),
    };
  };

  const handlePreview = () => {
    setError(null);
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) { setPreview([]); return; }

    const parsed: ParsedWord[] = [];
    const badLines: string[] = [];

    for (const line of lines) {
      const p = parseLine(line);
      if (!p || !p.english) badLines.push(line);
      else parsed.push(p);
    }

    if (badLines.length > 0) setError(`Lỗi dòng: "${badLines[0].slice(0, 40)}..."`);
    else setError(null);

    setPreview(parsed);
  };

  const handleImport = async () => {
    if (!preview || preview.length === 0) return;
    setIsImporting(true);
    try {
      await db.words.bulkPut(preview);
      setText(''); setPreview(null); setError(null); onDone();
    } catch (err) {
      console.error(err); setError('Lỗi khi lưu.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="mt-4 border rounded p-4 bg-muted/5">
      <p className="mb-2 text-sm text-muted-foreground">Dán danh sách (word - def - type). Tự động chuyển thường.</p>
      <textarea
        value={text} onChange={(e) => setText(e.target.value)} rows={6}
        className="w-full p-3 rounded border bg-background text-foreground text-sm"
        placeholder={`run - chạy - verb\napple - quả táo - noun`}
      />
      <div className="flex gap-2 mt-3">
        <Button onClick={handlePreview} disabled={!text}>Preview</Button>
        <Button variant="secondary" onClick={() => { setText(''); setPreview(null); }}>Clear</Button>
      </div>
      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      {preview && (
        <div className="mt-4">
          <p className="text-sm mb-2">Tìm thấy {preview.length} từ:</p>
          <div className="flex gap-2">
            <Button onClick={handleImport} disabled={isImporting}>{isImporting ? '...' : 'Save'}</Button>
            <Button variant="secondary" onClick={() => setPreview(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}