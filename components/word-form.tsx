'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const TYPE_OPTIONS = [
  { value: "noun", label: "Noun (Danh từ)" },
  { value: "verb", label: "Verb (Động từ)" },
  { value: "adjective", label: "Adjective (Tính từ)" },
  { value: "adverb", label: "Adverb (Trạng từ)" },
  { value: "phrase", label: "Phrase (Cụm từ)" },
];

export function WordForm({ onAdd, onCancel }: any) {
  const [english, setEnglish] = useState('');
  const [definition, setDefinition] = useState('');
  const [types, setTypes] = useState<string[]>([]);

  const toggleType = (value: string) => {
    setTypes((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();

    if (!english || !definition || types.length === 0) {
      alert("Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    // gửi cho page.tsx
    onAdd(english, definition, types);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      <Input
        placeholder="English word"
        value={english}
        onChange={(e) => setEnglish(e.target.value)}
      />

      <Input
        placeholder="Definition"
        value={definition}
        onChange={(e) => setDefinition(e.target.value)}
      />

      {/* LOẠI TỪ */}
      <div className="space-y-2">
        <p className="text-sm font-semibold">Word types (chọn nhiều):</p>

        {TYPE_OPTIONS.map((type) => (
          <label key={type.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={types.includes(type.value)}
              onChange={() => toggleType(type.value)}
            />
            <span>{type.label}</span>
          </label>
        ))}
      </div>

      <div className="flex gap-3 mt-3">
        <Button type="submit" className="flex-1">Add</Button>
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
