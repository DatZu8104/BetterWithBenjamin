'use client';

import { useState, useRef } from 'react';
import { Button } from '../ui/button'; // Kiểm tra lại đường dẫn ../../ui/button
import { Upload, Download, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

export function Header() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);

        // 🟢 PHẦN SỬA ĐỔI QUAN TRỌNG: Xác định danh sách từ nằm ở đâu
        let wordsList: any[] = [];

        if (Array.isArray(data)) {
            // Trường hợp 1: File chỉ là danh sách []
            wordsList = data;
        } else if (data.words && Array.isArray(data.words)) {
            // Trường hợp 2: File backup của bạn (có chứa mục "words")
            wordsList = data.words;
        } else {
            alert("❌ File không đúng định dạng! Không tìm thấy danh sách từ vựng.");
            setIsImporting(false);
            return;
        }

        // Bắt đầu thêm từ
        let count = 0;
        // Đảo ngược danh sách để từ mới nhất thêm vào trước (tuỳ chọn)
        const listToImport = [...wordsList].reverse(); 

        for (const word of listToImport) {
          // Chỉ thêm nếu có tiếng Anh và định nghĩa
          if (word.english && word.definition) {
             await api.addWord({
               english: word.english,
               definition: word.definition,
               // Xử lý type: Nếu là mảng thì lấy, không thì để rỗng
               type: Array.isArray(word.type) ? word.type : [], 
               group: word.group || 'Đã nhập', // Giữ nguyên tên nhóm cũ
               example: word.example || ''
             });
             count++;
          }
        }

        alert(`✅ Thành công! Đã khôi phục ${count} từ vựng.`);
        window.location.reload();

      } catch (error) {
        console.error(error);
        alert("❌ Lỗi khi đọc file. Hãy kiểm tra lại file JSON.");
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="flex items-center justify-between p-4 border-b bg-background">
      <h1 className="text-xl font-bold">Flashcards</h1>
      
      <div className="flex gap-2">
        <div className="relative">
            <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json"
                className="hidden"
            />
            
            <Button 
                variant="default" 
                size="sm"
                disabled={isImporting}
                onClick={() => fileInputRef.current?.click()}
            >
                {isImporting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                    <Upload className="w-4 h-4 mr-2" />
                )}
                {isImporting ? 'Đang xử lý...' : 'Import Backup'}
            </Button>
        </div>
      </div>
    </div>
  );
}