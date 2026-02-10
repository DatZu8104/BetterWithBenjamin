'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { Trash2, ArrowLeft, User, Book, Upload, Download, Loader2, FileJson, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const oxfordInputRef = useRef<HTMLInputElement>(null); //  Ref riêng cho nút Oxford

  // State dữ liệu
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userWords, setUserWords] = useState<any[]>([]);
  
  // State trạng thái
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [oxfordLoading, setOxfordLoading] = useState(false); //  State loading riêng cho Oxford

  // 1. LOAD USER 
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

  // 2. XÓA USER / XÓA TỪ
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
      setUsers(prev => prev.map(u => (u._id || u.id) === (selectedUser._id || selectedUser.id) ? { ...u, wordCount: u.wordCount - 1 } : u));
    }
  };

  // 3. EXPORT / IMPORT USER
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

  const handleImportUser = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedUser) return;
    if (!confirm(`Import dữ liệu vào user "${selectedUser.username}"?`)) {
        event.target.value = ''; return;
    }
    setIsProcessing(true);
    try {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                const jsonData = JSON.parse(content);
                await api.adminImportUser(selectedUser._id || selectedUser.id, jsonData);
                alert("✅ Nhập dữ liệu thành công!");
                handleViewWords(selectedUser);
                loadUsers();
            } catch (err: any) { alert("Lỗi: " + err.message); } 
            finally { setIsProcessing(false); }
        };
        reader.readAsText(file);
    } catch (error) { setIsProcessing(false); } finally { event.target.value = ''; }
  };

  // ---  IMPORT OXFORD SYSTEM ---
  const handleOxfordClick = () => {
      if (oxfordInputRef.current) oxfordInputRef.current.click();
  };

  const handleOxfordImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm(`⚠️ CẢNH BÁO QUAN TRỌNG:\n\nBạn đang nạp bộ từ vựng hệ thống Oxford mới.\n\n- Toàn bộ từ vựng hệ thống cũ sẽ bị XÓA.\n- Quá trình này có thể mất 30-60 giây vì file lớn.\n- Vui lòng KHÔNG đóng trình duyệt.\n\nBạn có chắc chắn muốn tiếp tục?`)) {
        event.target.value = '';
        return;
    }

    setOxfordLoading(true);
    try {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                const jsonData = JSON.parse(content);

                // Gọi API
                const result = await api.adminImportOxford(jsonData);
                
                alert(`✅ THÀNH CÔNG RỰC RỠ!\n\n${result.message}\n\nHãy quay lại App để kiểm tra Folder "Oxford 5000 Total".`);
            } catch (err: any) {
                console.error(err);
                alert("❌ THẤT BẠI: " + err.message);
            } finally {
                setOxfordLoading(false);
            }
        };
        reader.readAsText(file);
    } catch (error) {
        setOxfordLoading(false);
        alert("Lỗi đọc file.");
    } finally {
        event.target.value = '';
    }
  };

  if (isLoading) return <div className="h-screen bg-black text-white flex items-center justify-center">Checking Admin...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Input ẩn cho User Import */}
      <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportUser} />
      
      {/* Input ẩn cho Oxford Import */}
      <input type="file" ref={oxfordInputRef} className="hidden" accept=".json" onChange={handleOxfordImport} />
      
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-zinc-800 gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => window.location.href = '/'} className="text-zinc-400 hover:text-white">
              <ArrowLeft className="w-5 h-5 mr-2"/> Về App
            </Button>
            <div>
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">Admin Center</h1>
                <p className="text-zinc-500 text-sm">Quản lý hệ thống & Người dùng</p>
            </div>
          </div>
          
          {/* NÚT IMPORT OXFORD*/}
          <Button 
            onClick={handleOxfordClick}
            disabled={oxfordLoading}
            className="h-12 px-6 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-900/20 border border-red-500/50 transition-all active:scale-95"
          >
            {oxfordLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2"/> : <Database className="w-5 h-5 mr-2"/>}
            {oxfordLoading ? "Đang nạp dữ liệu..." : "Nạp bộ từ"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* CỘT TRÁI: DANH SÁCH USER (Chiếm 4 phần) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-zinc-300"><User className="w-5 h-5"/> Danh sách User ({users.length})</h2>
                <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                {users.map(user => (
                    <div 
                    key={user._id || user.id} 
                    onClick={() => handleViewWords(user)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedUser && (selectedUser._id || selectedUser.id) === (user._id || user.id) ? 'bg-blue-900/20 border-blue-500' : 'bg-black border-zinc-800 hover:border-zinc-600'}`}
                    >
                    <div className="flex justify-between items-start">
                        <div>
                        <p className="font-bold text-white text-base">{user.username}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border mt-1.5 inline-block font-bold uppercase tracking-wider ${user.role === 'admin' ? 'bg-red-950/50 text-red-400 border-red-900' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                            {user.role}
                        </span>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                        <span className="text-xs font-bold bg-white/5 px-2 py-1 rounded text-zinc-300 border border-white/5">{user.wordCount} cards</span>
                        {user.role !== 'admin' && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteUser(user._id || user.id, user.username); }}
                                className="p-2 hover:bg-red-500/10 text-zinc-600 hover:text-red-500 rounded transition-colors"
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
          </div>

          {/* CỘT PHẢI: CHI TIẾT USER (Chiếm 8 phần) */}
          <div className="lg:col-span-8">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 h-full flex flex-col min-h-[500px]">
                {selectedUser ? (
                <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-6 border-b border-zinc-800 gap-4">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                        <Book className="w-6 h-6 text-blue-500"/> 
                        Kho từ vựng: <span className="text-blue-400">{selectedUser.username}</span>
                        </h2>
                        <p className="text-sm text-zinc-500 mt-1">{userWords.length} từ vựng cá nhân</p>
                    </div>
                    
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button 
                            onClick={() => { if(fileInputRef.current) fileInputRef.current.click(); }} 
                            disabled={isProcessing}
                            variant="outline"
                            className="flex-1 sm:flex-none border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700"
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Upload className="w-4 h-4 mr-2"/>}
                            Import User
                        </Button>
                        <Button 
                            onClick={handleExport}
                            disabled={isProcessing}
                            variant="outline"
                            className="flex-1 sm:flex-none border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700"
                        >
                            <Download className="w-4 h-4 mr-2"/> Backup
                        </Button>
                    </div>
                    </div>

                    {userWords.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-zinc-500 italic">
                        <FileJson className="w-16 h-16 mb-4 opacity-10"/>
                        <p>Người dùng này chưa thêm từ vựng nào.</p>
                    </div>
                    ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                        {userWords.map(word => (
                        <div key={word._id || word.id} className="flex justify-between items-center p-4 bg-black border border-zinc-800 rounded-xl group hover:border-zinc-600 transition-colors">
                            <div className="min-w-0 pr-2">
                            <p className="font-bold text-white truncate text-lg">{word.english || word.word}</p>
                            <p className="text-sm text-zinc-400 truncate mt-0.5">{word.definition || (word.definitions?.[0]?.definition)}</p>
                            <div className="flex gap-2 mt-2">
                                <span className="text-[10px] font-bold bg-zinc-800 px-2 py-0.5 rounded text-zinc-500 border border-zinc-700 uppercase">{word.group}</span>
                                {word.learned && <span className="text-[10px] font-bold bg-green-900/20 text-green-500 px-2 py-0.5 rounded border border-green-900/30">Learned</span>}
                            </div>
                            </div>
                            <button onClick={() => handleDeleteWord(word._id || word.id)} className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-900/20 text-red-500 rounded-lg transition-all">
                            <Trash2 className="w-5 h-5"/>
                            </button>
                        </div>
                        ))}
                    </div>
                    )}
                </>
                ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                    <User className="w-20 h-20 mb-6 opacity-10"/>
                    <p className="text-lg">Chọn một người dùng bên trái để quản lý.</p>
                </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}