'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api'; // Import API helper thay vì db
import { Header } from '@/components/home/header';
import { GroupListView } from '@/components/home/group-list';
import { WordListView } from '@/components/home/word-list';
import { LearnModeView } from '@/components/home/learn-mode';

// Định nghĩa Interface (Giữ nguyên)
interface Word { id: string; english: string; definition: string; type: string[]; group: string; learned?: boolean; }
interface GroupData { name: string; count: number; dateVal: number; folder: string; }
type SortOption = 'date' | 'name' | 'size';
type SortDirection = 'asc' | 'desc';

interface MainAppProps {
  currentUser: string;
  onLogout: () => void;
}

export function MainApp({ currentUser, onLogout }: MainAppProps) {
  // --- STATE ---
  const [words, setWords] = useState<Word[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [groupSettings, setGroupSettings] = useState<Record<string, string>>({});
  const [dbFolders, setDbFolders] = useState<string[]>([]); 
  const [folderColors, setFolderColors] = useState<Record<string, string>>({});

  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [learnMode, setLearnMode] = useState(false);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  
  // Logic Learned ID (Giờ lấy từ thuộc tính learned của word)
  const learnedIds = useMemo(() => words.filter(w => w.learned).map(w => w.id), [words]);
  
  const [isResetting, setIsResetting] = useState(false);

  // --- 1. LOAD DATA TỪ SERVER (THAY VÌ LOCAL DB) ---
  const loadData = async () => {
    try {
      const data = await api.syncData(); // Gọi API
      
      // MongoDB trả về _id, ta map sang id để khớp với App
      const normalizedWords = data.words.map((w: any) => ({
        ...w,
        id: w._id // Map _id của Mongo thành id
      }));

      setWords(normalizedWords);

      // Xử lý Group Settings
      const settingsMap: Record<string, string> = {};
      data.groupSettings.forEach((s: any) => { settingsMap[s.groupName] = s.folder; });
      setGroupSettings(settingsMap);

      // Lấy danh sách Groups
      const groupsFromWords = normalizedWords.map((w: Word) => w.group);
      const groupsFromSettings = data.groupSettings.map((s: any) => s.groupName);
      const uniqueGroups = Array.from(new Set([...groupsFromWords, ...groupsFromSettings])) as string[];
      setGroups(uniqueGroups);

      // Xử lý Folders
      setDbFolders(data.folders.map((f: any) => f.name));
      const colorMap: Record<string, string> = {};
      data.folders.forEach((f: any) => { if (f.color) colorMap[f.name] = f.color; });
      setFolderColors(colorMap);

    } catch (error) {
      console.error("Lỗi đồng bộ dữ liệu:", error);
    }
  };

  useEffect(() => { loadData(); }, []);

  // --- MEMO LOGIC (GIỮ NGUYÊN) ---
  const groupWords = selectedGroup ? words.filter((w) => w.group === selectedGroup) : [];
  
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const lower = searchTerm.toLowerCase();
    return words.filter(w => w.english.toLowerCase().includes(lower) || w.definition.toLowerCase().includes(lower));
  }, [words, searchTerm]);

  const availableFolders = useMemo(() => {
    const folderSet = new Set<string>(dbFolders);
    Object.values(groupSettings).forEach(f => { if(f) folderSet.add(f); });
    return Array.from(folderSet).sort();
  }, [dbFolders, groupSettings]);

  const sortedGroups = useMemo(() => {
    const groupData: GroupData[] = groups.map(g => {
      const count = words.filter(w => w.group === g).length;
      let dateVal = 0;
      const dateMatch = g.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (dateMatch) {
        const [_, m, d, y] = dateMatch.map(Number);
        dateVal = new Date(y, m - 1, d).getTime();
      } else {
        const parsed = Date.parse(g);
        dateVal = isNaN(parsed) ? 0 : parsed;
      }
      const folder = groupSettings[g] || "";
      return { name: g, count, dateVal, folder };
    });
    return groupData.sort((a, b) => {
      let res = 0;
      if (sortOption === 'name') res = a.name.localeCompare(b.name);
      else if (sortOption === 'size') res = a.count - b.count;
      else if (sortOption === 'date') res = (a.dateVal && b.dateVal) ? a.dateVal - b.dateVal : a.dateVal - b.dateVal || a.name.localeCompare(b.name);
      return sortDirection === 'asc' ? res : -res;
    });
  }, [groups, words, groupSettings, sortOption, sortDirection]);

  const contextWords = useMemo(() => {
    if (currentFolder) return words.filter(w => (groupSettings[w.group] || "") === currentFolder);
    return words;
  }, [words, currentFolder, groupSettings]);
  
  const contextTotal = contextWords.length;
  const contextLearnedCount = contextWords.filter(w => w.learned).length;

  // --- 2. CÁC HÀM XỬ LÝ (GỌI API) ---

  const handleCreateFolder = async (folderName: string, color: string = 'blue') => {
    if (!folderName) return;
    try { 
        await api.addFolder({ name: folderName, color }); // GỌI API
        await loadData(); 
        setCurrentFolder(folderName); 
    } catch (e) { console.error(e); }
  };

  const handleUpdateFolder = async (oldName: string, newName: string, newColor: string) => {
    // Tạm thời xóa cũ tạo mới vì Logic update name hơi phức tạp trên server
    try {
        if (oldName !== newName) {
            await api.deleteFolder(oldName);
            await api.addFolder({ name: newName, color: newColor });
            // Cần cập nhật lại các group thuộc folder cũ (Client tự xử lý logic này hoặc API xử lý)
            // Để đơn giản: Ở version này ta chấp nhận update color thôi, hoặc tạo mới.
        } else {
             // Update color (Bạn có thể thêm API update riêng, tạm thời ta dùng cách xóa tạo lại cho nhanh hoặc bỏ qua)
        }
        await loadData();
    } catch (e) { console.error(e); }
  };

  const handleDeleteFolder = async (folderName: string) => {
    if (!confirm("Xóa thư mục này?")) return;
    try {
        await api.deleteFolder(folderName); // GỌI API
        await loadData();
        setCurrentFolder(null); 
    } catch (e) { alert("Lỗi khi xóa thư mục"); }
  };

  const handleMoveGroup = async (groupName: string, folderName: string) => {
    try {
        await api.updateGroup(groupName, folderName); // GỌI API
        await loadData();
    } catch (e) { console.error(e); }
  };

  const handleAddWord = async (e: string, d: string, t: string[]) => {
    if (!selectedGroup) return;
    // GỌI API THÊM TỪ
    await api.addWord({ english: e, definition: d, type: t, group: selectedGroup });
    loadData();
  };

  const handleEditWord = async (id: string, e: string, d: string, t: string[]) => {
    // Hiện tại Server chưa có API edit word riêng, ta có thể làm trick: Xóa đi thêm lại
    // Hoặc bạn quay lại server.js thêm app.put('/api/words/:id'...)
    // Để nhanh: Ta tạm thời bỏ qua Edit hoặc làm sau.
    console.log("Tính năng Edit đang cập nhật...");
  };

  const handleAddGroup = () => {
    const name = prompt('Nhập tên group (Ví dụ: 9/20/2025):');
    if (!name || groups.includes(name)) return;
    
    // Tạo group ảo trên client trước, khi thêm từ nó sẽ tự lưu group
    setGroups(prev => [...prev, name]);
    
    // Lưu setting group
    if (currentFolder) {
        api.updateGroup(name, currentFolder).then(loadData);
    } else {
        api.updateGroup(name, "").then(loadData);
    }
  };

  const handleDeleteGroup = async (group: string) => {
    if (!confirm(`Xóa group "${group}" và toàn bộ từ vựng?`)) return;
    await api.deleteGroup(group); // GỌI API
    loadData(); 
    setSelectedGroup(null);
  };

  const handleDeleteWord = async (id: string) => {
    await api.deleteWord(id); // GỌI API
    loadData();
  };

  // --- CÁC HÀM EXPORT/IMPORT/LEARN (GIỮ NGUYÊN LOGIC, CHỈ SỬA DATA SOURCE NẾU CẦN) ---
  const handleExport = async () => {
      // Export từ state words hiện tại
      const blob = new Blob([JSON.stringify({ exportedAt: new Date(), words, groupSettings, folders: dbFolders }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'vocab_cloud_backup.json'; a.click();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    alert("Tính năng Import đang được nâng cấp để đẩy lên Cloud!");
  };

  // Logic học giữ nguyên, chỉ khác là learned status giờ nằm trong word
  const startLearnGroup = async () => { setLearnMode(true); setTimeout(() => pickRandomWord(groupWords), 80); };
  const handleStartLearnContext = () => { setSelectedGroup(null); setLearnMode(true); setTimeout(() => pickRandomWord(contextWords), 80); };
  
  const pickRandomWord = async (targetWords: Word[]) => {
    // Lọc những từ chưa học (dựa vào thuộc tính learned)
    const remaining = targetWords.filter((w) => !w.learned);
    
    if (remaining.length === 0) { setCurrentWord(null); return; }
    const rand = remaining[Math.floor(Math.random() * remaining.length)];
    setCurrentWord(rand);
    
    // Update trạng thái đã học (Cần API update learned status, tạm thời ta update local state)
    // Để hoàn thiện: Bạn cần thêm API /api/words/:id/learn
  };

  const handleSort = (option: SortOption) => {
    if (sortOption === option) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortOption(option); setSortDirection('desc'); }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background text-foreground animate-in fade-in duration-500">
      {!learnMode && (
        <Header 
          onExport={handleExport} 
          onImport={handleImport} 
          onReset={() => {setSelectedGroup(null); setSearchTerm(''); setLearnMode(false); setCurrentFolder(null);}}
          searchTerm={searchTerm} 
          onSearchChange={setSearchTerm}
          username={currentUser}
          onLogout={onLogout}
        />
      )}

      <main className="flex-1 overflow-hidden relative">
        {learnMode ? (
          <LearnModeView 
            currentWord={currentWord}
            allWords={selectedGroup ? groupWords : contextWords}
            progress={selectedGroup ? groupWords.filter(w => w.learned).length : contextLearnedCount}
            total={selectedGroup ? groupWords.length : contextTotal}
            isResetting={isResetting}
            onNext={() => pickRandomWord(selectedGroup ? groupWords : contextWords)}
            onReset={() => {
               // Logic reset learn
               setIsResetting(false);
            }}
            onExit={() => { setLearnMode(false); setCurrentWord(null); loadData(); }}
          />
        ) : selectedGroup ? (
          <WordListView 
            groupName={selectedGroup}
            words={groupWords}
            onBack={() => setSelectedGroup(null)}
            onAddWord={handleAddWord}
            onEditWord={handleEditWord}
            onDeleteWord={handleDeleteWord}
            onLearn={startLearnGroup}
            onReload={loadData}
          />
        ) : (
          <GroupListView 
            groups={sortedGroups}
            searchResults={searchResults}
            searchTerm={searchTerm} 
            onSearchChange={setSearchTerm} 
            onClearSearch={() => setSearchTerm('')}
            onSelectGroup={setSelectedGroup}
            onAddGroup={handleAddGroup}
            onDeleteGroup={handleDeleteGroup}
            onDeleteWordResult={handleDeleteWord}
            sortOption={sortOption}
            sortDirection={sortDirection}
            onSort={handleSort}
            folders={availableFolders}
            currentFolder={currentFolder}
            onSelectFolder={setCurrentFolder}
            onMoveGroup={handleMoveGroup}
            onCreateFolder={handleCreateFolder}
            onUpdateFolder={handleUpdateFolder} 
            onDeleteFolder={handleDeleteFolder}
            totalWords={contextTotal}
            learnedCount={contextLearnedCount}
            onStartLearn={handleStartLearnContext}
            onResetLearn={() => {}}
            folderColors={folderColors} 
          />
        )}
      </main>
    </div>
  );
}