'use client';
import { db } from '../../lib/db';
import { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api'; 
import { Header } from '@/components/home/header';
import { WordListView } from '@/components/home/word-list';
import { LearnModeView } from '@/components/home/learn-mode';
import { StudyManagerModal } from '@/components/home/study-manager-modal'; 
import { notify } from '../../lib/notify';
import { SmartReviewNotification } from '@/components/smart-review/SmartReviewNotification';
import { PersonalGroupListView } from '@/components/home/personal-group-list';
import { SystemGroupListView } from '@/components/home/system-group-list';

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
  
  const [personalFolders, setPersonalFolders] = useState<string[]>([]);
  const [systemFolders, setSystemFolders] = useState<string[]>([]);
  const [personalGroupSettings, setPersonalGroupSettings] = useState<Record<string, string>>({});
  const [systemGroupSettings, setSystemGroupSettings] = useState<Record<string, string>>({});
  const [folderColors, setFolderColors] = useState<Record<string, string>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [sortOption, setSortOption] = useState<'date' | 'name' | 'size'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [currentWord, setCurrentWord] = useState<any | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);
  const [modalLearnWords, setModalLearnWords] = useState<any[] | null>(null);
  const [modalFolderName, setModalFolderName] = useState<string>(''); 
  const [isSyncingSystem, setIsSyncingSystem] = useState(false);  

  const canEdit = viewMode === 'personal' || role === 'admin';
