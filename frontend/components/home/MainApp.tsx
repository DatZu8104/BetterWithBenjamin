'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api'; 
import { Header } from '@/components/home/header';
import { GroupListView } from '@/components/home/group-list';
import { WordListView } from '@/components/home/word-list';
import { LearnModeView } from '@/components/home/learn-mode';
// ✅ IMPORT MODAL VỪA TẠO
import { StudyManagerModal } from '@/components/home/study-manager-modal'; 

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

  // ✅ STATE CHO MODAL HỌC HỆ THỐNG
  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);
  const [modalLearnWords, setModalLearnWords] = useState<any[] | null>(null);
  const [modalFolderName, setModalFolderName] = useState<string>('');

  // LOGIC QUYỀN HẠN
  const canEdit = viewMode === 'personal' || role === 'admin';

  // --- LOAD DATA ---
  const loadData = async () => {
    try {
      const data = await api.syncData();
      if (data && Array.isArray(data.words)) {
          // DEBUG: Xem cấu trúc dữ liệu trả về từ API
          const learnedWords = data.words.filter((w: any) => w.learned);
          console.log("🔥 [FRONTEND] DATA TẢI VỀ - Số từ đã thuộc:", learnedWords.length);
          if (data.words.length > 0) {
              console.log('🔥 [FRONTEND] Sample Word Structure (Từ đầu tiên):', data.words[0]);
          }
          
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

  // Filter Words & Calculate Groups (Giữ nguyên gốc 100%)
  const wordsByMode = useMemo(() => {
    if (viewMode === 'global') return words.filter(w => w.isGlobal === true);
    return words.filter(w => !w.isGlobal);
  }, [words, viewMode]);

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

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const lower = searchTerm.toLowerCase();
    return wordsByMode.filter(w => w.english.toLowerCase().includes(lower) || w.definition.toLowerCase().includes(lower));
  }, [wordsByMode, searchTerm]);

  const currentViewWords = useMemo(() => {
      if (selectedGroup) return wordsByMode.filter(w => w.group === selectedGroup);
      if (currentFolder) return wordsByMode.filter(w => groupSettings[w.group] === currentFolder);
      return wordsByMode;
  }, [wordsByMode, selectedGroup, currentFolder, groupSettings]);

  // --- ACTIONS ---
  
  const pickRandomWord = (list: any[] = currentViewWords) => {
      const unlearned = list.filter(w => modalLearnWords ? !w.isMastered : !w.learned);
      if (unlearned.length === 0) { setCurrentWord(null); return; }
      const rand = unlearned[Math.floor(Math.random() * unlearned.length)];
      setCurrentWord(rand);
  };

  // ✅ UPDATE: Xử lý thẻ kế tiếp cho cả 2 luồng (Cá nhân & Giỏ hàng Hệ thống)
  const handleNextWord = (wordId: string, isKnown: boolean) => {
      if (modalLearnWords) {
          // 1. Cập nhật trạng thái nội bộ trong thư mục (Modal)
          setModalLearnWords(prev => prev ? prev.map(w => (w.id || w._id) === wordId ? { ...w, isMastered: isKnown } : w) : null);
      }
      
      // 2. LUÔN LUÔN cập nhật mảng từ vựng tổng để thanh Progress ở ngoài nhảy số lập tức
      setWords(prev => prev.map(w => (w.id || w._id) === wordId ? { ...w, learned: isKnown } : w));
  };

  // ✅ UPDATE: Hàm bắt đầu học (Đánh chặn để mở Modal nếu là System)
  const handleStartLearn = () => {
      if (viewMode === 'global') {
          // Nếu ở Tab System -> Mở Siêu thị / Giỏ hàng
          setIsStudyModalOpen(true);
      } else {
          // Nếu ở Tab Cá nhân -> Học như bình thường
          setIsLearnMode(true);
          setModalLearnWords(null);
          const unlearned = currentViewWords.filter(w => !w.learned);
          
          if (unlearned.length === 0 && currentViewWords.length > 0) {
              handleResetProgress();
          } else {
              setTimeout(() => pickRandomWord(currentViewWords), 50);
          }
      }
  };

  // ✅ NEW: Hàm nhận Data từ Modal và đẩy vào LearnMode
  const handleStartLearnFromModal = (folderName: string, formattedWords: any[]) => {
      // Dữ liệu đã được ép phẳng (flatten) sẵn từ StudyManagerModal
      // Nên chúng ta không cần map lại nữa để tránh bị undefined.

      setModalFolderName(folderName);
      setModalLearnWords(formattedWords);
      setIsLearnMode(true);
      setIsStudyModalOpen(false); // Đóng popup

      // Bốc từ đầu tiên ra học
      const unlearned = formattedWords.filter((w: any) => !w.isMastered);
      if (unlearned.length > 0) {
          setCurrentWord(unlearned[Math.floor(Math.random() * unlearned.length)]);
      } else {
          setCurrentWord(null);
      }
  };

  // ✅ UPDATE: Xử lý Reset Progress
  const handleResetProgress = async () => {
    if (modalLearnWords) {
        // Reset tạm local để học lại vòng nữa (Học tự do nên không cần reset API)
        setIsResetting(true);
        setModalLearnWords(prev => prev ? prev.map(w => ({...w, isMastered: false})) : null);
        setTimeout(() => {
            const resetWords = modalLearnWords.map(w => ({...w, isMastered: false}));
            if(resetWords.length > 0) setCurrentWord(resetWords[Math.floor(Math.random() * resetWords.length)]);
            setIsResetting(false);
        }, 500);
        return;
    }

    // Luồng Cá nhân gốc
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
      setModalLearnWords(null);
  };

  const handleModeChange = (mode: 'personal' | 'global') => {
      setViewMode(mode);
      setSelectedGroup(null);
      setCurrentFolder(null);
      setSearchTerm('');
      setIsLearnMode(false);
      setModalLearnWords(null);
  };

  // HANDLERS CÓ PHÂN QUYỀN (Giữ nguyên gốc)
  const handleAddWord = !canEdit ? async () => {} : async (e: string, d: string, t: string[]) => { 
      if(selectedGroup) { 
          await api.addWord({ english: e, definition: d, type: t, group: selectedGroup, isGlobal: viewMode === 'global' }); 
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
      if(n) { api.updateGroup(n, currentFolder||"", viewMode === 'global').then(loadData); }
  };
  const handleDeleteGroup = !canEdit ? async () => {} : async (n: string) => { await api.deleteGroup(n); loadData(); };

  if (isLoading) return <div className="h-screen bg-black text-white flex items-center justify-center">Loading...</div>;

  return (
    <div className="flex flex-col h-screen bg-black text-white relative">
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
    allWords={modalLearnWords || currentViewWords}
    progress={(modalLearnWords || currentViewWords).filter((w: any) => modalLearnWords ? w.isMastered : w.learned).length}
    total={(modalLearnWords || currentViewWords).length}
    isResetting={isResetting}
    onNext={handleNextWord}
    
    // 🚀 Sử dụng async/await để đợi dữ liệu cập nhật xong
    onReset={async () => {
        handleResetProgress();
        await loadData(); 
    }} 
    
    // 🚀 FIX: Thoát ra ngay lập tức, không cần đợi server.
    onExit={() => { 
    setIsLearnMode(false); 
    setModalLearnWords(null); 
    loadData(); // Chạy lệnh đồng bộ trong nền để đảm bảo dữ liệu luôn khớp.
}}
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
                    onLearn={handleStartLearn} // ✅ Nút Learn trong WordListView cũng sẽ tự bắt logic Modal
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
                    onStartLearn={handleStartLearn} // ✅ Nút Learn trên Banner cũng sẽ bắt logic Modal
                    onResetLearn={handleResetProgress}
                    onUpdate={loadData}
                />
            )}
        </div>
      </div>

      {/* ✅ NHÚNG MODAL QUẢN LÝ TIẾN ĐỘ HỌC */}
      <StudyManagerModal 
        isOpen={isStudyModalOpen}
        onClose={() => setIsStudyModalOpen(false)}
        systemWords={currentViewWords} // Truyền 5000 từ (hoặc số từ của Level hiện tại) vào Tab Siêu thị
        onStartLearn={handleStartLearnFromModal} 
      />
    </div>
  );
}