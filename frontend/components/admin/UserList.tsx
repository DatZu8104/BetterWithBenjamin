'use client';

import { User as UserIcon, Trash2 } from 'lucide-react';

interface UserData {
  _id?: string;
  id?: string;
  username: string;
  role: string;
  wordCount?: number;       // API cũ
  customWordCount?: number; // API mới
  systemWordCount?: number; // API mới
  learnedCount?: number;    // API mới
  totalWords?: number;      // API mới
}

interface UserListProps {
  users: UserData[];
  selectedUser: UserData | null;
  onSelectUser: (user: UserData) => void;
  onDeleteUser: (id: string, name: string) => void;
}

export default function UserList({ users, selectedUser, onSelectUser, onDeleteUser }: UserListProps) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 h-full flex flex-col max-h-[80vh]">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-zinc-300 shrink-0">
        <UserIcon className="w-5 h-5"/> Danh sách User ({users.length})
      </h2>
      
      <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar flex-1">
        {users.map(user => {
          const userId = user._id || user.id;
          const isSelected = selectedUser && (selectedUser._id || selectedUser.id) === userId;
          
          // Tính toán số liệu hiển thị (hỗ trợ cả lúc API cũ chưa cập nhật xong)
          const learned = user.learnedCount || 0;
          const total = user.totalWords !== undefined ? user.totalWords : (user.wordCount || 0);

          return (
            <div 
              key={userId} 
              onClick={() => onSelectUser(user)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-blue-900/20 border-blue-500 shadow-lg shadow-blue-900/10' : 'bg-black border-zinc-800 hover:border-zinc-600'}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-white text-base truncate max-w-[120px]">{user.username}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border mt-1.5 inline-block font-bold uppercase tracking-wider ${user.role === 'admin' ? 'bg-red-950/50 text-red-400 border-red-900' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                    {user.role}
                  </span>
                </div>
                
                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-xs font-bold bg-white/5 px-2 py-1 rounded text-zinc-300 border border-white/5">
                    {total} từ vựng
                  </span>
                  
                  {/* HUY HIỆU TIẾN ĐỘ HỌC */}
                  {(user.learnedCount !== undefined) && (
                    <span className="text-[10px] font-bold bg-green-900/20 text-green-400 px-2 py-0.5 rounded border border-green-900/30">
                      Đã học: {learned}
                    </span>
                  )}
                  
                  {user.role !== 'admin' && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeleteUser(userId!, user.username); }}
                      className="p-1 mt-1 hover:bg-red-500/10 text-zinc-600 hover:text-red-500 rounded transition-colors"
                      title="Xóa người dùng"
                    >
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}