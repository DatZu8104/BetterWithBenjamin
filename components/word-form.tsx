'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const TYPE_OPTIONS = [
  { value: "noun", label: "Noun (Danh từ)" },
  { value: "verb", label: "Verb (Động từ)" },
  { value: "adjective", label: "Adjective (Tính từ)" },
  { value: "adverb", label: "Adverb (Trạng từ)" },
  { value: "phrase", label: "Phrase (Cụm từ)" },
];

export function WordForm({ onSave, onCancel, initialData }: any) {
  const [english, setEnglish] = useState('');
  const [definition, setDefinition] = useState('');
  const [types, setTypes] = useState<string[]>([]);

  // Nếu có dữ liệu cũ (chế độ Edit), điền vào form
  useEffect(() => {
    if (initialData) {
      setEnglish(initialData.english);
      setDefinition(initialData.definition);
      setTypes(initialData.type || []);
    }
  }, [initialData]);

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

    onSave(
      english.trim().toLowerCase(), 
      definition.trim().toLowerCase(), 
      types
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">
        {initialData ? 'Chỉnh sửa từ' : 'Thêm từ mới'}
      </h3>

      <div className="space-y-1">
        <label className="text-sm font-medium">Tiếng Anh</label>
        <Input
          placeholder="Ví dụ: hello"
          value={english}
          onChange={(e) => setEnglish(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Định nghĩa</label>
        <Input
          placeholder="Ví dụ: xin chào"
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Loại từ:</p>
        <div className="flex flex-wrap gap-2">
          {TYPE_OPTIONS.map((type) => (
            <label key={type.value} className={`cursor-pointer px-3 py-1 rounded border text-sm transition-colors ${types.includes(type.value) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-accent'}`}>
              <input
                type="checkbox"
                checked={types.includes(type.value)}
                onChange={() => toggleType(type.value)}
                className="hidden"
              />
              <span>{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-3 mt-4 pt-2">
        <Button type="submit" className="flex-1">{initialData ? 'Lưu thay đổi' : 'Thêm từ'}</Button>
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>Hủy</Button>
      </div>
    </form>
  );
}