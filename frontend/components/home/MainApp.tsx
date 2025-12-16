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
  // --- STATE ---
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

          setDbFolders(data.folders.map((f: any) => f.name));
          const colors: Record<string, string> = {};
          data.folders.forEach((f: any) => { if(f.color) colors[f.name] = f.color; });
          setFolderColors(colors);

          const settings: Record<string, string> = {};
          data.groupSettings.forEach((s: any) => { settings[s.groupName] = s.folder; });
          setGroupSettings(settings);
      }
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // --- MEMO ---
  const calculatedGroups = useMemo(() => {
    const groupNames = Array.from(new Set([...words.map(w => w.group), ...Object.keys(groupSettings)]));
    const groupsData = groupNames.map(name => {
        const groupWordsList = words.filter(w => w.group === name);
        let dateVal = 0;
        const dateMatch = name.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (dateMatch) {
            const [_, m, d, y] = dateMatch.map(Number);
            dateVal = new Date(y, m - 1, d).getTime();
        }
        return { name, count: groupWordsList.length, folder: groupSettings[name] || "", dateVal };
    });
    return groupsData.sort((a, b) => {
        let res = 0;
        if (sortOption === 'name') res = a.name.localeCompare(b.name);
        else if (sortOption === 'size') res = a.count - b.count;
        else if (sortOption === 'date') res = b.dateVal - a.dateVal;
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

  // 1. Next Word (Optimistic UI)
  const handleNextWord = () => {
      if (!currentWord) return;
      const wordIdToSave = currentWord.id;

      // Chọn từ mới trước
      const remaining = currentViewWords.filter(w => !w.learned && w.id !== wordIdToSave);
      if (remaining.length === 0) {
          setCurrentWord(null); 
      } else {
          const rand = remaining[Math.floor(Math.random() * remaining.length)];
          setCurrentWord(rand);
      }

      // Cập nhật State & DB sau
      setWords(prev => prev.map(w => w.id === wordIdToSave ? { ...w, learned: true } : w));
      api.updateWord(wordIdToSave, { learned: true }).catch(err => console.error("Lỗi lưu ngầm:", err));
  };

  // 2. Start Learn (Chỉ bắt đầu học, không reset nếu chưa cần)
  const handleStartLearn = () => {
      setIsLearnMode(true);
      // Kiểm tra nếu đã học hết sạch thì hỏi reset hoặc tự reset
      const unlearned = currentViewWords.filter(w => !w.learned);
      if (unlearned.length === 0 && currentViewWords.length > 0) {
          // Nếu đã học hết -> Gọi hàm reset
          handleResetProgress();
      } else {
          // Nếu còn từ chưa học -> Học tiếp
          setTimeout(() => pickRandomWord(), 50);
      }
  };

  // 3. Reset Progress 
  const handleResetProgress = async () => {
    // 1. Hỏi xác nhận trước khi xóa 
    try {
      // 2. Lấy danh sách ID của tất cả từ vựng
      // (Lưu ý: kiểm tra kỹ xem từ vựng dùng _id hay id)
      const allWordIds = words.map((w: any) => w._id || w.id);
      
      if (allWordIds.length === 0) return;

      // 3. Gọi API Reset
      await api.resetProgressBatch(allWordIds);

      // 4. Cập nhật lại dữ liệu trên màn hình (về 0%)
      await loadData();

    } catch (error) {
      console.error("Lỗi khi reset:", error);
      alert("Có lỗi xảy ra khi đặt lại tiến độ.");
    }
  };

  // 4. Reset Navigation (Về trang chủ) - Dùng cho nút Header
  const handleReset = () => { 
      setSelectedGroup(null); 
      setCurrentFolder(null); 
      setSearchTerm(''); 
      setIsLearnMode(false); 
  };

  // --- CRUD HANDLERS ---
  const handleAddWord = async (e: string, d: string, t: string[]) => { if(selectedGroup) { await api.addWord({english: e, definition: d, type: t, group: selectedGroup}); loadData(); }};
  const handleDeleteWord = async (id: string) => { await api.deleteWord(id); loadData(); };
  const handleCreateFolder = async (n: string, c: string) => { await api.addFolder({ name: n, color: c }); loadData(); };
  const handleUpdateFolder = async (o: string, n: string, c: string) => { if(o!==n) await api.deleteFolder(o); await api.addFolder({name:n, color:c}); loadData(); };
  const handleDeleteFolder = async (n: string) => { await api.deleteFolder(n); loadData(); };
  const handleMoveGroup = async (g: string, f: string) => { await api.updateGroup(g, f); loadData(); };
  const handleAddGroup = () => { const n = prompt("Tên nhóm:"); if(n) api.updateGroup(n, currentFolder||"").then(loadData); };
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
          // ✅ FIX QUAN TRỌNG: Dùng handleReset (Về trang chủ) thay vì handleResetProgress (Xóa DB)
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
                        // ✅ FIX: Khi bấm "Học lại từ đầu" ở màn hình chúc mừng -> Gọi reset DB
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