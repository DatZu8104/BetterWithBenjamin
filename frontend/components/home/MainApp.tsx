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

  // --- LOAD DATA ---
  const loadData = async () => {
    try {
      const data = await api.syncData();
      if (data && Array.isArray(data.words)) {
          const normalizedWords = data.words.map((w: any) => ({
            ...w,
            id: w.id || w._id,
            learned: w.learned || false 
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

  // ... (Giữ nguyên phần useMemo logic) ...
  const calculatedGroups = useMemo(() => {
    const groupNames = Array.from(new Set([...words.map(w => w.group), ...Object.keys(groupSettings)]));
    const groupsData = groupNames.map(name => {
        const groupWordsList = words.filter(w => w.group === name);
        let dateVal = 0;
        // Logic parse date (nếu tên nhóm là ngày tháng)
        // ... giữ nguyên ...
        return { name, count: groupWordsList.length, folder: groupSettings[name] || "", dateVal };
    });
    return groupsData.sort((a, b) => {
        let res = 0;
        if (sortOption === 'name') res = a.name.localeCompare(b.name);
        else if (sortOption === 'size') res = a.count - b.count;
        else res = 0; 
        return sortDirection === 'asc' ? res : -res;
    });
  }, [words, groupSettings, sortOption, sortDirection]);

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const lower = searchTerm.toLowerCase();
    return words.filter(w => w.english.toLowerCase().includes(lower) || w.definition.toLowerCase().includes(lower));
  }, [words, searchTerm]);

  const currentViewWords = useMemo(() => {
      if (selectedGroup) return words.filter(w => w.group === selectedGroup);
      if (currentFolder) return words.filter(w => groupSettings[w.group] === currentFolder);
      return words;
  }, [words, selectedGroup, currentFolder, groupSettings]);

  // --- LOGIC ---
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

  // --- CRUD HANDLERS (ENGLISH UI) ---
  const handleAddWord = async (e: string, d: string, t: string[]) => { 
      if(selectedGroup) { 
          await api.addWord({english: e, definition: d, type: t, group: selectedGroup}); 
          loadData(); 
      }
  };
  const handleDeleteWord = async (id: string) => { await api.deleteWord(id); loadData(); };
  
  const handleCreateFolder = async (n: string, c: string) => { await api.addFolder({ name: n, color: c }); loadData(); };
  const handleUpdateFolder = async (o: string, n: string, c: string) => { if(o!==n) await api.deleteFolder(o); await api.addFolder({name:n, color:c}); loadData(); };
  const handleDeleteFolder = async (n: string) => { await api.deleteFolder(n); loadData(); };
  
  const handleMoveGroup = async (g: string, f: string) => { await api.updateGroup(g, f); loadData(); };
  
  const handleAddGroup = () => { 
      // ✅ DỊCH SANG TIẾNG ANH
      const n = prompt("Enter new group name:"); 
      if(n) api.updateGroup(n, currentFolder||"").then(loadData); 
  };
  
  const handleDeleteGroup = async (n: string) => { await api.deleteGroup(n); loadData(); };

  // --- RENDER ---
  const totalSystemWords = words.length;
  const totalLearnedWords = words.filter(w => w.learned).length;

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
                        themeColor={currentFolder && folderColors[currentFolder] ? undefined : '#2563eb'}
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
                    words={words}
                />
            )}
        </div>
      </div>
    </div>
  );
}