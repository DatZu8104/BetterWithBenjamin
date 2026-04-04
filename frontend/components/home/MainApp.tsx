'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api'; 
import { Header } from '@/components/home/header';
import { GroupListView } from '@/components/home/group-list';
import { WordListView } from '@/components/home/word-list';
import { LearnModeView } from '@/components/home/learn-mode';
import { StudyManagerModal } from '@/components/home/study-manager-modal'; 

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface MainAppProps {
  currentUser: string | null;
  role: string; 
  onLogout: () => void;
}

export function MainApp({ currentUser, onLogout, role }: MainAppProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const viewMode = (searchParams.get('tab') as 'personal' | 'global') || 'personal';
  const selectedGroup = searchParams.get('group');
  const currentFolder = searchParams.get('folder');
  const isLearnMode = searchParams.get('learn') === 'true';
  const learnSysFolder = searchParams.get('sysFolder');

  const [words, setWords] = useState<any[]>([]);
  const [rawGroupSettings, setRawGroupSettings] = useState<any[]>([]); 
  const [dbFolders, setDbFolders] = useState<string[]>([]); 
  const [folderColors, setFolderColors] = useState<Record<string, string>>({});
  const [groupSettings, setGroupSettings] = useState<Record<string, string>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [sortOption, setSortOption] = useState<'date' | 'name' | 'size'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [currentWord, setCurrentWord] = useState<any | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);
  const [modalLearnWords, setModalLearnWords] = useState<any[] | null>(null);
  const [modalFolderName, setModalFolderName] = useState<string>('');

  const canEdit = viewMode === 'personal' || role === 'admin';

  const updateUrl = (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
          if (value === null) params.delete(key);
          else params.set(key, value);
      });
      router.push(`${pathname}?${params.toString()}`);
  };

  // 🚀 MỚI: Khôi phục danh sách học từ Cache (chống mất state khi F5)
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const isLearnUrl = new URLSearchParams(window.location.search).get('learn') === 'true';
        if (isLearnUrl) {
            const cachedWords = sessionStorage.getItem('current_learn_words');
            if (cachedWords) {
                try {
                    setModalLearnWords(JSON.parse(cachedWords));
                } catch(e) { console.error("Cache parse error", e); }
            }
        }
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await api.syncData();
      let personalWords: any[] = [];
      let learnedSysIds = new Set<string>();

      if (data) {
          if (data.learnedSystemIds) learnedSysIds = new Set(data.learnedSystemIds);
          if (Array.isArray(data.words)) {
              personalWords = data.words.map((w: any) => ({
                ...w, id: w.id || w._id, learned: w.learned || false, isGlobal: false
              }));
          }
          
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

      const sysWords = await api.getSystemWords();
      let formattedSysWords: any[] = [];
      if (Array.isArray(sysWords)) {
          formattedSysWords = sysWords.map((w: any) => ({
              ...w, id: w.id || w._id, learned: learnedSysIds.has(String(w._id || w.id)), isGlobal: true
          }));
      }

      setWords([...personalWords, ...formattedSysWords]);
      setIsLoading(false);
    } catch (error) {
      console.error("Data load error:", error);
      setIsLoading(false);
    }
  };

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
        return { name, count: groupWordsList.length, folder: groupSettings[name] || "", dateVal };
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

  const pickRandomWord = (list: any[] = currentViewWords) => {
      const unlearned = list.filter(w => modalLearnWords ? !w.isMastered : !w.learned);
      if (unlearned.length === 0) { setCurrentWord(null); return; }
      const rand = unlearned[Math.floor(Math.random() * unlearned.length)];
      setCurrentWord(rand);
  };

  const handleNextWord = (wordId: string, isKnown: boolean) => {
      if (modalLearnWords) {
          setModalLearnWords(prev => {
              if (!prev) return null;
              const newWords = prev.map(w => (w.id || w._id) === wordId ? { ...w, isMastered: isKnown } : w);
              // 🚀 MỚI: Liên tục cập nhật tiến độ vào Cache để F5 không bị lùi lại
              sessionStorage.setItem('current_learn_words', JSON.stringify(newWords));
              return newWords;
          });
      }
      setWords(prev => prev.map(w => (w.id || w._id) === wordId ? { ...w, learned: isKnown } : w));
  };

  const handleStartLearn = () => {
      if (viewMode === 'global') {
          setIsStudyModalOpen(true);
      } else {
          updateUrl({ learn: 'true' }); 
          setModalLearnWords(null);
          sessionStorage.removeItem('current_learn_words'); // Dọn dẹp cache
          const unlearned = currentViewWords.filter(w => !w.learned);
          
          if (unlearned.length === 0 && currentViewWords.length > 0) handleResetProgress();
          else setTimeout(() => pickRandomWord(currentViewWords), 50);
      }
  };

  const handleStartLearnFromModal = (folderName: string, formattedWords: any[]) => {
      setModalFolderName(folderName);
      setModalLearnWords(formattedWords);
      // 🚀 MỚI: Khởi tạo Cache khi bắt đầu học
      sessionStorage.setItem('current_learn_words', JSON.stringify(formattedWords));
      updateUrl({ learn: 'true', sysFolder: folderName }); 
      setIsStudyModalOpen(false); 

      const unlearned = formattedWords.filter((w: any) => !w.isMastered);
      if (unlearned.length > 0) setCurrentWord(unlearned[Math.floor(Math.random() * unlearned.length)]);
      else setCurrentWord(null);
  };

  const handleResetProgress = async () => {
    if (modalLearnWords) {
        setIsResetting(true);
        setModalLearnWords(prev => {
            if (!prev) return null;
            const resetWords = prev.map(w => ({...w, isMastered: false}));
            // 🚀 MỚI: Xóa tiến độ trong Cache khi học lại
            sessionStorage.setItem('current_learn_words', JSON.stringify(resetWords));
            return resetWords;
        });
        setTimeout(() => {
            if (modalLearnWords.length > 0) {
                setCurrentWord(modalLearnWords[Math.floor(Math.random() * modalLearnWords.length)]);
            }
            setIsResetting(false);
        }, 500);
        return;
    }

    const wordsToReset = currentViewWords; 
    if (wordsToReset.length === 0) return;

    try {
      setIsResetting(true);
      const idsToReset = wordsToReset.map((w: any) => w.id || w._id);
      await api.resetProgressBatch(idsToReset); 
      
      setWords(prevWords => prevWords.map(w => idsToReset.includes(w.id || w._id) ? { ...w, learned: false } : w));

      if (wordsToReset.length > 0) {
          const rand = wordsToReset[Math.floor(Math.random() * wordsToReset.length)];
          setCurrentWord(rand);
      }
    } catch (error) { alert("Error resetting progress."); } 
    finally { setIsResetting(false); }
  };

  const handleReset = () => { 
      updateUrl({ group: null, folder: null, learn: null, sysFolder: null });
      setSearchTerm(''); 
      setModalLearnWords(null);
      sessionStorage.removeItem('current_learn_words');
  };

  const handleModeChange = (mode: 'personal' | 'global') => {
      updateUrl({ tab: mode, group: null, folder: null, learn: null, sysFolder: null });
      setSearchTerm('');
      setModalLearnWords(null);
      sessionStorage.removeItem('current_learn_words');
  };

  const handleAddWord = !canEdit ? async () => {} : async (e: string, d: string, t: string[]) => { 
      if(selectedGroup) { await api.addWord({ english: e, definition: d, type: t, group: selectedGroup, isGlobal: viewMode === 'global' }); loadData(); }
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

  // 🚀 Tự động tính toán lại list từ, ưu tiên dữ liệu từ Cache khi F5
  const activeLearnWords = useMemo(() => {
    if (modalLearnWords) return modalLearnWords; 
    
    // Backup fallback (Hiếm khi xảy ra nếu đã dùng Cache)
    if (viewMode === 'global' && learnSysFolder) {
        return wordsByMode.filter(w => 
            w.folder === learnSysFolder || 
            w.group === learnSysFolder || 
            w.folderName === learnSysFolder || 
            w.folderId === learnSysFolder
        );
    }
    
    return currentViewWords; 
  }, [modalLearnWords, viewMode, learnSysFolder, wordsByMode, currentViewWords]);


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
                        allWords={activeLearnWords}
                        progress={activeLearnWords.filter((w: any) => modalLearnWords ? w.isMastered : w.learned).length}
                        total={activeLearnWords.length}
                        isResetting={isResetting}
                        onNext={handleNextWord}
                        onReset={async () => { handleResetProgress(); await loadData(); }} 
                        // 🚀 Dọn dẹp cache khi ấn Thoát
                        onExit={() => { 
                            updateUrl({ learn: null, sysFolder: null }); 
                            setModalLearnWords(null); 
                            sessionStorage.removeItem('current_learn_words');
                            loadData(); 
                        }}
                        themeColor={viewMode === 'global' ? '#9333ea' : (currentFolder && folderColors[currentFolder] ? undefined : '#2563eb')}
                    />
                </div>
            ) : selectedGroup ? (
                <WordListView 
                    groupName={selectedGroup}
                    words={currentViewWords}
                    onBack={() => updateUrl({ group: null })}
                    onUpdate={loadData} onAddWord={handleAddWord} onDeleteWord={handleDeleteWord}
                    onLearn={handleStartLearn} allowEdit={canEdit}
                />
            ) : (
                <GroupListView 
                    groups={calculatedGroups} searchResults={searchResults} searchTerm={searchTerm}
                    folders={dbFolders} folderColors={folderColors} currentFolder={currentFolder}
                    totalWords={currentViewWords.length} learnedCount={currentViewWords.filter(w => w.learned).length}
                    onSearchChange={setSearchTerm} onClearSearch={() => setSearchTerm('')}
                    onSelectGroup={(g) => updateUrl({ group: g })}
                    onSelectFolder={(f) => updateUrl({ folder: f })}
                    allowAdd={canEdit} onAddGroup={handleAddGroup} onDeleteGroup={handleDeleteGroup}
                    onDeleteWordResult={handleDeleteWord} onMoveGroup={handleMoveGroup} onCreateFolder={handleCreateFolder}
                    onUpdateFolder={handleUpdateFolder} onDeleteFolder={handleDeleteFolder}
                    onSort={(opt) => {
                        if (sortOption === opt) {
                            setSortOption('date'); 
                            setSortDirection('desc'); 
                        } else {
                            setSortOption(opt);
                        }
                    }}
                    onStartLearn={handleStartLearn} onResetLearn={handleResetProgress} onUpdate={loadData}
                />
            )}
        </div>
      </div>

      <StudyManagerModal 
        isOpen={isStudyModalOpen}
        onClose={() => { setIsStudyModalOpen(false); loadData(); }}
        systemWords={currentViewWords} onStartLearn={handleStartLearnFromModal} onRefreshData={loadData} 
        />
    </div>
  );
}