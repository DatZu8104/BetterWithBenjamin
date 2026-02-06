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
  const [rawGroupSettings, setRawGroupSettings] = useState<any[]>([]); 
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

  // View Mode: 'personal' hoặc 'global'
  const [viewMode, setViewMode] = useState<'personal' | 'global'>('personal');

  // ✅ LOGIC QUYỀN HẠN
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
              setRawGroupSettings(data.groupSettings);
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

  // Filter Words
  const wordsByMode = useMemo(() => {
    if (viewMode === 'global') return words.filter(w => w.isGlobal === true);
    return words.filter(w => !w.isGlobal);
  }, [words, viewMode]);

  // Calculate Groups
  const calculatedGroups = useMemo(() => {
    const relevantSettings = rawGroupSettings.filter(s => {
        const isGlobalGroup = !!s.isGlobal; 
        if (viewMode === 'global') return isGlobalGroup === true;
        return isGlobalGroup === false;
    });

    const relevantSettingNames = new Set(relevantSettings.map(s => s.groupName));
    const wordGroupNames = new Set(wordsByMode.map(w => w.group));
    const allGroupNames = Array.from(new Set([...relevantSettingNames, ...wordGroupNames]));
    
    const groupsData = allGroupNames.map(name => {
        const groupWordsList = wordsByMode.filter(w => w.group === name);
        let dateVal = 0;
        const parts = name.split(/[-/]/);
        if (parts.length === 3) {
            const y = parseInt(parts[0]); const m = parseInt(parts[1]); const d = parseInt(parts[2]);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) dateVal = new Date(y, m - 1, d).getTime();
        }
        return { 
            name, count: groupWordsList.length, folder: groupSettings[name] || "", dateVal 
        };
    }).filter(g => {
        if (g.count > 0) return true;
        if (canEdit && relevantSettingNames.has(g.name)) return true;
        return false;
    });

    return groupsData.sort((a, b) => {
        let res = 0;
        if (sortOption === 'name') res = a.name.localeCompare(b.name);
        else if (sortOption === 'size') res = a.count - b.count;
        else res = a.dateVal - b.dateVal; 
        return sortDirection === 'asc' ? res : -res;
    });
  }, [wordsByMode, rawGroupSettings, groupSettings, sortOption, sortDirection, viewMode, canEdit]);

  // Search
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const lower = searchTerm.toLowerCase();
    return wordsByMode.filter(w => w.english.toLowerCase().includes(lower) || w.definition.toLowerCase().includes(lower));
  }, [wordsByMode, searchTerm]);

  // Current View Words
  const currentViewWords = useMemo(() => {
      if (selectedGroup) return wordsByMode.filter(w => w.group === selectedGroup);
      if (currentFolder) return wordsByMode.filter(w => groupSettings[w.group] === currentFolder);
      return wordsByMode;
  }, [wordsByMode, selectedGroup, currentFolder, groupSettings]);

  // --- ACTIONS ---
  
  // ✅ HÀM CHỌN TỪ NGẪU NHIÊN
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
      // Gửi request patch để update learned (Backend đã xử lý lưu vào UserProgress nếu là từ System)
      api.updateWord(wordIdToSave, { learned: true }).catch(err => console.error("Save error:", err));
  };

  // ✅ SỰ KIỆN BẮT ĐẦU HỌC
  const handleStartLearn = () => {
      console.log("Start Learning Clicked!"); // Debug log
      setIsLearnMode(true);
      const unlearned = currentViewWords.filter(w => !w.learned);
      
      // Nếu đã học hết -> Reset
      if (unlearned.length === 0 && currentViewWords.length > 0) {
          handleResetProgress();
      } else {
          // Nếu còn từ chưa học -> Chọn ngẫu nhiên
          setTimeout(() => pickRandomWord(), 50);
      }
  };

  const handleResetProgress = async () => {
    const wordsToReset = currentViewWords; 
    if (wordsToReset.length === 0) return;

    try {
      setIsResetting(true);
      const idsToReset = wordsToReset.map((w: any) => w.id || w._id);
      await api.resetProgressBatch(idsToReset); // Backend đã xử lý reset cả UserProgress
      
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

  // HANDLERS CÓ PHÂN QUYỀN
  const handleAddWord = !canEdit ? async () => {} : async (e: string, d: string, t: string[]) => { 
      if(selectedGroup) { 
          await api.addWord({
              english: e, definition: d, type: t, group: selectedGroup,
              // @ts-ignore
              isGlobal: viewMode === 'global'
          }); 
          loadData(); 
      }
  };
  const handleDeleteWord = !canEdit ? async () => {} : async (id: string) => { await api.deleteWord(id); loadData(); };
  
  const handleCreateFolder = async (n: string, c: string) => { if(canEdit) { await api.addFolder({ name: n, color: c }); loadData(); } };
  const handleUpdateFolder = async (o: string, n: string, c: string) => { if(canEdit) { if(o!==n) await api.deleteFolder(o); await api.addFolder({name:n, color:c}); loadData(); } };
  const handleDeleteFolder = async (n: string) => { if(canEdit) { await api.deleteFolder(n); loadData(); } };
  
  const handleMoveGroup = async (g: string, f: string) => { if(canEdit) { await api.updateGroup(g, f); loadData(); } };
  
  const handleAddGroup = !canEdit ? () => {} : () => { 
      const n = prompt("Nhập tên nhóm mới:"); 
      if(n) {
          // @ts-ignore
          api.updateGroup(n, currentFolder||"", viewMode === 'global').then(loadData); 
      }
  };
  
  const handleDeleteGroup = !canEdit ? async () => {} : async (n: string) => { await api.deleteGroup(n); loadData(); };

  if (isLoading) return <div className="h-screen bg-black text-white flex items-center justify-center">Loading...</div>;

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      {!isLearnMode && (
        <Header 
          onSearchChange={setSearchTerm} searchTerm={searchTerm} onReset={handleReset} 
          username={currentUser || "User"} onLogout={onLogout} role={role}
          totalWords={wordsByMode.length} learnedCount={wordsByMode.filter(w => w.learned).length}
          currentMode={viewMode} onModeChange={handleModeChange}
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
                    onAddWord={handleAddWord}
                    onDeleteWord={handleDeleteWord}
                    onLearn={handleStartLearn}
                    allowEdit={canEdit}
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
                    // ✅ QUAN TRỌNG: Đảm bảo prop này được truyền
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