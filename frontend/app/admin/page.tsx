'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { Trash2, Search, ArrowLeft, User, Book } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userWords, setUserWords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load danh sách user khi vào trang
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (error) {
      alert("Bạn không có quyền truy cập trang này!");
      router.push('/'); // Đá về trang chủ nếu không phải admin
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (confirm(`CẢNH BÁO: Bạn chắc chắn muốn xóa user "${name}"? \nToàn bộ từ vựng của họ sẽ bị mất vĩnh viễn!`)) {
      await api.deleteUser(id);
      loadUsers();
      if (selectedUser && selectedUser._id === id) setSelectedUser(null);
    }
  };

  const handleViewWords = async (user: any) => {
    setSelectedUser(user);
    const words = await api.getUserWords(user._id);
    setUserWords(words);
  };

  const handleDeleteWord = async (wordId: string) => {
    if (confirm("Xóa từ này?")) {
      await api.adminDeleteWord(wordId);
      // Cập nhật lại list local
      setUserWords(prev => prev.filter(w => w._id !== wordId));
      // Cập nhật số lượng từ ở list user
      setUsers(prev => prev.map(u => u._id === selectedUser._id ? { ...u, wordCount: u.wordCount - 1 } : u));
    }
  };

  if (isLoading) return <div className="h-screen bg-black text-white flex items-center justify-center">Checking Admin...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/')} className="text-zinc-400 hover:text-white">
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
                  key={user._id} 
                  onClick={() => handleViewWords(user)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedUser?._id === user._id ? 'bg-blue-900/30 border-blue-500' : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-white">{user.username}</p>
                      <p className="text-xs text-zinc-500 mt-1">ID: {user._id}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border mt-2 inline-block ${user.role === 'admin' ? 'bg-red-950 text-red-400 border-red-900' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                        {user.role}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <span className="text-xs font-bold bg-white/10 px-2 py-1 rounded text-white">{user.wordCount} từ</span>
                       {user.role !== 'admin' && (
                         <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteUser(user._id, user.username); }}
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

          {/* CỘT PHẢI: CHI TIẾT TỪ VỰNG CỦA USER ĐƯỢC CHỌN */}
          <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 min-h-[500px]">
            {selectedUser ? (
              <>
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-800">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Book className="w-5 h-5 text-blue-500"/> 
                    Từ vựng của: <span className="text-blue-400">{selectedUser.username}</span>
                  </h2>
                  <span className="text-sm text-zinc-500">{userWords.length} kết quả</span>
                </div>

                {userWords.length === 0 ? (
                  <div className="text-center text-zinc-500 italic mt-20">Người dùng này chưa có từ vựng nào.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                    {userWords.map(word => (
                      <div key={word._id} className="flex justify-between items-center p-3 bg-black border border-zinc-800 rounded-lg group hover:border-zinc-600 transition-colors">
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{word.english}</p>
                          <p className="text-sm text-zinc-400 truncate">{word.definition}</p>
                          <div className="flex gap-2 mt-1">
                             <span className="text-[10px] bg-zinc-800 px-1.5 rounded text-zinc-500">{word.group}</span>
                             {word.learned && <span className="text-[10px] bg-green-900/30 text-green-500 px-1.5 rounded">Đã thuộc</span>}
                          </div>
                        </div>
                        <button onClick={() => handleDeleteWord(word._id)} className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-900/30 text-red-500 rounded transition-all">
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