const loadMetaOnly = async () => {
    try {
        const data = await api.syncData();
        if (!data) return;

        const colors: Record<string, string> = {};
        if(data.personalFolders) data.personalFolders.forEach((f: any) => { if(f.color) colors[f.name] = f.color; });
        if(data.systemFolders) data.systemFolders.forEach((f: any) => { if(f.color) colors[f.name] = f.color; });
        setFolderColors(colors);

        if(data.personalFolders) {
            const filteredPersonal = data.personalFolders.filter((f: any) => f.isSystemSaved !== true);
            setPersonalFolders(filteredPersonal.map((f: any) => f.name));
        }
        if(data.systemFolders) setSystemFolders(data.systemFolders.map((f: any) => f.name));

        const pSettings: Record<string, string> = {};
        const sSettings: Record<string, string> = {};
        if(data.personalGroupSettings) data.personalGroupSettings.forEach((s: any) => { pSettings[s.groupName] = s.folder; });
        if(data.systemGroupSettings) data.systemGroupSettings.forEach((s: any) => { sSettings[s.groupName] = s.folder; });
        setPersonalGroupSettings(pSettings);
        setSystemGroupSettings(sSettings);
        setRawGroupSettings([...(data.personalGroupSettings || []), ...(data.systemGroupSettings || [])]);

        if (Array.isArray(data.words)) {
            const personalWords = data.words.map((w: any) => ({
                ...w, id: w.id || w._id, learned: w.learned || false, isGlobal: false
            }));
          setWords(prev => {
                const sysWords = prev.filter(w => w.isGlobal);
                return [...personalWords, ...sysWords];
            });
        }
    } catch(e) {
        console.error("loadMetaOnly error:", e);
    }
};
  const updateUrl = (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
          if (value === null) params.delete(key);
          else params.set(key, value);
      });
      router.push(`${pathname}?${params.toString()}`);
  };

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
          
           const colors: Record<string, string> = {};
          if(data.personalFolders) data.personalFolders.forEach((f: any) => { if(f.color) colors[f.name] = f.color; });
          if(data.systemFolders) data.systemFolders.forEach((f: any) => { if(f.color) colors[f.name] = f.color; });
          setFolderColors(colors);  

          if(data.personalFolders) {
                const filteredPersonal = data.personalFolders.filter((f: any) => f.isSystemSaved !== true);
                setPersonalFolders(filteredPersonal.map((f: any) => f.name));
            }
        
          if(data.systemFolders) setSystemFolders(data.systemFolders.map((f: any) => f.name));

           const pSettings: Record<string, string> = {};
          const sSettings: Record<string, string> = {};
          
          if(data.personalGroupSettings) {
             data.personalGroupSettings.forEach((s: any) => { pSettings[s.groupName] = s.folder; });
          }
          if(data.systemGroupSettings) {
             data.systemGroupSettings.forEach((s: any) => { sSettings[s.groupName] = s.folder; });
          }
          
          setPersonalGroupSettings(pSettings);
          setSystemGroupSettings(sSettings);
          
           setRawGroupSettings([...(data.personalGroupSettings || []), ...(data.systemGroupSettings || [])]);
      }

      setWords(personalWords);
      setIsLoading(false);

      syncSystemWordsInBackground(learnedSysIds);

    } catch (error) {
      console.error("Data load error:", error);
      setIsLoading(false);
    }
  };

  const syncSystemWordsInBackground = async (learnedSysIds: Set<string>) => {
    try {
      let cachedSysWords = await db.systemWords.toArray();

      if (cachedSysWords.length === 0) {
          setIsSyncingSystem(true);
          const sysWordsFromApi = await api.getSystemWords();
          
          if (Array.isArray(sysWordsFromApi)) {
              cachedSysWords = sysWordsFromApi.map((w: any) => ({
                  ...w, id: String(w._id || w.id), isGlobal: true
              }));
              await db.systemWords.bulkPut(cachedSysWords);
          }
      }

      const finalSysWords = cachedSysWords.map(w => ({
          ...w, learned: learnedSysIds.has(String(w.id))
      }));

      setWords(prevWords => {
          const personalOnly = prevWords.filter(w => !w.isGlobal);
          return [...personalOnly, ...finalSysWords];
      });      
      
      setIsSyncingSystem(false); 

    } catch (error) {
      console.error("System sync error:", error);
      setIsSyncingSystem(false);
    }
  };

  const invalidateSystemCache = async () => {
        await db.systemWords.clear();
    };

  const activeFolders = viewMode === 'global' ? systemFolders : personalFolders;
  const activeGroupSettings = viewMode === 'global' ? systemGroupSettings : personalGroupSettings;

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
        const count = groupWordsList.length;
        
        const learnedWords = groupWordsList.filter(w => w.learned).length;
        const percentage = count > 0 ? Math.round((learnedWords / count) * 100) : 0;

        let dateVal = 0;
        const parts = name.split(/[-/]/);
        if (parts.length === 3) {
            const y = parseInt(parts[0]); const m = parseInt(parts[1]); const d = parseInt(parts[2]);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) dateVal = new Date(y, m - 1, d).getTime();
        }
        return { 
            name, 
            count, 
            folder: activeGroupSettings[name] || "", 
            dateVal,
            learnedWords, 
            percentage    
        };
    }).filter(g => {
        if (g.count > 0) return true;
         if (relevantSettingNames.has(g.name)) return true;
        return false;
    });

    return groupsData.sort((a, b) => {
        let res = 0;
        if (sortOption === 'name') res = a.name.localeCompare(b.name);
        else if (sortOption === 'size') res = a.count - b.count;
        else res = a.dateVal - b.dateVal; 
        return sortDirection === 'asc' ? res : -res;
    });
  }, [wordsByMode, rawGroupSettings, activeGroupSettings, sortOption, sortDirection, viewMode, canEdit]);

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const lower = searchTerm.toLowerCase();
    return wordsByMode.filter(w => w.english.toLowerCase().includes(lower) || w.definition.toLowerCase().includes(lower));
  }, [wordsByMode, searchTerm]);

  const currentViewWords = useMemo(() => {
      if (selectedGroup) return wordsByMode.filter(w => w.group === selectedGroup);
      if (currentFolder) return wordsByMode.filter(w => activeGroupSettings[w.group] === currentFolder);
      return wordsByMode;
  }, [wordsByMode, selectedGroup, currentFolder, activeGroupSettings]);

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
          sessionStorage.removeItem('current_learn_words'); 
          const unlearned = currentViewWords.filter(w => !w.learned);
          
          if (unlearned.length === 0 && currentViewWords.length > 0) handleResetProgress();
          else setTimeout(() => pickRandomWord(currentViewWords), 50);
      }
  };

  const handleStartLearnFromModal = (folderName: string, formattedWords: any[]) => {
      setModalFolderName(folderName);
      setModalLearnWords(formattedWords);
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
    if(selectedGroup) {
        const tempWord = {
            id: `temp_${Date.now()}`,
            english: e, word: e, definition: d, type: t,
            group: selectedGroup,
            isGlobal: viewMode === 'global',
            learned: false
        };
        setWords(prev => [...prev, tempWord]);

        try {
            const saved = await api.addWord({ english: e, definition: d, type: t, group: selectedGroup, isGlobal: viewMode === 'global' });
            
             setWords(prev => prev.map(w => 
                w.id === tempWord.id 
                    ? { ...saved, id: String(saved._id || saved.id), isGlobal: viewMode === 'global' } 
                    : w
            ));

            if (viewMode === 'global') {
                const newWord = { ...saved, id: String(saved._id || saved.id), isGlobal: true };
                await db.systemWords.put(newWord);
            }
        } catch(error) {
            setWords(prev => prev.filter(w => w.id !== tempWord.id));
            notify.error("Error", "Failed to add word.");
        }
    }
};

