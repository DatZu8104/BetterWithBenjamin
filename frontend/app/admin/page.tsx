'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { Trash2, ArrowLeft, User, Book, Upload, Download, Loader2, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State dữ liệu
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userWords, setUserWords] = useState<any[]>([]);
  
  // State trạng thái
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- 1. LOAD USER ---
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (error) {
      alert("Bạn không có quyền truy cập trang này!");
      window.location.href = '/'; 
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewWords = async (user: any) => {
    setSelectedUser(user);
    const words = await api.getUserWords(user._id || user.id);
    setUserWords(words);
  };

  // --- 2. XÓA USER / XÓA TỪ ---
  const handleDeleteUser = async (id: string, name: string) => {
    if (confirm(`CẢNH BÁO: Bạn chắc chắn muốn xóa user "${name}"? \nToàn bộ từ vựng của họ sẽ bị mất vĩnh viễn!`)) {
      await api.deleteUser(id);
      loadUsers();
      if (selectedUser && (selectedUser._id || selectedUser.id) === id) setSelectedUser(null);
    }
  };

  const handleDeleteWord = async (wordId: string) => {
    if (confirm("Xóa từ này?")) {
      await api.adminDeleteWord(wordId);
      setUserWords(prev => prev.filter(w => (w._id || w.id) !== wordId));
      // Cập nhật số lượng từ hiển thị bên trái
      setUsers(prev => prev.map(u => (u._id || u.id) === (selectedUser._id || selectedUser.id) ? { ...u, wordCount: u.wordCount - 1 } : u));
    }
  };

  // --- 3. EXPORT (XUẤT FILE) ---
  const handleExport = () => {
    if (!selectedUser || userWords.length === 0) return alert("User này chưa có từ vựng để xuất.");
    
    const exportData = {
        user: selectedUser.username,
        exportedAt: new Date().toISOString(),
        words: userWords
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_${selectedUser.username}_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- 4. IMPORT (NHẬP FILE) ---
  const handleImportClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedUser) return;

    if (!confirm(`⚠️ CẢNH BÁO:\nBạn sắp nhập dữ liệu vào tài khoản "${selectedUser.username}".\nHành động này sẽ thêm từ mới vào kho của họ.\nBạn có chắc chắn không?`)) {
        event.target.value = ''; 
        return;
    }

    setIsProcessing(true);
    try {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                const jsonData = JSON.parse(content);
                
                // Gọi API Admin Import
                await api.adminImportUser(selectedUser._id || selectedUser.id, jsonData);
                
                alert("✅ Nhập dữ liệu thành công!");
                handleViewWords(selectedUser); // Load lại danh sách từ mới
                loadUsers(); // Cập nhật số lượng từ bên trái
            } catch (err: any) {
                alert("Lỗi: " + err.message);
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsText(file);
    } catch (error) {
        setIsProcessing(false);
    } finally {
        event.target.value = '';
    }
  };

  if (isLoading) return <div className="h-screen bg-black text-white flex items-center justify-center">Checking Admin...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
      
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-4">
            {/* ✅ SỬA LỖI Ở ĐÂY: Dùng window.location.href thay vì router.push */}
            <Button variant="ghost" onClick={() => window.location.href = '/'} className="text-zinc-400 hover:text-white">
              <ArrowLeft className="w-5 h-5 mr-2"/> Về App
            </Button>
            <h1 className="text-2xl font-bold text-red-500">Admin Dashboard</h1>
          </div>
          <div className="bg-zinc-900 px-4 py-2 rounded-full text-sm font-mono border border-zinc-800">
            Total Users: {users.length}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* CỘT TRÁI: DANH SÁCH USER */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><User className="w-5 h-5"/> Users</h2>
            <div className="space-y-2 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
              {users.map(user => (
                <div 
                  key={user._id || user.id} 
                  onClick={() => handleViewWords(user)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedUser && (selectedUser._id || selectedUser.id) === (user._id || user.id) ? 'bg-blue-900/30 border-blue-500' : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-white">{user.username}</p>
                      <p className="text-xs text-zinc-500 mt-1">ID: {user._id || user.id}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border mt-2 inline-block ${user.role === 'admin' ? 'bg-red-950 text-red-400 border-red-900' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                        {user.role}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <span className="text-xs font-bold bg-white/10 px-2 py-1 rounded text-white">{user.wordCount} từ</span>
                       {user.role !== 'admin' && (
                         <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteUser(user._id || user.id, user.username); }}
                            className="p-2 hover:bg-red-500/20 text-zinc-500 hover:text-red-500 rounded transition-colors"
                         >
                           <Trash2 className="w-4 h-4"/>
                         </button>
                       )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CỘT PHẢI: CHI TIẾT TỪ VỰNG & CÔNG CỤ */}
          <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 min-h-[500px] flex flex-col">
            {selectedUser ? (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-zinc-800 gap-4">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Book className="w-5 h-5 text-blue-500"/> 
                      Từ vựng của: <span className="text-blue-400">{selectedUser.username}</span>
                    </h2>
                    <span className="text-sm text-zinc-500">{userWords.length} kết quả</span>
                  </div>
                  
                  {/* --- NÚT IMPORT / EXPORT (ĐÃ THÊM LẠI) --- */}
                  <div className="flex gap-2 w-full sm:w-auto">
                      <Button 
                        onClick={handleImportClick} 
                        disabled={isProcessing}
                        className="flex-1 sm:flex-none bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white"
                      >
                         {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Upload className="w-4 h-4 mr-2"/>}
                         Import
                      </Button>
                      <Button 
                        onClick={handleExport}
                        disabled={isProcessing}
                        className="flex-1 sm:flex-none bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white"
                      >
                         <Download className="w-4 h-4 mr-2"/> Export
                      </Button>
                  </div>
                </div>

                {userWords.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-zinc-500 italic">
                    <FileJson className="w-12 h-12 mb-2 opacity-20"/>
                    <p>Người dùng này chưa có từ vựng nào.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                    {userWords.map(word => (
                      <div key={word._id || word.id} className="flex justify-between items-center p-3 bg-black border border-zinc-800 rounded-lg group hover:border-zinc-600 transition-colors">
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{word.english}</p>
                          <p className="text-sm text-zinc-400 truncate">{word.definition}</p>
                          <div className="flex gap-2 mt-1">
                             <span className="text-[10px] bg-zinc-800 px-1.5 rounded text-zinc-500 border border-zinc-700">{word.group}</span>
                             {word.learned && <span className="text-[10px] bg-green-900/30 text-green-500 px-1.5 rounded border border-green-900/30">Đã thuộc</span>}
                          </div>
                        </div>
                        <button onClick={() => handleDeleteWord(word._id || word.id)} className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-900/30 text-red-500 rounded transition-all">
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                <User className="w-16 h-16 mb-4 opacity-20"/>
                <p>Chọn một người dùng bên trái để quản lý từ vựng của họ.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}