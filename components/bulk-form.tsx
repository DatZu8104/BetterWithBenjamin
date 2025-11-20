'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/db';

type ParsedWord = {
  english: string;
  definition: string;
  type: string[]; // array
  group: string;
  id: string;
};

export function BulkForm({
  group,
  onDone,
}: {
  group: string;
  onDone: () => void;
}) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<ParsedWord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const parseLine = (line: string): ParsedWord | null => {
    // normalize separators: em-dash, en-dash, hyphen, pipe, tab
    const sep = /—|–|-|\||\t/;
    const parts = line.split(sep).map((p) => p.trim()).filter(Boolean);

    if (parts.length === 0) return null;

    // parts[0] = english
    // parts[1] = definition (optional)
    // parts[2] = type (optional)
    const english = parts[0] ?? '';
    const definition = parts[1] ?? '';
    let typeField = parts[2] ?? '';

    // if someone used `word - def - verb, noun` OR `word - def` OR `word`
    // ensure type array
    const types = typeField
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    return {
      english,
      definition,
      type: types,
      group,
      id: crypto.randomUUID(),
    };
  };

  const handlePreview = () => {
    setError(null);
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      setPreview([]);
      return;
    }

    const parsed: ParsedWord[] = [];
    const badLines: string[] = [];

    for (const line of lines) {
      const p = parseLine(line);
      if (!p || !p.english) {
        badLines.push(line);
      } else {
        parsed.push(p);
      }
    }

    if (badLines.length > 0) {
      setError(
        `Có ${badLines.length} dòng không hợp lệ (bị bỏ). Ví dụ: "${badLines[0].slice(
          0,
          40
        )}..."`
      );
    } else {
      setError(null);
    }

    setPreview(parsed);
  };

  const handleImport = async () => {
    if (!preview || preview.length === 0) {
      setError('Không có từ hợp lệ để thêm.');
      return;
    }

    setIsImporting(true);
    try {
      // Use bulkPut to update if id exists (safer than bulkAdd)
      await db.words.bulkPut(
        preview.map((w) => ({
          id: w.id,
          english: w.english,
          definition: w.definition,
          type: w.type,
          group: w.group,
        }))
      );

      // optionally, you might mark none as learned: do nothing to learned store
      setText('');
      setPreview(null);
      setError(null);
      onDone();
    } catch (err) {
      console.error('Bulk import failed', err);
      setError('Import thất bại. Kiểm tra console để biết chi tiết.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="mt-4 border rounded p-4 bg-muted/5">
      <p className="mb-2 text-sm text-muted-foreground">
        Dán danh sách từ (mỗi dòng 1 từ). Format: <code>word - definition - type</code>
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        className="w-full p-3 rounded border bg-background text-foreground"
        placeholder={`Ví dụ:\nrun - chạy - verb\napple - quả táo - noun\nbeautiful - đẹp - adjective`}
      />

      <div className="flex gap-2 mt-3">
        <Button onClick={handlePreview} disabled={!text}>
          Preview
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setText('');
            setPreview(null);
            setError(null);
          }}
        >
          Clear
        </Button>

        <div className="ml-auto text-sm text-muted-foreground">
          Group: <span className="font-semibold">{group}</span>
        </div>
      </div>

      {error && <p className="text-sm text-destructive mt-2">{error}</p>}

      {preview && (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            Preview: <span className="font-semibold">{preview.length}</span> từ
          </p>

          <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
            {preview.slice(0, 200).map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2 border rounded">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold truncate">{p.english}</div>
                    {p.type.length > 0 && (
                      <div className="text-sm text-blue-400">[{p.type.join(', ')}]</div>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">{p.definition}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-3">
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting ? 'Importing...' : `Add ${preview.length} words`}
            </Button>

            <Button variant="secondary" onClick={() => { setPreview(null); }}>
              Cancel preview
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