const handleEditWord = !canEdit ? async () => {} : async (id: string, english: string, definition: string, type: string[]) => {
    setWords(prev => prev.map(w => 
        (w.id === id || w._id === id) 
            ? { ...w, english, word: english, definition, type } 
            : w
    ));

    try {
        const updatePayload = viewMode === 'global'
            ? { word: english, definition, type }
            : { english, definition, type };

        await api.updateWord(id, updatePayload);

        if (viewMode === 'global') {
            await db.systemWords.where('id').equals(id).modify({ 
                word: english, english, definition, type 
            });
        }
    } catch (error) {
        notify.error("Error", "Failed to update word.");
        loadData();
    }
};

const handleDeleteWord = !canEdit ? async () => {} : async (id: string) => {
    setWords(prev => prev.filter(w => w.id !== id && w._id !== id));

    try {
        await api.deleteWord(id);

        if (viewMode === 'global') {
            await db.systemWords.where('id').equals(id).delete();
        }
        
        notify.success("Deleted!", "The word has been removed from your list.");
    } catch (error) {
        notify.error("Error", "Failed to delete the word.");
    }
};
  const handleCreateFolder = async (n: string, c: string) => {
    if (canEdit) {
      await api.addFolder({
        name: n,
        color: c,
        isGlobal: viewMode === 'global' 
      });
      
      if (viewMode === 'global') {
          await api.updateGroup(n, "", true);
      }
      
      loadData();
    }
  };

  const handleUpdateFolder = async (o: string, n: string, c: string) => { 
      if(canEdit) { 
          if(o!==n) await api.deleteFolder(o); 
          await api.addFolder({name: n, color: c, isGlobal: viewMode === 'global'}); 
          loadData(); 
      } 
  };
  const handleDeleteFolder = async (n: string) => { 
    if(canEdit) { 
        try {
            setWords(prev => prev.filter(w => w.group !== n));
            await db.systemWords.where('group').equals(n).delete();

            await api.deleteFolder(n);
            
            await loadMetaOnly();
            notify.success("Folder Deleted", `The folder has been removed.`);
            updateUrl({ folder: null, group: null }); 
        } catch(e) { 
            notify.error("Error", "Failed to delete folder.");
            loadData();
        }
    } 
};
  const handleMoveGroup = async (g: string, f: string) => { if(canEdit) { await api.updateGroup(g, f); loadData(); } };
  const handleAddGroup = !canEdit ? async (n: string) => {} : async (n: string) => { 
      try {
          await api.updateGroup(n, currentFolder || "", viewMode === 'global');
          loadData();
          notify.success("Group Created", `Group "${n}" is ready.`);
      } catch(e) { 
          notify.error("Error", "Failed to create group."); 
      }
  };
