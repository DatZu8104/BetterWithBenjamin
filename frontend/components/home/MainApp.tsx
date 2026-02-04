'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api'; 
import { Header } from '@/components/home/header';
import { GroupListView } from '@/components/home/group-list';
import { WordListView } from '@/components/home/word-list';
import { LearnModeView } from '@/components/home/learn-mode';

interface MainAppProps {
  currentUser: string | null;
  role: string; 
  onLogout: () => void;
}

export function MainApp({ currentUser, onLogout, role }: MainAppProps) {
  const [words, setWords] = useState<any[]>([]);
  const [dbFolders, setDbFolders] = useState<string[]>([]); 
  const [folderColors, setFolderColors] = useState<Record<string, string>>({});
  const [groupSettings, setGroupSettings] = useState<Record<string, string>>({});

  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [isLearnMode, setIsLearnMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [sortOption, setSortOption] = useState<'date' | 'name' | 'size'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [currentWord, setCurrentWord] = useState<any | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // STATE: Chế độ xem ('personal' hoặc 'global')
  const [viewMode, setViewMode] = useState<'personal' | 'global'>('personal');

  // ✅ 1. BIẾN QUYỀN HẠN (QUAN TRỌNG NHẤT)
  // Admin được quyền sửa ở mọi nơi. User chỉ được sửa ở Personal.
  const canEdit = viewMode === 'personal' || role === 'admin';

  // --- LOAD DATA ---
  const loadData = async () => {
    try {
      const data = await api.syncData();
      if (data && Array.isArray(data.words)) {
          const normalizedWords = data.words.map((w: any) => ({
            ...w,
            id: w.id || w._id,
            learned: w.learned || false,
            isGlobal: w.isGlobal || false
          }));
          setWords(normalizedWords);
          
          if(data.folders) {
              setDbFolders(data.folders.map((f: any) => f.name));
              const colors: Record<string, string> = {};
              data.folders.forEach((f: any) => { if(f.color) colors[f.name] = f.color; });
              setFolderColors(colors);
          }

          if(data.groupSettings) {
              const settings: Record<string, string> = {};
              data.groupSettings.forEach((s: any) => { settings[s.groupName] = s.folder; });
              setGroupSettings(settings);
          }
      }
    } catch (error) {
      console.error("Data load error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // LOGIC LỌC TỪ VỰNG THEO CHẾ ĐỘ
  const wordsByMode = useMemo(() => {
    if (viewMode === 'global') {
        return words.filter(w => w.isGlobal === true);
    }
    // Personal: Hiện từ của tôi (không phải global)
    return words.filter(w => !w.isGlobal);
  }, [words, viewMode]);

  // ✅ 2. TÍNH TOÁN GROUPS (Sửa lại để không làm mất group của user)
  const calculatedGroups = useMemo(() => {
    let groupNames: string[] = [];

    if (viewMode === 'global') {
        // Global Mode: Lấy tên nhóm từ danh sách từ vựng Global
        groupNames = Array.from(new Set(wordsByMode.map(w => w.group)));
    } else {
        // Personal Mode: Lấy từ từ vựng cá nhân VÀ cài đặt nhóm
        groupNames = Array.from(new Set([...wordsByMode.map(w => w.group), ...Object.keys(groupSettings)]));
    }
    
    const groupsData = groupNames.map(name => {
        const groupWordsList = wordsByMode.filter(w => w.group === name);
        let dateVal = 0;
        const parts = name.split(/[-/]/);
        if (parts.length === 3) {
            const y = parseInt(parts[0]);
            const m = parseInt(parts[1]);
            const d = parseInt(parts[2]);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) dateVal = new Date(y, m - 1, d).getTime();
        }
        return { name, count: groupWordsList.length, folder: groupSettings[name] || "", dateVal };
    }).filter(g => {
        // LOGIC HIỂN THỊ NHÓM:
        
        // 1. Nếu nhóm có từ -> Luôn hiện (cho cả User và Admin, cả Global và Personal)
        if (g.count > 0) return true;

        // 2. Nếu nhóm rỗng (0 từ):
        // - Nếu có quyền sửa (Admin hoặc User ở Personal) -> Hiện để họ có thể thêm từ vào.
        // - Nếu không có quyền sửa (User ở Global) -> Ẩn đi cho gọn.
        return canEdit; 
    });

    return groupsData.sort((a, b) => {
        let res = 0;
        if (sortOption === 'name') res = a.name.localeCompare(b.name);
        else if (sortOption === 'size') res = a.count - b.count;
        else res = a.dateVal - b.dateVal; 
        return sortDirection === 'asc' ? res : -res;
    });
  }, [wordsByMode, groupSettings, sortOption, sortDirection, viewMode, canEdit]); // Thêm canEdit vào dependency

  // SEARCH
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const lower = searchTerm.toLowerCase();
    return wordsByMode.filter(w => w.english.toLowerCase().includes(lower) || w.definition.toLowerCase().includes(lower));
  }, [wordsByMode, searchTerm]);

  // WORD LIST VIEW
  const currentViewWords = useMemo(() => {
      if (selectedGroup) return wordsByMode.filter(w => w.group === selectedGroup);
      if (currentFolder) return wordsByMode.filter(w => groupSettings[w.group] === currentFolder);
      return wordsByMode;
  }, [wordsByMode, selectedGroup, currentFolder, groupSettings]);

  // --- ACTIONS ---
  const pickRandomWord = (list: any[] = currentViewWords) => {
      const unlearned = list.filter(w => !w.learned);
      if (unlearned.length === 0) { setCurrentWord(null); return; }
      const rand = unlearned[Math.floor(Math.random() * unlearned.length)];
      setCurrentWord(rand);
  };

  const handleNextWord = () => {
      if (!currentWord) return;
      const wordIdToSave = currentWord.id;
      const remaining = currentViewWords.filter(w => !w.learned && w.id !== wordIdToSave);
      
      if (remaining.length === 0) setCurrentWord(null); 
      else setCurrentWord(remaining[Math.floor(Math.random() * remaining.length)]);

      setWords(prev => prev.map(w => w.id === wordIdToSave ? { ...w, learned: true } : w));
      api.updateWord(wordIdToSave, { learned: true }).catch(err => console.error("Save error:", err));
  };

  const handleStartLearn = () => {
      setIsLearnMode(true);
      const unlearned = currentViewWords.filter(w => !w.learned);
      if (unlearned.length === 0 && currentViewWords.length > 0) {
          handleResetProgress();
      } else {
          setTimeout(() => pickRandomWord(), 50);
      }
  };

  const handleResetProgress = async () => {
    const wordsToReset = currentViewWords; 
    if (wordsToReset.length === 0) return;

    try {
      setIsResetting(true);
      const idsToReset = wordsToReset.map((w: any) => w.id || w._id);
      await api.resetProgressBatch(idsToReset);
      
      setWords(prevWords => prevWords.map(w => 
          idsToReset.includes(w.id || w._id) ? { ...w, learned: false } : w
      ));

      if (wordsToReset.length > 0) {
          const rand = wordsToReset[Math.floor(Math.random() * wordsToReset.length)];
          setCurrentWord(rand);
      }
    } catch (error) {
      alert("Error resetting progress.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleReset = () => { 
      setSelectedGroup(null); 
      setCurrentFolder(null); 
      setSearchTerm(''); 
      setIsLearnMode(false); 
  };

  const handleModeChange = (mode: 'personal' | 'global') => {
      setViewMode(mode);
      setSelectedGroup(null);
      setCurrentFolder(null);
      setSearchTerm('');
      setIsLearnMode(false);
  };

  // ✅ 3. HÀM XỬ LÝ (Dùng biến canEdit để chặn)
  const handleAddWord = !canEdit ? async () => alert("Bạn không có quyền thêm vào danh sách này") : async (e: string, d: string, t: string[]) => { 
      if(selectedGroup) { 
          // Nếu Admin đang ở Global -> isGlobal = true.
          // Nếu ở Personal -> isGlobal = false.
          await api.addWord({
              english: e, definition: d, type: t, group: selectedGroup,
              // @ts-ignore
              isGlobal: viewMode === 'global' 
          }); 
          loadData(); 
      }
  };
  const handleDeleteWord = !canEdit ? async () => alert("Bạn không có quyền xóa từ hệ thống") : async (id: string) => { await api.deleteWord(id); loadData(); };
  
  const handleCreateFolder = async (n: string, c: string) => { if(canEdit) { await api.addFolder({ name: n, color: c }); loadData(); } };
  const handleUpdateFolder = async (o: string, n: string, c: string) => { if(canEdit) { if(o!==n) await api.deleteFolder(o); await api.addFolder({name:n, color:c}); loadData(); } };
  const handleDeleteFolder = async (n: string) => { if(canEdit) { await api.deleteFolder(n); loadData(); } };
  
  const handleMoveGroup = async (g: string, f: string) => { if(canEdit) { await api.updateGroup(g, f); loadData(); } };
  
  const handleAddGroup = !canEdit ? () => alert("Bạn không có quyền thêm nhóm vào hệ thống") : () => { 
      const n = prompt("Nhập tên nhóm mới:"); 
      if(n) api.updateGroup(n, currentFolder||"").then(loadData); 
  };
  
  const handleDeleteGroup = !canEdit ? async () => alert("Bạn không có quyền xóa nhóm hệ thống") : async (n: string) => { await api.deleteGroup(n); loadData(); };


  // --- RENDER ---
  const totalSystemWords = wordsByMode.length;
  const totalLearnedWords = wordsByMode.filter(w => w.learned).length;

  if (isLoading) return <div className="h-screen bg-black text-white flex items-center justify-center">Loading...</div>;

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      {!isLearnMode && (
        <Header 
          onSearchChange={setSearchTerm} 
          searchTerm={searchTerm} 
          onReset={handleReset} 
          username={currentUser || "User"}
          onLogout={onLogout}
          role={role}
          totalWords={totalSystemWords}
          learnedCount={totalLearnedWords}
          currentMode={viewMode}
          onModeChange={handleModeChange}
        />
      )}

      <div className="flex-1 overflow-hidden relative">
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {isLearnMode ? (
                <div className="fixed inset-0 z-50 bg-white">
                    <LearnModeView 
                        currentWord={currentWord}
                        allWords={currentViewWords}
                        progress={currentViewWords.filter(w => w.learned).length}
                        total={currentViewWords.length}
                        isResetting={isResetting}
                        onNext={handleNextWord}
                        onReset={handleResetProgress} 
                        onExit={() => setIsLearnMode(false)}
                        themeColor={viewMode === 'global' ? '#9333ea' : (currentFolder && folderColors[currentFolder] ? undefined : '#2563eb')}
                    />
                </div>
            ) : selectedGroup ? (
                <WordListView 
                    groupName={selectedGroup}
                    words={currentViewWords}
                    onBack={() => setSelectedGroup(null)}
                    onUpdate={loadData}
                    // ✅ Truyền quyền hạn xuống WordList
                    onAddWord={handleAddWord}
                    onDeleteWord={handleDeleteWord}
                    onLearn={handleStartLearn}
                    allowEdit={canEdit} // Bạn có thể thêm prop này vào WordListView để ẩn nút thêm từ nếu muốn
                />
            ) : (
                <GroupListView 
                    groups={calculatedGroups}
                    searchResults={searchResults}
                    searchTerm={searchTerm}
                    folders={dbFolders}
                    folderColors={folderColors}
                    currentFolder={currentFolder}
                    totalWords={currentViewWords.length}
                    learnedCount={currentViewWords.filter(w => w.learned).length}
                    onSearchChange={setSearchTerm}
                    onClearSearch={() => setSearchTerm('')}
                    onSelectGroup={setSelectedGroup}
                    onSelectFolder={setCurrentFolder}
                    
                    // ✅ TRUYỀN QUYỀN HẠN: Admin hoặc Personal đều là true
                    allowAdd={canEdit} 
                    onAddGroup={handleAddGroup}

                    onDeleteGroup={handleDeleteGroup}
                    onDeleteWordResult={handleDeleteWord}
                    onMoveGroup={handleMoveGroup}
                    onCreateFolder={handleCreateFolder}
                    onUpdateFolder={handleUpdateFolder}
                    onDeleteFolder={handleDeleteFolder}
                    onSort={(opt) => setSortOption(opt)}
                    sortOption={sortOption}
                    sortDirection={sortDirection}
                    onStartLearn={handleStartLearn}
                    onResetLearn={handleResetProgress}
                    onUpdate={loadData}
                />
            )}
        </div>
      </div>
    </div>
  );
}