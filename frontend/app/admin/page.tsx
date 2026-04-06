'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { ArrowLeft, Database, Loader2, UserCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import UserList from '../../components/admin/UserList';
import UserDetails from '../../components/admin/UserDetails';

export default function AdminPage() {
  const router = useRouter();
  const oxfordInputRef = useRef<HTMLInputElement>(null); 

  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [oxfordLoading, setOxfordLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (error) {
      alert("Unauthorized access!");
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (confirm(`WARNING: Are you sure you want to delete user "${name}"?\nAll of their data will be permanently removed.`)) {
      try {
        await api.deleteUser(id);
        await loadUsers();
        if (selectedUser && (selectedUser._id || selectedUser.id) === id) {
            setSelectedUser(null);
        }
      } catch (err) {
        alert("Failed to delete user.");
      }
    }
  };

  const handleOxfordImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm(`⚠️ CRITICAL WARNING:\n\nYou are about to overwrite the System Oxford Set.\n- Existing system words will be DELETED.\n- This may take 30-60 seconds.\n\nContinue?`)) {
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
                const result = await api.adminImportOxford(jsonData);
                alert(`SUCCESS!\n${result.message}`);
            } catch (err: any) {
                alert("IMPORT FAILED: " + err.message);
            } finally {
                setOxfordLoading(false);
            }
        };
        reader.readAsText(file);
    } catch (error) {
        setOxfordLoading(false);
        alert("Error reading file.");
    } finally {
        event.target.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        <p className="text-zinc-500 text-sm animate-pulse font-medium">Verifying Admin Permissions...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black text-white flex flex-col overflow-hidden">
      <input type="file" ref={oxfordInputRef} className="hidden" accept=".json" onChange={handleOxfordImport} />
      
      {/* HEADER SECTION - ĐÃ ĐƯỢC THU GỌN (COMPACT MODE) */}
      <div className="flex-none px-4 sm:px-6 py-2 sm:py-3 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-950/50">
        <div className="flex items-center gap-3">
          <Button 
              variant="ghost" 
              onClick={() => router.push('/')} 
              className="h-8 text-zinc-400 hover:text-white hover:bg-zinc-900 px-2 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5"/> <span className="text-sm">Back</span>
          </Button>
          <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 leading-tight">
                  ADMIN CENTER
              </h1>
              <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest leading-tight mt-0.5">System & User Management</p>
          </div>
        </div>
        
        <Button 
          onClick={() => oxfordInputRef.current?.click()}
          disabled={oxfordLoading}
          className="h-8 sm:h-9 px-3 sm:px-4 bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold rounded-lg shadow-md shadow-red-900/20 border border-red-500/50 transition-all active:scale-95 shrink-0"
        >
          {oxfordLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5"/> : <Database className="w-3.5 h-3.5 mr-1.5"/>}
          {oxfordLoading ? "Processing..." : "Import Oxford Set"}
        </Button>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="flex-1 px-4 sm:px-6 py-3 sm:py-4 overflow-hidden bg-black">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          <div className="lg:col-span-4 xl:col-span-3 h-full">
            <UserList 
                users={users} 
                selectedUser={selectedUser} 
                onSelectUser={setSelectedUser} 
                onDeleteUser={handleDeleteUser}
            />
          </div>
          <div className="lg:col-span-8 xl:col-span-9 h-full">
            {selectedUser ? (
              <UserDetails 
                userId={selectedUser._id || selectedUser.id} 
                username={selectedUser.username} 
              />
            ) : (
              <div className="h-full bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl flex flex-col items-center justify-center text-zinc-600">
                <UserCircle2 className="w-16 h-16 mb-4 opacity-5" />
                <p className="text-base font-medium">Select a user from the list to view details</p>
                <p className="text-xs opacity-50 mt-1">Management, progress tracking and vocabulary stats</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}