const handleDeleteGroup = !canEdit ? async () => {} : async (n: string) => { 
    try {
        if (viewMode === 'global') {
            setWords(prev => prev.filter(w => w.group !== n));
            
            await db.systemWords.where('group').equals(n).delete();

            await api.deleteFolder(n);

            await loadMetaOnly();

        } else {
            setWords(prev => prev.filter(w => w.group !== n));
            await api.deleteGroup(n);
            await loadMetaOnly();
        }
        notify.success("Deleted!", "Group has been removed.");
    } catch(e) {
        notify.error("Error", "Failed to delete.");
        loadData(); 
    }
};
  const activeLearnWords = useMemo(() => {
    if (modalLearnWords) return modalLearnWords; 
    
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
                        onExit={() => { 
                            updateUrl({ learn: null, sysFolder: null }); 
                            setModalLearnWords(null); 
                            sessionStorage.removeItem('current_learn_words');
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
                    onEditWord={handleEditWord}
                />
            ) : viewMode === 'personal' ? (
                <PersonalGroupListView 
                    groups={calculatedGroups} searchResults={searchResults} searchTerm={searchTerm}
                    folders={activeFolders} 
                    folderColors={folderColors} currentFolder={currentFolder}
                    totalWords={currentViewWords.length} learnedCount={currentViewWords.filter(w => w.learned).length}
                    onSearchChange={setSearchTerm} onClearSearch={() => setSearchTerm('')}
                    onSelectGroup={(g) => updateUrl({ group: g })}
                    onSelectFolder={(f) => updateUrl({ folder: f })}
                    allowAdd={true} 
                    onAddGroup={handleAddGroup} onDeleteGroup={handleDeleteGroup}
                    onDeleteWordResult={handleDeleteWord} onMoveGroup={handleMoveGroup} onCreateFolder={handleCreateFolder}
                    onUpdateFolder={handleUpdateFolder} onDeleteFolder={handleDeleteFolder}
                    onSort={(opt) => {
                        if (sortOption === opt) {
                            setSortOption('date'); setSortDirection('desc'); 
                        } else { setSortOption(opt); }
                    }}
                    onStartLearn={handleStartLearn} onResetLearn={handleResetProgress} onUpdate={loadData}
                />
            ) : (
                <SystemGroupListView 
                    groups={calculatedGroups} searchResults={searchResults} searchTerm={searchTerm}
                    folders={activeFolders} 
                    folderColors={folderColors} currentFolder={currentFolder}
                    totalWords={currentViewWords.length} learnedCount={currentViewWords.filter(w => w.learned).length}
                    onSearchChange={setSearchTerm} onClearSearch={() => setSearchTerm('')}
                    onSelectGroup={(g) => updateUrl({ group: g })}
                    onSelectFolder={(f) => updateUrl({ folder: f })}
                    allowAdd={role === 'admin'}
                    onAddGroup={handleAddGroup} onDeleteGroup={handleDeleteGroup}
                    onDeleteWordResult={handleDeleteWord} onMoveGroup={handleMoveGroup} onCreateFolder={handleCreateFolder}
                    onUpdateFolder={handleUpdateFolder} onDeleteFolder={handleDeleteFolder}
                    onSort={(opt) => {
                        if (sortOption === opt) {
                            setSortOption('date'); setSortDirection('desc'); 
                        } else { setSortOption(opt); }
                    }}
                    onStartLearn={handleStartLearn} onResetLearn={handleResetProgress} onUpdate={loadData}
                />
            )}
        </div>
      </div>

      <StudyManagerModal 
        isOpen={isStudyModalOpen}
        onClose={() => { setIsStudyModalOpen(false) }}
        systemWords={currentViewWords} onStartLearn={handleStartLearnFromModal} onRefreshData={loadData} 
        />
        {isSyncingSystem && (
        <div className="fixed bottom-4 right-4 bg-blue-600/90 backdrop-blur-sm text-white px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-2 text-sm border border-blue-400">
          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Synchronizing system data...</span>
        </div>
        )}
    {/* Smart Review Notification */}
        <SmartReviewNotification
            onOpenSmartReview={() => router.push('/smart-review')}
        />
        </div>
    );
}