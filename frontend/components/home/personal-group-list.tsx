'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Plus, Trash2, Folder, FolderOpen, MoreVertical, MoveRight, PlayCircle, RotateCcw, GraduationCap, Library, ChevronDown, ChevronRight, Check, X, Settings, Pencil, Loader2, Calendar, Hash, ArrowDownAZ, ExternalLink } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { cn } from '../../lib/utils';
import { FeatureHint } from '../onboarding/FeatureHint';
import { ONBOARDING_IDS } from '../onboarding/constants';
import { toast } from 'sonner';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { notify } from '../../lib/notify';
import { checkDuplicateName } from '../../lib/validators';

const COLORS = [
  { id: 'blue', name: 'Blue', bg: 'bg-blue-600', style: { bg: "bg-blue-950/20", border: "border-blue-900/50", iconBox: "bg-blue-900/50 text-blue-300", title: "text-blue-300", progressTrack: "bg-blue-950", progressFill: "bg-blue-600", button: "bg-blue-700 hover:bg-blue-600 text-white", resetBtn: "text-blue-400 hover:bg-blue-950/50", cardBorder: "border-blue-800", cardBg: "bg-blue-950/20", folderText: "text-blue-400", cardHover: "hover:border-blue-600" }},
  { id: 'violet', name: 'Violet', bg: 'bg-violet-600', style: { bg: "bg-violet-950/20", border: "border-violet-900/50", iconBox: "bg-violet-900/50 text-violet-300", title: "text-violet-300", progressTrack: "bg-violet-950", progressFill: "bg-violet-600", button: "bg-violet-700 hover:bg-violet-600 text-white", resetBtn: "text-violet-400 hover:bg-violet-950/50", cardBorder: "border-violet-800", cardBg: "bg-violet-950/20", folderText: "text-violet-400", cardHover: "hover:border-violet-600" }},
  { id: 'emerald', name: 'Green', bg: 'bg-emerald-600', style: { bg: "bg-emerald-950/20", border: "border-emerald-900/50", iconBox: "bg-emerald-900/50 text-emerald-300", title: "text-emerald-300", progressTrack: "bg-emerald-950", progressFill: "bg-emerald-600", button: "bg-emerald-700 hover:bg-emerald-600 text-white", resetBtn: "text-emerald-400 hover:bg-emerald-950/50", cardBorder: "border-emerald-800", cardBg: "bg-emerald-950/20", folderText: "text-emerald-400", cardHover: "hover:border-emerald-600" }},
  { id: 'amber', name: 'Orange', bg: 'bg-amber-600', style: { bg: "bg-amber-950/20", border: "border-amber-900/50", iconBox: "bg-amber-900/50 text-amber-300", title: "text-amber-300", progressTrack: "bg-amber-950", progressFill: "bg-amber-600", button: "bg-amber-700 hover:bg-amber-600 text-white", resetBtn: "text-amber-400 hover:bg-amber-950/50", cardBorder: "border-amber-800", cardBg: "bg-amber-950/20", folderText: "text-amber-400", cardHover: "hover:border-amber-600" }},
  { id: 'rose', name: 'Red', bg: 'bg-rose-600', style: { bg: "bg-rose-950/20", border: "border-rose-900/50", iconBox: "bg-rose-900/50 text-rose-300", title: "text-rose-300", progressTrack: "bg-rose-950", progressFill: "bg-rose-600", button: "bg-rose-700 hover:bg-rose-600 text-white", resetBtn: "text-rose-400 hover:bg-rose-950/50", cardBorder: "border-rose-800", cardBg: "bg-rose-950/20", folderText: "text-rose-400", cardHover: "hover:border-rose-600" }},
  { id: 'cyan', name: 'Cyan', bg: 'bg-cyan-600', style: { bg: "bg-cyan-950/20", border: "border-cyan-900/50", iconBox: "bg-cyan-900/50 text-cyan-300", title: "text-cyan-300", progressTrack: "bg-cyan-950", progressFill: "bg-cyan-600", button: "bg-cyan-700 hover:bg-cyan-600 text-white", resetBtn: "text-cyan-400 hover:bg-cyan-950/50", cardBorder: "border-cyan-800", cardBg: "bg-cyan-950/10", folderText: "text-cyan-400", cardHover: "hover:border-cyan-600" }}
];

interface PersonalGroupListProps {
  groups: any[]; 
  searchResults: any[];
  searchTerm: string;
  folders: string[];
  currentFolder: string | null;
  totalWords: number;
  learnedCount: number;
  folderColors: Record<string, string>; 
  
  onSearchChange: (val: string) => void;
  onClearSearch: () => void;
  onSelectGroup: (name: string) => void;
  onAddGroup: (name: string) => void;
  onDeleteGroup: (name: string) => void;
  onDeleteWordResult: (id: string) => void;
  onSelectFolder: (f: string | null) => void;
  onMoveGroup: (group: string, folder: string) => void;
  onCreateFolder: (folder: string, color: string) => void;
  onUpdateFolder: (oldName: string, newName: string, newColor: string) => void; 
  onDeleteFolder: (folderName: string) => void;
  sortOption: 'date' | 'name' | 'size' | string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (option: any) => void;
  onStartLearn: () => void;
  onContinueLearn?: () => void;
  onResetLearn: () => void;

  onUpdate?: () => void;
  allowAdd?: boolean;
}

