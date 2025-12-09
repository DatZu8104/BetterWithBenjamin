'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/db';
import { Header } from '@/components/home/header';
import { GroupListView } from '@/components/home/group-list';
import { WordListView } from '@/components/home/word-list';
import { LearnModeView } from '@/components/home/learn-mode';

interface Word {
  id: string;
  english: string;
  definition: string;
  type: string[];
  group: string;
}

interface GroupData {
  name: string;
  count: number;
  dateVal: number;
  folder: string;
}

type SortOption = 'date' | 'name' | 'size';
type SortDirection = 'asc' | 'desc';

export default function Home() {
  const [words, setWords] = useState<Word[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [groupSettings, setGroupSettings] = useState<Record<string, string>>({});
  const [dbFolders, setDbFolders] = useState<string[]>([]); 
  const [folderColors, setFolderColors] = useState<Record<string, string>>({}); // Lưu màu folder

  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [learnMode, setLearnMode] = useState(false);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [learnedIds, setLearnedIds] = useState<string[]>([]);
  const [isResetting, setIsResetting] = useState(false);
  const [totalLearnedCount, setTotalLearnedCount] = useState(0);

  // --- DATA LOADING ---
  const loadData = async () => {
    // Safety check: Chờ DB khởi tạo xong
    if (!db || !db.words) return;

    // 1. Load Words
    const wordArr = await db.words.toArray();
    setWords(wordArr);
    
    // 2. Load Group Settings (Folder mapping)
    let settingsArr: any[] = [];
    if (db.groupSettings) {
        settingsArr = await db.groupSettings.toArray();
    }
    const settingsMap: Record<string, string> = {};
    settingsArr.forEach(s => { settingsMap[s.groupName] = s.folder; });
    setGroupSettings(settingsMap);

    // 3. Load Groups (Merge from Words and Settings)
    const groupsFromWords = wordArr.map((w) => w.group);
    const groupsFromSettings = settingsArr.map((s) => s.groupName);
    const uniqueGroups = Array.from(new Set([...groupsFromWords, ...groupsFromSettings]));
    setGroups(uniqueGroups);

    // 4. Load Folders & Colors
    if (db.folders) {
        const foldersArr = await db.folders.toArray();
        // Sắp xếp folder mới nhất lên đầu
        const sortedFolders = foldersArr.sort((a,b) => b.createdAt - a.createdAt);
        
        setDbFolders(sortedFolders.map(f => f.name));
        
        // Map màu sắc
        const colorMap: Record<string, string> = {};
        sortedFolders.forEach(f => {
            if (f.color) colorMap[f.name] = f.color;
        });
        setFolderColors(colorMap);
    }

    // 5. Load Learned Stats
    if (db.learned) {
        const learnedCount = await db.learned.count();
        setTotalLearnedCount(learnedCount);
        const learnedArr = await db.learned.toArray();
        setLearnedIds(learnedArr.map(l => l.id));
    }
  };

  useEffect(() => { loadData(); }, []);

  // --- FILTERING ---
  const groupWords = selectedGroup ? words.filter((w) => w.group === selectedGroup) : [];
  
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const lower = searchTerm.toLowerCase();
    return words.filter(w => w.english.includes(lower) || w.definition.includes(lower));
  }, [words, searchTerm]);

  const availableFolders = useMemo(() => {
    const folderSet = new Set<string>(dbFolders);
    // Sync thêm từ settings nếu có folder "mồ côi"
    Object.values(groupSettings).forEach(f => { if(f) folderSet.add(f); });
    return Array.from(folderSet).sort();
  }, [dbFolders, groupSettings]);

  const sortedGroups = useMemo(() => {
    const groupData: GroupData[] = groups.map(g => {
      const count = words.filter(w => w.group === g).length;
      
      // Parse ngày tháng từ tên nhóm (nếu có)
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

  // Logic Học theo Context (Global / Folder)
  const contextWords = useMemo(() => {
    if (currentFolder) {
      return words.filter(w => (groupSettings[w.group] || "") === currentFolder);
    }
    return words;
  }, [words, currentFolder, groupSettings]);

  const contextTotal = contextWords.length;
  const contextLearnedCount = contextWords.filter(w => learnedIds.includes(w.id)).length;

  // --- HANDLERS ---

  // 1. Tạo Folder (có màu)
  const handleCreateFolder = async (folderName: string, color: string = 'blue') => {
    if (!folderName) return;
    if (!db.folders) { alert("Lỗi DB: Bảng folders chưa sẵn sàng"); return; }
    
    try {
      // Dùng put để update nếu trùng tên, thêm nếu mới
      await db.folders.put({ 
          name: folderName, 
          color: color, 
          createdAt: Date.now() 
      });
      
      await loadData(); 
      setCurrentFolder(folderName);
    } catch (e) { 
        console.error("Create folder error:", e); 
    }
  };

  // 2. Di chuyển Group
  const handleMoveGroup = async (groupName: string, folderName: string) => {
    if (!db.groupSettings) { alert("DB Settings Error"); return; }
    
    try {
        // Cập nhật mapping
        await db.groupSettings.put({ groupName: groupName, folder: folderName });
        
        // Nếu folder đích chưa có trong bảng folders (trường hợp nhập tay), tự tạo màu mặc định
        if (folderName && db.folders) {
            const existing = await db.folders.get(folderName);
            if (!existing) {
                await db.folders.put({ name: folderName, color: 'blue', createdAt: Date.now() });
            }
        }
        await loadData();
    } catch (e) {
        console.error("Move group error:", e);
    }
  };

  const handleAddWord = async (e: string, d: string, t: string[]) => {
    if (!selectedGroup) return;
    await db.words.add({ id: crypto.randomUUID(), english: e, definition: d, type: t, group: selectedGroup });
    loadData();
  };

  const handleEditWord = async (id: string, e: string, d: string, t: string[]) => {
    await db.words.update(id, { english: e, definition: d, type: t });
    loadData();
  };

  const handleAddGroup = () => {
    const name = prompt('Nhập tên group (Ví dụ: 9/20/2025):');
    if (!name || groups.includes(name)) return;
    setGroups(prev => [...prev, name]);
    
    // Nếu đang ở trong folder, gán luôn vào folder đó
    if (currentFolder) {
        handleMoveGroup(name, currentFolder);
    } else {
        // Lưu nhóm rỗng vào root
        db.groupSettings.put({ groupName: name, folder: "" });
        loadData();
    }
  };

  const handleDeleteGroup = async (group: string) => {
    if (!confirm(`Xóa group "${group}"?`)) return;
    const list = words.filter((w) => w.group === group);
    for (const w of list) { await db.words.delete(w.id); await db.learned.delete(w.id); }
    await db.groupSettings.delete(group);
    loadData(); setSelectedGroup(null);
  };

  const handleDeleteWord = async (id: string) => {
    await db.words.delete(id); await db.learned.delete(id); loadData();
  };

  const handleExport = async () => {
    const words = await db.words.toArray();
    const learned = await db.learned.toArray();
    const settings = await db.groupSettings.toArray();
    const folders = await db.folders.toArray();
    
    const data = {
        exportedAt: new Date(), 
        groups: [...new Set(words.map((w) => w.group))], 
        words, 
        learned: learned.map((x) => x.id), 
        groupSettings: settings, 
        folders 
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'vocab_backup.json'; a.click();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const cleaned = data.words.map((w: any) => ({ ...w, english: w.english.toLowerCase(), definition: w.definition.toLowerCase() }));
      
      await db.words.clear(); await db.learned.clear(); await db.groupSettings.clear(); await db.folders.clear();
      
      await db.words.bulkPut(cleaned);
      if (data.learned) await db.learned.bulkPut(data.learned.map((id: string) => ({ id })));
      if (data.groupSettings) await db.groupSettings.bulkPut(data.groupSettings);
      if (data.folders) await db.folders.bulkPut(data.folders);
      
      loadData(); alert('Xong!');
    } catch { alert('Lỗi import'); }
  };

  // --- LOGIC HỌC ---
  const startLearnGroup = async () => { 
      setLearnMode(true); 
      setTimeout(() => pickRandomWord(groupWords), 80); 
  };
  
  const handleStartLearnContext = () => { 
      setSelectedGroup(null); 
      setLearnMode(true); 
      setTimeout(() => pickRandomWord(contextWords), 80); 
  };
  
  const handleResetLearnContext = async () => {
    const idsToReset = contextWords.filter(w => learnedIds.includes(w.id)).map(w => w.id);
    await db.learned.bulkDelete(idsToReset);
    const newLearnedIds = learnedIds.filter(id => !idsToReset.includes(id));
    setLearnedIds(newLearnedIds);
    if (learnMode) { 
        setIsResetting(true); 
        setCurrentWord(null); 
        setTimeout(() => { pickRandomWord(contextWords, newLearnedIds); setIsResetting(false); }, 80); 
    }
  };

  const pickRandomWord = async (targetWords: Word[], overrideLearned?: string[]) => {
    const currentLearned = overrideLearned || learnedIds;
    const remaining = targetWords.filter((w) => !currentLearned.includes(w.id));
    
    if (remaining.length === 0) { setCurrentWord(null); return; }
    
    const rand = remaining[Math.floor(Math.random() * remaining.length)];
    setCurrentWord(rand);
    
    await db.learned.add({ id: rand.id }).catch(() => {});
    setLearnedIds(prev => [...prev, rand.id]);
  };

  const handleSort = (option: SortOption) => {
    if (sortOption === option) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortOption(option); setSortDirection('desc'); }
  };

  // --- RENDER ---
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background text-foreground">
      
      {!learnMode && (
        <Header 
          onExport={handleExport} 
          onImport={handleImport} 
          onReset={() => {setSelectedGroup(null); setSearchTerm(''); setLearnMode(false); setCurrentFolder(null);}}
          searchTerm={searchTerm} 
          onSearchChange={setSearchTerm} 
        />
      )}

      <main className="flex-1 overflow-hidden relative">
        {learnMode ? (
          <LearnModeView 
            currentWord={currentWord}
            allWords={selectedGroup ? groupWords : contextWords}
            progress={selectedGroup ? groupWords.filter(w => learnedIds.includes(w.id)).length : contextLearnedCount}
            total={selectedGroup ? groupWords.length : contextTotal}
            isResetting={isResetting}
            onNext={() => pickRandomWord(selectedGroup ? groupWords : contextWords)}
            onReset={async () => {
               if(selectedGroup) {
                   setIsResetting(true); await db.learned.clear(); setLearnedIds([]); setCurrentWord(null);
                   setTimeout(() => { pickRandomWord(groupWords, []); setIsResetting(false); }, 80);
               } else {
                   handleResetLearnContext();
               }
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
            onCreateFolder={handleCreateFolder} // Đã update signature (name, color)
            totalWords={contextTotal}
            learnedCount={contextLearnedCount}
            onStartLearn={handleStartLearnContext}
            onResetLearn={handleResetLearnContext}
            folderColors={folderColors} // Truyền map màu
          />
        )}
      </main>
    </div>
  );
}