export function PersonalGroupListView({
  groups, searchResults, searchTerm, onSearchChange, onClearSearch,
  onSelectGroup, onAddGroup, onDeleteGroup, onDeleteWordResult,
  sortOption, sortDirection, onSort,
  folders, currentFolder, onSelectFolder, onMoveGroup, onCreateFolder, onUpdateFolder, onDeleteFolder,
  totalWords, learnedCount, onStartLearn, onContinueLearn, onResetLearn,
  folderColors, 
  onUpdate,
  allowAdd = true
}: PersonalGroupListProps) {
  
  const [groupToMove, setGroupToMove] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create_folder' | 'edit_folder'>('create_folder');
  const [editingFolder, setEditingFolder] = useState<string | null>(null); 
  const [folderNameInput, setFolderNameInput] = useState('');
  const [folderColorInput, setFolderColorInput] = useState('blue');
  
  // STATE CÂY THƯ MỤC TRONG MENU DROPDOWN
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const [detailWord, setDetailWord] = useState<any | null>(null);

  const [displayLimit, setDisplayLimit] = useState(30);
  const observerTarget = useRef<HTMLDivElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'Folder' | 'Group' | 'Word', name: string, id?: string } | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, type: 'Folder' | 'Group' | 'Word', name: string, id?: string) => {
    e.stopPropagation();
    setDeleteTarget({ type, name, id });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'Folder') {
      onDeleteFolder(deleteTarget.name);
    } else if (deleteTarget.type === 'Group') {
      onDeleteGroup(deleteTarget.name);
    } else if (deleteTarget.type === 'Word' && deleteTarget.id) {
      onDeleteWordResult(deleteTarget.id); 
      if(onUpdate) onUpdate(); 
      notify.success("Word Deleted", "The word has been removed successfully!");
    }
    setDeleteTarget(null); 
  };

  useEffect(() => {
    setDisplayLimit(30);
  }, [searchTerm]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && searchResults.length > displayLimit) {
          setDisplayLimit((prev) => prev + 30);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [displayLimit, searchResults.length]);

  const playAudio = (e: React.MouseEvent, url: string | undefined, text: string, type: 'us' | 'uk' = 'us') => {
    e.stopPropagation(); 
    if (url && url.startsWith('http')) {
        new Audio(url).play().catch(err => console.log("Audio play error:", err));
    } else {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = type === 'uk' ? 'en-GB' : 'en-US';
        window.speechSynthesis.speak(u);
    }
  };

  const currentThemeColor = currentFolder && folderColors[currentFolder] ? folderColors[currentFolder] : 'blue';
  const currentTheme = COLORS.find(c => c.id === currentThemeColor)?.style || COLORS[0].style;

  const folderCards = Array.from(new Set(folders)).map(folderName => {
    const groupsInFolder = groups.filter(g => g.folder === folderName);
    const groupCount = groupsInFolder.length;
    const count = groupsInFolder.reduce((acc, g) => acc + g.count, 0);
    const learnedWords = groupsInFolder.reduce((acc, g) => acc + (g.learnedWords || 0), 0);
    const percentage = count > 0 ? Math.round((learnedWords / count) * 100) : 0;
    return {
        isFolder: true as const,
        name: folderName,
        groupCount,
        count,
        learnedWords,
        percentage
    };
  });

  let sortedFolderCards = [...folderCards];
  sortedFolderCards.sort((a, b) => {
    let res = 0;
    if (sortOption === 'name') res = a.name.localeCompare(b.name);
    else if (sortOption === 'size') res = a.count - b.count;
    else res = a.name.localeCompare(b.name); 
    return sortDirection === 'asc' ? res : -res;
  });

  const displayItems = currentFolder 
    ? groups.filter(g => g.folder === currentFolder) 
    : [...sortedFolderCards, ...groups.filter(g => !g.folder)]; 

  const progressPercent = totalWords > 0 ? Math.round((learnedCount / totalWords) * 100) : 0;
  const displayResults = searchResults.slice(0, displayLimit);

  // MỞ MODAL TẠO FOLDER
  const openCreateFolderModal = () => {
    setModalMode('create_folder');
    setEditingFolder(null);
    setFolderNameInput('');
    setFolderColorInput('blue');
    setIsModalOpen(true);
  };

  const openEditModal = (fName: string) => {
    setModalMode('edit_folder');
    setEditingFolder(fName);
    setFolderNameInput(fName);
    setFolderColorInput(folderColors[fName] || 'blue');
    setIsModalOpen(true);
  };

  const handleModalSubmit = () => {
    if (!folderNameInput.trim()) return;

    // --- KIỂM TRA TRÙNG LẶP KHI TẠO FOLDER MỚI ---
    if (modalMode === 'create_folder') {
        // Gọi file validator kiểm tra mảng 'folders'
        if (!checkDuplicateName(folderNameInput, folders, 'Folder')) return;

        onCreateFolder(folderNameInput, folderColorInput);
        if (groupToMove) { 
            onMoveGroup(groupToMove, folderNameInput); 
            setGroupToMove(null); 
        }
        notify.success("Folder Created", `Navigating to "${folderNameInput}"...`);
        onSelectFolder(folderNameInput); 
    } 
    
    else {
        if (editingFolder) {
            if (editingFolder !== folderNameInput) {
                 if (!checkDuplicateName(folderNameInput, folders, 'Folder')) return;
            }

            onUpdateFolder(editingFolder, folderNameInput, folderColorInput);
            notify.success("Folder Updated", "Changes saved successfully.");
            if (currentFolder === editingFolder && currentFolder !== folderNameInput) {
                onSelectFolder(folderNameInput);
            }
        }
    }
    
    setIsModalOpen(false);
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 bg-black text-white relative">
      <div className="max-w-6xl mx-auto pb-20">
        
        {/* BANNER */}
        {!searchTerm && (totalWords > 0 || currentFolder) && (
          <div className={cn("mb-8 border p-6 md:p-8 rounded-3xl shadow-sm flex flex-col md:flex-row items-center gap-8 relative overflow-hidden transition-colors duration-500", currentTheme.bg, currentTheme.border)}>
            <div className="flex-1 w-full z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className={cn("p-2 rounded-lg transition-colors", currentTheme.iconBox)}>
                   {currentFolder ? <Library className="w-6 h-6" /> : <GraduationCap className="w-6 h-6" />}
                </div>
                
                <div className="flex items-center gap-3">
                    <h2 className={cn("text-2xl md:text-3xl font-bold transition-colors", currentTheme.title)}>
                    {currentFolder ? currentFolder : "Personal Master Library"}
                    </h2>
                    
                    {currentFolder && allowAdd && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors outline-none">
                                    <Settings className="w-5 h-5" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="bg-zinc-900 border border-zinc-800 text-white p-1 shadow-xl z-50">
                                <DropdownMenuItem onClick={() => openEditModal(currentFolder!)} className="focus:bg-zinc-800 focus:text-white cursor-pointer py-2 px-3 rounded-md">
                                    <Pencil className="w-4 h-4 mr-2 text-zinc-400" /> Edit Folder
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-zinc-800"/>
                                <DropdownMenuItem 
                                    onClick={() => {
                                        setDeleteTarget({ type: 'Folder', name: currentFolder || "" });
                                    }} 
                                    className="focus:bg-red-950/30 text-red-500 focus:text-red-400 cursor-pointer py-2 px-3 rounded-md"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete Folder
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
              </div>
              <p className="text-zinc-400 mb-6 text-base max-w-xl">
                {currentFolder 
                    ? (totalWords > 0 ? `This folder contains ${displayItems.length} groups. Total ${totalWords} words.` : "This folder is empty.")
                    : `Your complete personal collection of ${totalWords} words.`
                }
              </p>
              
              {totalWords > 0 && (
                <div className="space-y-2 max-w-md">
                    <div className="flex justify-between text-sm font-semibold">
                    <span className="text-zinc-500">Retention Rate</span>
                    <span className="text-white">{progressPercent}%</span>
                    </div>
                    <div className={cn("h-3 w-full rounded-full overflow-hidden border border-white/5", currentTheme.progressTrack)}>
                    <div className={cn("h-full transition-all duration-1000 ease-out rounded-full", currentTheme.progressFill)} style={{ width: `${progressPercent}%` }} />
                    </div>
                    <p className="text-xs text-zinc-500 pt-1">Learned {learnedCount} / {totalWords} words</p>
                </div>
              )}
            </div>

            {totalWords > 0 && (
                <div className="flex flex-col gap-3 shrink-0 w-full md:w-auto z-10">
                
                <FeatureHint 
                    id={ONBOARDING_IDS.SYSTEM_WORDS_START}
                    waitFor={ONBOARDING_IDS.HOME_SYSTEM_WORDS}
                    side="bottom"
                    align="center"
                    message={
                        <div className="space-y-1.5 w-[220px]">
                            <p className="font-bold text-white flex items-center gap-1.5">
                                <PlayCircle className="w-4 h-4 text-emerald-400" />
                                Get started now!
                            </p>
                            <p className="text-zinc-100 text-sm leading-snug font-normal">
                                Bấm vào đây để bắt đầu học với flashcards!
                            </p>
                        </div>
                    }
                >
                    <div className="inline-block w-full">
                        <Button size="lg"
                            onClick={learnedCount > 0 && learnedCount < totalWords && onContinueLearn ? onContinueLearn : onStartLearn}
                            className={cn("w-full md:w-64 h-14 text-lg font-bold shadow-lg transition-all hover:scale-105 rounded-2xl border-none", currentTheme.button)}>
                            <PlayCircle className="w-6 h-6 mr-2 fill-current" /> {learnedCount > 0 && learnedCount < totalWords ? "Continue Learning" : "Start Learning"}
                        </Button>
                    </div>
                </FeatureHint>

                {learnedCount > 0 && learnedCount < totalWords && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onStartLearn}
                        className={cn("w-full transition-colors font-semibold", currentTheme.resetBtn)}
                    >
                        <Settings className="w-4 h-4 mr-2" /> Manage
                    </Button>
                )}

                {learnedCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            if(confirm("Are you sure you want to reset all progress for this section?")) {
                                onResetLearn();
                                toast.success("Progress has been reset!");
                            }
                        }}
                        className={cn("w-full transition-colors", currentTheme.resetBtn)}
                    >
                    <RotateCcw className="w-4 h-4 mr-2" /> Reset Progress
                    </Button>
                )}
                </div>
            )}
          </div>
        )}

        {/* SEARCH RESULTS */}
        {searchTerm && (
             <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
             <h2 className="text-xl font-bold flex items-center gap-2 pb-4 border-b border-zinc-800 text-white">
               🔍 Search Results ({searchResults.length})
             </h2>
             <div className="grid gap-3">
               {displayResults.map((word: any) => {
                 const displayWord = word.word || word.english;
                 const displayLevel = word.level || (word.group?.includes('Level') ? word.group.split('Level ')[1] : null);
                 const displayPhonetic = word.phonetics?.us || word.phonetics?.uk || word.ipa || "";

                 return (
                 <div key={word.id} 
                      onClick={() => setDetailWord(word)}
                      className="group flex items-center justify-between p-3 sm:p-4 rounded-2xl border border-white/5 bg-zinc-900 hover:bg-zinc-800 hover:border-blue-500/30 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer">
                    
                    <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:gap-3 pr-2 sm:pr-4">
                        
                        <div className="flex items-center gap-2 flex-wrap">
                            {displayLevel && (
                                <span className="text-[10px] font-bold bg-yellow-600/20 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-600/30">
                                    {displayLevel}
                                </span>
                            )}
                            {!displayLevel && word.group && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 font-medium truncate max-w-[100px] sm:max-w-[140px] shrink-0">
                                    {word.group}
                                </span>
                            )}
                            <span className="font-bold text-base sm:text-lg text-white group-hover:text-blue-400 transition-colors truncate">
                                {displayWord}
                            </span>
                            {word.learned && (
                                <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                                    Learned
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 mt-1 sm:mt-0">
                            {word.type && (
                                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-zinc-500 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded shrink-0">
                                    {Array.isArray(word.type) ? word.type.join(', ') : word.type}
                                </span>
                            )}
                            {displayPhonetic && (
                                <span className="text-[11px] sm:text-xs text-zinc-500 font-mono shrink-0">
                                    {displayPhonetic}
                                </span>
                            )}
                        </div>

                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            {allowAdd && (
                                <button 
                                    onClick={(e) => handleDeleteClick(e, 'Word', word.english || 'this word', word.id)} 
                                    className="p-1.5 sm:p-2 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4"/>
                                </button>
                            )}
                        </div>
                    </div>
                 </div>
               )})}
             </div>
             
             {/* INFINITE SCROLL LOADER */}
             {searchResults.length > displayLimit && (
                 <div ref={observerTarget} className="text-center py-6 flex justify-center w-full">
                    <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium px-4 py-2 bg-zinc-900/50 rounded-full border border-zinc-800">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Loading more...
                    </div>
                 </div>
             )}
           </div>
        )}

        {/* LIST & FOLDER */}
        {!searchTerm && (
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div className="flex items-center">
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={cn("flex items-center gap-3 px-5 py-2.5 rounded-xl border-2 transition-all duration-200 outline-none group shadow-sm", currentFolder ? "bg-zinc-900 border-zinc-700 hover:bg-zinc-800" : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800")}>
                        <div className={cn("p-2 rounded-lg transition-colors", currentFolder ? "bg-zinc-800 text-white" : "bg-zinc-800 text-zinc-400 group-hover:text-white")}>
                            {currentFolder ? <FolderOpen className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
                        </div>
                        <div className="text-left">
                            <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Folders</p>
                            <div className="flex items-center gap-2">
                                <span className={cn("text-base font-bold max-w-[150px] truncate", currentFolder ? "text-white" : "text-white")}>{currentFolder || "All Folders"}</span>
                                <ChevronDown className="w-4 h-4 text-zinc-500" />
                            </div>
                        </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-72 p-2 bg-neutral-900 border border-zinc-800 text-zinc-300 shadow-2xl z-50 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    
                    <DropdownMenuItem onClick={() => onSelectFolder(null)} className="cursor-pointer py-2.5 px-3 rounded-lg focus:bg-zinc-800 focus:text-white">
                      <Folder className="w-4 h-4 mr-3 text-zinc-500" /> <span className="font-medium">All Folders</span> {!currentFolder && <Check className="w-4 h-4 ml-auto text-white"/>}
                    </DropdownMenuItem>
                    <div className="h-px bg-zinc-800 my-1" />

                    {/* MENU CÂY THƯ MỤC */}
                    {Array.from(new Set(folders)).map(f => {
                        const folderGroups = groups.filter(g => g.folder === f);
                        const isExpanded = expandedFolders[f];

                        return (
                            <div key={f} className="mb-1">
                                <div className="flex items-stretch rounded-lg hover:bg-zinc-800 focus-within:bg-zinc-800 group transition-colors">
                                    <DropdownMenuItem onClick={() => onSelectFolder(f)} className="flex-1 cursor-pointer py-2.5 px-3 focus:bg-transparent focus:text-white">
                                        <FolderOpen className={cn("w-4 h-4 mr-3", folderColors[f] ? COLORS.find(c=>c.id===folderColors[f])?.style.folderText : "text-zinc-400")} />
                                        <span className="font-medium flex-1">{f}</span>
                                        {currentFolder === f && <Check className="w-4 h-4 ml-2 text-white shrink-0"/>}
                                    </DropdownMenuItem>

                                    {folderGroups.length > 0 && (
                                        <div className="flex items-center justify-center px-1">
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setExpandedFolders(prev => ({...prev, [f]: !prev[f]}));
                                                }}
                                                className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-700 transition-colors"
                                            >
                                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {isExpanded && folderGroups.length > 0 && (
                                    <div className="pl-7 pr-2 mt-1 mb-2 space-y-1 border-l border-zinc-800 ml-5">
                                        {folderGroups.map(g => (
                                            <DropdownMenuItem
                                                key={g.name}
                                                onClick={() => {
                                                    onSelectFolder(f);
                                                    onSelectGroup(g.name); 
                                                }}
                                                className="cursor-pointer py-2 px-3 rounded-md text-sm text-zinc-400 hover:text-white focus:bg-zinc-800 focus:text-white flex items-center"
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 mr-3 shrink-0" />
                                                <span className="truncate">{g.name}</span>
                                            </DropdownMenuItem>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    <div className="h-px bg-zinc-800 my-1" />
                    {allowAdd && (
                        <DropdownMenuItem onClick={openCreateFolderModal} className="cursor-pointer py-2.5 px-3 rounded-lg text-white focus:bg-zinc-800 font-bold">
                        <Plus className="w-4 h-4 mr-3" /> <span className="font-bold">New Folder</span>
                        </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

              </div>

              <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                <div className="flex items-center bg-zinc-900 p-1.5 rounded-xl border border-zinc-800 shadow-sm shrink-0 gap-1">
                  
                  <Button 
                    variant={sortOption === 'date' ? "default" : "ghost"}
                    size="sm" 
                    className={cn(
                        "h-9 px-3.5 rounded-lg transition-all flex items-center gap-1.5 font-bold", 
                        sortOption === 'date' ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                    )} 
                    onClick={() => {
                        if (sortOption === 'date') {
                            onSort(null); 
                            toast.info("Sorting removed");
                        } else {
                            onSort('date'); 
                            toast.success("Sorted by Calendar Date");
                        }
                    }}
                  >
                    <Calendar className="w-4 h-4" /> Calendar
                  </Button>

                  <Button 
                    variant={sortOption === 'size' ? "default" : "ghost"}
                    size="sm" 
                    className={cn(
                        "h-9 px-3.5 rounded-lg transition-all flex items-center gap-1.5 font-bold", 
                        sortOption === 'size' ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                    )} 
                    onClick={() => {
                        if (sortOption === 'size') {
                            onSort(null); 
                            toast.info("Sorting removed");
                        } else {
                            onSort('size'); 
                            toast.success("Sorted by Size");
                        }
                    }}
                  >
                    <Hash className="w-4 h-4" /> Size
                  </Button>

                  <Button 
                    variant={sortOption === 'name' ? "default" : "ghost"}
                    size="sm" 
                    className={cn(
                        "h-9 px-3.5 rounded-lg transition-all flex items-center gap-1.5 font-bold", 
                        sortOption === 'name' ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                    )} 
                    onClick={() => {
                        if (sortOption === 'name') {
                            onSort(null); 
                            toast.info("Sorting removed");
                        } else {
                            onSort('name'); 
                            toast.success("Sorted by Name (A-Z)");
                        }
                    }}
                  >
                    <ArrowDownAZ className="w-4 h-4" /> Name
                  </Button>

                </div>
                
                {allowAdd && !currentFolder && (
                    <Button onClick={openCreateFolderModal} className="shrink-0 h-11 px-5 rounded-xl font-bold bg-violet-600 hover:bg-violet-700 text-white border-none">
                      <Plus className="w-5 h-5 mr-1.5"/> New Folder
                    </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4 duration-500">
              {displayItems.map((item: any, index: number) => {
                
                if (item.isFolder) {
                    const cardColor = folderColors[item.name] || 'blue';
                    const cardTheme = COLORS.find(c => c.id === cardColor)?.style || COLORS[0].style;
                    const cardClasses = cn(
                        "group relative p-5 flex flex-col justify-between border-2 transition-all cursor-pointer min-h-[11rem] rounded-2xl shadow-sm w-full",
                        `${cardTheme.cardBorder} ${cardTheme.cardBg} ${cardTheme.cardHover}` 
                    );

                    const folderCardInner = (
                        <>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-3">
                                    <div className={cn("p-2.5 rounded-xl border-2 mb-3 transition-colors bg-opacity-50", cardTheme.iconBox, "border-transparent")}>
                                        <Folder className="w-7 h-7" />
                                    </div>
                                    {allowAdd && (
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:bg-zinc-700 hover:text-white -mr-2 -mt-2">
                                                <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56 bg-neutral-900 border border-zinc-800 text-zinc-300 shadow-2xl p-1 z-50">
                                                <DropdownMenuLabel className="text-xs text-zinc-500 uppercase tracking-widest pl-2 py-2">Folder Actions</DropdownMenuLabel>
                                                <DropdownMenuSeparator className="bg-zinc-800" />
                                                <DropdownMenuItem onSelect={() => openEditModal(item.name)} className="rounded-md focus:bg-zinc-800 focus:text-white py-2 px-2 cursor-pointer text-zinc-300">
                                                    <Pencil className="w-4 h-4 mr-2 text-zinc-500" /> <span>Edit Folder</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator className="bg-zinc-800" />
                                                <DropdownMenuItem 
                                                    onClick={() => {
                                                        setDeleteTarget({ type: 'Folder', name: item.name });
                                                    }} 
                                                    className="rounded-md text-red-500 focus:bg-red-950/20 focus:text-red-400 py-2 px-2 cursor-pointer"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" /> Delete Folder
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    )}
                                </div>
                                <h3 className={cn("text-xl font-bold w-full transition-colors line-clamp-2 text-white")} title={item.name}>{item.name}</h3>
                                <p className="text-sm text-zinc-400 font-medium mt-1">{item.groupCount} Groups</p>
                            </div>

                            {item.percentage !== undefined && (
                                <div className="mt-3 mb-1">
                                    <div className="flex justify-between items-end mb-1.5">
                                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Progress</span>
                                        <span className={cn("text-xs font-bold", cardTheme.folderText)}>{item.percentage}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                        <div className={cn("h-full rounded-full transition-all duration-700", cardTheme.progressFill)} style={{ width: `${item.percentage}%` }}></div>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                                <span className={cn("text-xs font-semibold shrink-0", cardTheme.folderText)}>
                                    {item.learnedWords !== undefined ? `${item.learnedWords}/${item.count} learned` : `${item.count} words`}
                                </span>
                            </div>
                        </>
                    );

                    if (index === 0) {
                        return (
                            <FeatureHint
                                key={`tour-${item.name}`}
                                id={ONBOARDING_IDS.FOLDER_CLICK}
                                waitFor={ONBOARDING_IDS.SYSTEM_WORDS_START} 
                                delay={400} 
                                side="top"
                                align="center"
                                message={
                                    <div className="space-y-1.5 w-[220px]">
                                        <p className="font-bold text-white flex items-center gap-1.5">
                                            <FolderOpen className="w-4 h-4 text-blue-400" /> Open Folder!
                                        </p>
                                        <p className="text-zinc-100 text-sm leading-snug font-normal">
                                            Bấm vào thư mục này để xem các nhóm từ vựng bên trong.
                                        </p>
                                    </div>
                                }
                            >
                                <Card className={cardClasses} onClick={() => onSelectFolder(item.name)}>
                                    {folderCardInner}
                                </Card>
                            </FeatureHint>
                        );
                    }

                    return (
                        <Card key={`folder-${item.name}`} className={cardClasses} onClick={() => onSelectFolder(item.name)}>
                            {folderCardInner}
                        </Card>
                    );
                }

                const g = item;
                const cardFolder = g.folder;
                const cardColor = cardFolder && folderColors[cardFolder] ? folderColors[cardFolder] : null;
                const cardTheme = cardColor ? COLORS.find(c => c.id === cardColor)?.style : null;

                const cardInner = (
                  <>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-3">
                          <div className={cn("p-2 rounded-lg border mb-3 transition-colors", cardFolder && cardTheme ? `${cardTheme.iconBox} border-transparent` : "bg-zinc-800 border-zinc-700 text-zinc-400")}>
                              <Folder className="w-5 h-5" />
                          </div>
                          {allowAdd && (
                              <div onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-600 hover:bg-zinc-700 hover:text-white -mr-2 -mt-2">
                                      <MoreVertical className="w-4 h-4" />
                                      </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-56 bg-neutral-900 border border-zinc-800 text-zinc-300 shadow-2xl p-1 z-50">
                                      <DropdownMenuLabel className="text-xs text-zinc-500 uppercase tracking-widest pl-2 py-2">Actions</DropdownMenuLabel>
                                      <DropdownMenuSeparator className="bg-zinc-800" />
                                      <DropdownMenuItem onSelect={() => setGroupToMove(g.name)} className="rounded-md focus:bg-zinc-800 focus:text-white py-2 px-2 cursor-pointer text-zinc-300">
                                          <MoveRight className="w-4 h-4 mr-2 text-zinc-500" /> <span>Move to...</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator className="bg-zinc-800" />
                                      <DropdownMenuItem 
                                        onClick={() => {
                                            setDeleteTarget({ type: 'Group', name: g.name });
                                        }} 
                                        className="rounded-md text-red-500 focus:bg-red-950/20 focus:text-red-400 py-2 px-2 cursor-pointer"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" /> Delete Group
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                  </DropdownMenu>
                              </div>
                          )}
                      </div>
                      <h3 className={cn("text-lg font-bold w-full transition-colors line-clamp-2", cardFolder && cardTheme ? "text-white" : "text-white group-hover:text-zinc-300")} title={g.name}>{g.name}</h3>
                    </div>

                    {g.percentage !== undefined && (
                        <div className="mt-3 mb-1">
                            <div className="flex justify-between items-end mb-1.5">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Progress</span>
                                <span className={cn("text-xs font-bold", cardFolder && cardTheme ? cardTheme.folderText : "text-zinc-300")}>{g.percentage}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                <div className={cn("h-full rounded-full transition-all duration-700", cardFolder && cardTheme ? cardTheme.progressFill : "bg-zinc-500")} style={{ width: `${g.percentage}%` }}></div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                        <span className={cn("text-xs font-semibold shrink-0", cardFolder && cardTheme ? cardTheme.folderText : "text-zinc-500")}>
                            {g.learnedWords !== undefined ? `${g.learnedWords}/${g.count} learned` : `${g.count} words`}
                        </span>
                        {!currentFolder && g.folder && (
                          <span className={cn("text-[10px] px-2 py-1 rounded border font-medium max-w-[60%] truncate flex items-center gap-1 ml-2", cardFolder && cardTheme ? `bg-black/20 border-white/10 ${cardTheme.folderText}` : "bg-zinc-950 border-zinc-800 text-zinc-400")}>
                            <Folder className="w-3 h-3 shrink-0"/> <span className="truncate">{g.folder}</span>
                          </span>
                        )}
                    </div>
                  </>
                );

                const cardClasses = cn(
                  "group relative p-5 flex flex-col justify-between border-2 transition-all cursor-pointer min-h-[11rem] rounded-2xl shadow-sm w-full",
                  cardFolder && cardTheme 
                      ? `${cardTheme.cardBorder} ${cardTheme.cardBg} ${cardTheme.cardHover}` 
                      : "border-zinc-800 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800/80"
                );

                if (index === 0 && !item.isFolder) {
                    return (
                        <FeatureHint
                            key={`tour-${g.name}`}
                            id={ONBOARDING_IDS.FOLDER_CLICK}
                            waitFor={ONBOARDING_IDS.SYSTEM_WORDS_START} 
                            delay={400} 
                            side="top"
                            align="center"
                            message={
                                <div className="space-y-1.5 w-[220px]">
                                    <p className="font-bold text-white flex items-center gap-1.5">
                                        <FolderOpen className="w-4 h-4 text-blue-400" /> Open Group!
                                    </p>
                                    <p className="text-zinc-100 text-sm leading-snug font-normal">
                                        Click on this card to view the detailed vocabulary list inside.
                                    </p>
                                </div>
                            }
                        >
                            <Card className={cardClasses} onClick={() => onSelectGroup(g.name)}>
                                {cardInner}
                            </Card>
                        </FeatureHint>
                    );
                }

                return (
                  <Card key={`group-${g.name}`} className={cardClasses} onClick={() => onSelectGroup(g.name)}>
                      {cardInner}
                  </Card>
                );
              })}
              
              {allowAdd && !currentFolder && (
                  <div className="border-2 border-dashed border-zinc-800 bg-zinc-900/30 rounded-2xl flex flex-col items-center justify-center min-h-[11rem] cursor-pointer hover:bg-zinc-900 transition-all text-zinc-600 hover:text-white hover:border-zinc-700"
                    onClick={openCreateFolderModal}>
                    <Plus className="w-8 h-8 mb-2 opacity-50" />
                    <span className="font-bold text-sm">New Folder</span>
                  </div>
              )}
            </div>
          </>
        )}

        {/* MODAL DI CHUYỂN */}
        {groupToMove && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setGroupToMove(null)}>
                <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900">
                        <h3 className="font-bold text-white text-lg">Move "{groupToMove}"</h3>
                        <Button variant="ghost" size="icon" onClick={() => setGroupToMove(null)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5"/></Button>
                    </div>
                    <div className="p-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        <p className="text-xs text-zinc-500 font-bold uppercase px-3 py-2 tracking-wider">Select Destination</p>
                        <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800 transition-colors text-left group" onClick={() => { onMoveGroup(groupToMove, ""); setGroupToMove(null); toast.success("Moved to Unsorted!"); }}>
                            <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400 group-hover:text-white group-hover:bg-zinc-700 transition-colors"><Folder className="w-5 h-5"/></div>
                            <span className="font-medium text-zinc-300 group-hover:text-white">Unsorted (No Folder)</span>
                        </button>
                        <div className="h-px bg-zinc-800 my-2 mx-3"></div>
                        <div className="space-y-1">
                            {Array.from(new Set(folders)).map(f => {
                                const fColor = folderColors[f];
                                const fStyle = fColor ? COLORS.find(c => c.id === fColor)?.style : null;
                                return (
                                <button key={f} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800 transition-colors text-left group" onClick={() => { onMoveGroup(groupToMove, f); setGroupToMove(null); toast.success(`Moved to ${f}!`); }}>
                                    <div className={cn("p-2 rounded-lg transition-all", fStyle ? fStyle.iconBox : "bg-zinc-800 text-zinc-400")}><FolderOpen className="w-5 h-5"/></div>
                                    <span className="font-medium text-zinc-300 group-hover:text-white">{f}</span>
                                </button>
                            )})}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL TẠO/SỬA FOLDER/GROUP */}
        {isModalOpen && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsModalOpen(false)}>
                <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                    <h3 className="text-xl font-bold text-white mb-4">
                        {modalMode === 'create_folder' ? "Create New Folder" : "Edit Folder"}
                    </h3>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                                Folder Name
                            </label>
                            <input
                                autoFocus
                                type="text"
                                placeholder="e.g. TOEIC Preparation"
                                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-600 transition-colors"
                                value={folderNameInput}
                                onChange={(e) => setFolderNameInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleModalSubmit()}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Select Color</label>
                            <div className="flex flex-wrap gap-3">
                                {COLORS.map((color) => (
                                    <button
                                        key={color.id}
                                        onClick={() => setFolderColorInput(color.id)}
                                        className={cn(
                                            "w-10 h-10 rounded-full transition-all border-2",
                                            color.bg,
                                            folderColorInput === color.id ? "border-white scale-110 shadow-lg ring-2 ring-white/20" : "border-transparent opacity-50 hover:opacity-100 hover:scale-105"
                                        )}
                                        title={color.name}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="pt-4 flex gap-3">
                            <Button className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white h-12 rounded-xl" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button className="flex-1 bg-white hover:bg-zinc-200 text-black h-12 rounded-xl font-bold" onClick={handleModalSubmit}>
                                {modalMode === 'create_folder' ? (groupToMove ? "Create & Move" : "Create") : "Save Changes"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </div>

      {/* --- MODAL HIỂN THỊ CHI TIẾT NGHĨA TỪ --- */}
      {detailWord && (() => {
          const actualData = detailWord?.wordId || detailWord || {};
          const definitions = (actualData.definitions && actualData.definitions.length > 0)
              ? actualData.definitions
              : [{
                  order: 1,
                  label: 'Definition',
                  definition: actualData.definition || "There is no definition available.",
                  examples: actualData.example ? [actualData.example] : []
              }];
          const phonetics = actualData.phonetics || {};
          const displayWord = actualData.word || actualData.english || "Unknown";

          return (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setDetailWord(null)}>
                  
                  <div className="w-[95vw] sm:w-[90vw] max-w-5xl h-[95vh] sm:h-[90vh] bg-zinc-800 border-2 border-blue-900/50 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>

                      <div className="p-4 sm:p-5 px-5 sm:px-8 border-b border-zinc-900/50 bg-zinc-900 flex justify-between items-start shrink-0">
                          <div className="flex-1 min-w-0 pr-3 sm:pr-4 flex flex-col justify-center">
                              <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                                  <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight break-words">{displayWord}</h2>
                                  {actualData.type && (
                                      <span className="text-sm sm:text-base text-blue-400 italic font-serif opacity-90 shrink-0">
                                          {Array.isArray(actualData.type) ? actualData.type.join(', ') : actualData.type}
                                      </span>
                                  )}
                              </div>
                              
                              {(phonetics.us || actualData.audio?.us || phonetics.uk || actualData.audio?.uk) && (
                                  <div className="flex items-center gap-3 sm:gap-5 mt-1 sm:mt-1.5 w-full flex-nowrap overflow-hidden">
                                      {(phonetics.us || actualData.audio?.us) && (
                                          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink">
                                              <button 
                                                  onClick={(e) => playAudio(e, actualData.audio?.us, displayWord, 'us')} 
                                                  className="shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all text-[9px] sm:text-[10px] font-bold"
                                              >
                                                  US
                                              </button>
                                              {phonetics.us && <span className="text-[10px] sm:text-xs text-zinc-400 font-mono tracking-wide truncate">{phonetics.us}</span>}
                                          </div>
                                      )}

                                      {(phonetics.uk || actualData.audio?.uk) && (
                                          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink">
                                              <button 
                                                  onClick={(e) => playAudio(e, actualData.audio?.uk, displayWord, 'uk')} 
                                                  className="shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-white transition-all text-[9px] sm:text-[10px] font-bold"
                                              >
                                                  UK
                                              </button>
                                              {phonetics.uk && <span className="text-[10px] sm:text-xs text-zinc-400 font-mono tracking-wide truncate">{phonetics.uk}</span>}
                                          </div>
                                      )}
                                  </div>
                              )}
                          </div>

                          <button onClick={() => setDetailWord(null)} className="p-1.5 sm:p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-400 hover:text-white transition-colors shrink-0 mt-0.5">
                              <X className="w-5 h-5"/>
                          </button>
                      </div>

                      <div className="p-4 sm:p-6 px-5 sm:px-8 overflow-y-auto custom-scrollbar flex-1 bg-zinc-800 text-left relative">
                          {actualData.href && (
                              <div className="absolute top-4 sm:top-5 right-4 sm:right-5 z-10">
                                  <a href={actualData.href} target="_blank" rel="noopener noreferrer" className="text-[10px] sm:text-xs font-bold text-blue-400 flex items-center gap-1.5 hover:bg-blue-600 hover:text-white bg-blue-950/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-blue-900 transition-all">
                                      View on Oxford <ExternalLink className="w-3 h-3"/>
                                                        </a>
                              </div>
                          )}

                          <div className="space-y-5 sm:space-y-6 pb-6 pt-1">
                              {definitions.map((def: any, idx: number) => (
                                  <div key={idx} className="relative pl-3 sm:pl-4 border-l-2 sm:border-l-[3px] border-blue-500/30">
                                      <div className="flex items-center gap-2 mb-1.5">
                                          <div className="bg-blue-500/10 text-blue-300 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-wider">
                                              {def.label || `Meaning ${idx + 1}`}
                                          </div>
                                      </div>
                                      
                                      <h3 className="text-base sm:text-lg text-white font-medium leading-relaxed mb-2 sm:mb-2.5">{def.definition}</h3>
                                      
                                      {def.examples && def.examples.length > 0 && (
                                          <div className="space-y-1.5 sm:space-y-2 bg-black/20 p-3 sm:p-4 rounded-xl border border-white/5">
                                              {def.examples.map((ex: string, i: number) => (
                                                  <div key={i} className="flex gap-2 items-start">
                                                      <span className="text-blue-500/50 text-[10px] sm:text-xs mt-1 sm:mt-1.5">●</span>
                                                      <p className="text-zinc-300 text-sm italic leading-relaxed">"{ex}"</p>
                                                  </div>
                                              ))}
                                          </div>
                                      )}
                                  </div>
                              ))}
                          </div>
                      </div>

                  </div>
              </div>
          );
      })()}

    <ConfirmDialog 
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={`Delete ${deleteTarget?.type}`}
        description={`Are you sure you want to delete this ${deleteTarget?.type?.toLowerCase()}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
