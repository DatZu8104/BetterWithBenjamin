'use client';

import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Plus, Trash2, Folder, FolderOpen, MoreVertical, MoveRight, PlayCircle, RotateCcw, GraduationCap, Library, ChevronDown, Check, X, Settings, Pencil } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { cn } from '../../lib/utils';
import { Input } from '../ui/input'; // Đảm bảo import này có để tránh lỗi search
// Nếu project của bạn không dùng component Input từ ui/input cho search bar (mà dùng input thường), bạn có thể bỏ dòng trên.
// Tuy nhiên code gốc bạn gửi không có import Input nhưng lại không dùng component Input trong JSX (bạn dùng input html thường ở modal), nên tôi giữ nguyên logic của bạn.

const COLORS = [
  { id: 'blue', name: 'Blue', bg: 'bg-blue-600', style: { bg: "bg-blue-950/20", border: "border-blue-900/50", iconBox: "bg-blue-900/50 text-blue-300", title: "text-blue-300", progressTrack: "bg-blue-950", progressFill: "bg-blue-600", button: "bg-blue-700 hover:bg-blue-600 text-white", resetBtn: "text-blue-400 hover:bg-blue-950/50", cardBorder: "border-blue-800", cardBg: "bg-blue-950/20", folderText: "text-blue-400", cardHover: "hover:border-blue-600" }},
  { id: 'violet', name: 'Violet', bg: 'bg-violet-600', style: { bg: "bg-violet-950/20", border: "border-violet-900/50", iconBox: "bg-violet-900/50 text-violet-300", title: "text-violet-300", progressTrack: "bg-violet-950", progressFill: "bg-violet-600", button: "bg-violet-700 hover:bg-violet-600 text-white", resetBtn: "text-violet-400 hover:bg-violet-950/50", cardBorder: "border-violet-800", cardBg: "bg-violet-950/20", folderText: "text-violet-400", cardHover: "hover:border-violet-600" }},
  { id: 'emerald', name: 'Green', bg: 'bg-emerald-600', style: { bg: "bg-emerald-950/20", border: "border-emerald-900/50", iconBox: "bg-emerald-900/50 text-emerald-300", title: "text-emerald-300", progressTrack: "bg-emerald-950", progressFill: "bg-emerald-600", button: "bg-emerald-700 hover:bg-emerald-600 text-white", resetBtn: "text-emerald-400 hover:bg-emerald-950/50", cardBorder: "border-emerald-800", cardBg: "bg-emerald-950/20", folderText: "text-emerald-400", cardHover: "hover:border-emerald-600" }},
  { id: 'amber', name: 'Orange', bg: 'bg-amber-600', style: { bg: "bg-amber-950/20", border: "border-amber-900/50", iconBox: "bg-amber-900/50 text-amber-300", title: "text-amber-300", progressTrack: "bg-amber-950", progressFill: "bg-amber-600", button: "bg-amber-700 hover:bg-amber-600 text-white", resetBtn: "text-amber-400 hover:bg-amber-950/50", cardBorder: "border-amber-800", cardBg: "bg-amber-950/20", folderText: "text-amber-400", cardHover: "hover:border-amber-600" }},
  { id: 'rose', name: 'Red', bg: 'bg-rose-600', style: { bg: "bg-rose-950/20", border: "border-rose-900/50", iconBox: "bg-rose-900/50 text-rose-300", title: "text-rose-300", progressTrack: "bg-rose-950", progressFill: "bg-rose-600", button: "bg-rose-700 hover:bg-rose-600 text-white", resetBtn: "text-rose-400 hover:bg-rose-950/50", cardBorder: "border-rose-800", cardBg: "bg-rose-950/20", folderText: "text-rose-400", cardHover: "hover:border-rose-600" }},
  { id: 'cyan', name: 'Cyan', bg: 'bg-cyan-600', style: { bg: "bg-cyan-950/20", border: "border-cyan-900/50", iconBox: "bg-cyan-900/50 text-cyan-300", title: "text-cyan-300", progressTrack: "bg-cyan-950", progressFill: "bg-cyan-600", button: "bg-cyan-700 hover:bg-cyan-600 text-white", resetBtn: "text-cyan-400 hover:bg-cyan-950/50", cardBorder: "border-cyan-800", cardBg: "bg-cyan-950/10", folderText: "text-cyan-400", cardHover: "hover:border-cyan-600" }}
];

interface GroupListProps {
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
  onAddGroup: () => void;
  onDeleteGroup: (name: string) => void;
  onDeleteWordResult: (id: string) => void;
  onSelectFolder: (f: string | null) => void;
  onMoveGroup: (group: string, folder: string) => void;
  onCreateFolder: (folder: string, color: string) => void;
  onUpdateFolder: (oldName: string, newName: string, newColor: string) => void; 
  onDeleteFolder: (folderName: string) => void;
  sortOption: 'date' | 'name' | 'size';
  sortDirection: 'asc' | 'desc';
  onSort: (option: 'date' | 'name' | 'size') => void;
  onStartLearn: () => void;
  onResetLearn: () => void;

  onUpdate?: () => void; 
  words?: any[];
  // ✅ PROP MỚI
  allowAdd?: boolean;
}

export function GroupListView({
  groups, searchResults, searchTerm, onSearchChange, onClearSearch,
  onSelectGroup, onAddGroup, onDeleteGroup, onDeleteWordResult,
  sortOption, sortDirection, onSort,
  folders, currentFolder, onSelectFolder, onMoveGroup, onCreateFolder, onUpdateFolder, onDeleteFolder,
  totalWords, learnedCount, onStartLearn, onResetLearn,
  folderColors, 
  onUpdate,
  allowAdd = true
}: GroupListProps) {
  
  const [groupToMove, setGroupToMove] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [folderNameInput, setFolderNameInput] = useState('');
  const [folderColorInput, setFolderColorInput] = useState('blue');

  const currentThemeColor = currentFolder && folderColors[currentFolder] ? folderColors[currentFolder] : 'blue';
  const currentTheme = COLORS.find(c => c.id === currentThemeColor)?.style || COLORS[0].style;

  const displayGroups = currentFolder 
    ? groups.filter(g => g.folder === currentFolder)
    : groups;

  const progressPercent = totalWords > 0 ? Math.round((learnedCount / totalWords) * 100) : 0;

  const openCreateModal = () => {
    setModalMode('create');
    setFolderNameInput('');
    setFolderColorInput('blue');
    setIsModalOpen(true);
  };

  const openEditModal = () => {
    if (!currentFolder) return;
    setModalMode('edit');
    setFolderNameInput(currentFolder);
    setFolderColorInput(folderColors[currentFolder] || 'blue');
    setIsModalOpen(true);
  };

  const handleModalSubmit = () => {
    if (!folderNameInput.trim()) return;
    if (modalMode === 'create') {
        onCreateFolder(folderNameInput, folderColorInput);
        if (groupToMove) { onMoveGroup(groupToMove, folderNameInput); setGroupToMove(null); }
    } else {
        if (currentFolder) onUpdateFolder(currentFolder, folderNameInput, folderColorInput);
    }
    setIsModalOpen(false);
    if (onUpdate) onUpdate(); 
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
                    {currentFolder ? currentFolder : "Master Library"}
                    </h2>
                    
                    {/* ✅ Ẩn nút Edit Folder nếu không có quyền */}
                    {currentFolder && allowAdd && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors outline-none">
                                    <Settings className="w-5 h-5" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="bg-zinc-900 border border-zinc-800 text-white p-1 shadow-xl z-50">
                                <DropdownMenuItem onClick={openEditModal} className="focus:bg-zinc-800 focus:text-white cursor-pointer py-2 px-3 rounded-md">
                                    <Pencil className="w-4 h-4 mr-2 text-zinc-400" /> Edit Folder
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-zinc-800"/>
                                <DropdownMenuItem onClick={() => {
                                    if(confirm(`Are you sure you want to delete folder "${currentFolder}"?`)) onDeleteFolder(currentFolder);
                                }} className="focus:bg-red-950/30 text-red-500 focus:text-red-400 cursor-pointer py-2 px-3 rounded-md">
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete Folder
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
              </div>
              <p className="text-zinc-400 mb-6 text-base max-w-xl">
                {currentFolder 
                    ? (totalWords > 0 ? `This folder contains ${displayGroups.length} groups. Total ${totalWords} words.` : "This folder is empty.")
                    : `Your complete collection of ${totalWords} words.`
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
                <Button size="lg" onClick={onStartLearn} className={cn("w-full md:w-64 h-14 text-lg font-bold shadow-lg transition-all hover:scale-105 rounded-2xl border-none", currentTheme.button)}>
                    <PlayCircle className="w-6 h-6 mr-2 fill-current" /> {learnedCount > 0 && learnedCount < totalWords ? "Continue Learning" : "Start Learning"}
                </Button>
                {learnedCount > 0 && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { 
                            if(confirm("Are you sure you want to reset all progress for this section?")) {
                                onResetLearn(); 
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
               {searchResults.map((word: any) => (
                 <div key={word.id} className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800/80 transition shadow-sm">
                    <div className="min-w-0 pr-4">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-bold text-lg text-white">{word.english}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 font-medium">{word.group}</span>
                        </div>
                        <p className="text-sm text-zinc-400 truncate font-medium">{word.definition}</p>
                    </div>
                    {/* ✅ Ẩn nút xóa kết quả search nếu không có quyền */}
                    {allowAdd && (
                        <Button variant="ghost" size="icon" onClick={() => { onDeleteWordResult(word.id); if(onUpdate) onUpdate(); }} className="text-zinc-500 hover:text-red-400 hover:bg-red-950/20"><Trash2 className="w-5 h-5"/></Button>
                    )}
                 </div>
               ))}
             </div>
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
                                <span className={cn("text-base font-bold max-w-[150px] truncate", currentFolder ? "text-white" : "text-white")}>{currentFolder || "All Groups"}</span>
                                <ChevronDown className="w-4 h-4 text-zinc-500" />
                            </div>
                        </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64 p-2 bg-neutral-900 border border-zinc-800 text-zinc-300 shadow-2xl z-50">
                    <DropdownMenuItem onClick={() => onSelectFolder(null)} className="cursor-pointer py-2.5 px-3 rounded-lg focus:bg-zinc-800 focus:text-white">
                      <Folder className="w-4 h-4 mr-3 text-zinc-500" /> <span className="font-medium">All Groups</span> {!currentFolder && <Check className="w-4 h-4 ml-auto text-white"/>}
                    </DropdownMenuItem>
                    <div className="h-px bg-zinc-800 my-1" />
                    {folders.map(f => (
                      <DropdownMenuItem key={f} onClick={() => onSelectFolder(f)} className="cursor-pointer py-2.5 px-3 rounded-lg focus:bg-zinc-800 focus:text-white">
                        <FolderOpen className={cn("w-4 h-4 mr-3", folderColors[f] ? COLORS.find(c=>c.id===folderColors[f])?.style.folderText : "text-zinc-400")} /> 
                        <span className="font-medium">{f}</span> {currentFolder === f && <Check className="w-4 h-4 ml-auto text-white"/>}
                      </DropdownMenuItem>
                    ))}
                    <div className="h-px bg-zinc-800 my-1" />
                    {}
                    {allowAdd && (
                        <DropdownMenuItem onClick={openCreateModal} className="cursor-pointer py-2.5 px-3 rounded-lg text-white focus:bg-zinc-800 font-bold">
                        <Plus className="w-4 h-4 mr-3" /> <span className="font-bold">New Folder</span>
                        </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                <div className="flex items-center bg-zinc-900 p-1 rounded-lg border border-zinc-800 shadow-sm shrink-0">
                  <Button variant="ghost" size="sm" className="h-8 px-3 rounded text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={() => onSort('date')}>Calendar</Button>
                  <Button variant="ghost" size="sm" className="h-8 px-3 rounded text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={() => onSort('size')}>Size</Button>
                  <Button variant="ghost" size="sm" className="h-8 px-3 rounded text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={() => onSort('name')}>Name</Button>
                </div>
                {/* ✅ Ẩn nút New Group ở toolbar nếu không có quyền */}
                {allowAdd && (
                    <Button onClick={onAddGroup} className="shrink-0 h-10 px-4 rounded-xl font-bold bg-violet-600 hover:bg-violet-700 text-white border-none"><Plus className="w-5 h-5 mr-1.5"/> New Group</Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4 duration-500">
              {displayGroups.map((g: any) => {
                const cardFolder = g.folder;
                const cardColor = cardFolder && folderColors[cardFolder] ? folderColors[cardFolder] : null;
                const cardTheme = cardColor ? COLORS.find(c => c.id === cardColor)?.style : null;

                return (
                <Card key={g.name} 
                      className={cn(
                        "group relative p-5 flex flex-col justify-between border-2 transition-all cursor-pointer min-h-[11rem] rounded-2xl shadow-sm",
                        cardFolder && cardTheme 
                            ? `${cardTheme.cardBorder} ${cardTheme.cardBg} ${cardTheme.cardHover}` 
                            : "border-zinc-800 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800/80"
                      )}
                      onClick={() => onSelectGroup(g.name)}
                >
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-3">
                        <div className={cn("p-2 rounded-lg border mb-3 transition-colors", cardFolder && cardTheme ? `${cardTheme.iconBox} border-transparent` : "bg-zinc-800 border-zinc-700 text-zinc-400")}>
                            <Folder className="w-5 h-5" />
                        </div>
                        {/* ✅ Ẩn menu thao tác nhóm nếu không có quyền */}
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
                                    <DropdownMenuItem onSelect={() => { onDeleteGroup(g.name); if(onUpdate) onUpdate(); }} className="rounded-md text-red-500 focus:bg-red-950/20 focus:text-red-400 py-2 px-2 cursor-pointer">
                                        <Trash2 className="w-4 h-4 mr-2" /> Delete Group
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        )}
                    </div>
                    <h3 className={cn("text-lg font-bold w-full transition-colors line-clamp-2", cardFolder && cardTheme ? "text-white" : "text-white group-hover:text-zinc-300")} title={g.name}>{g.name}</h3>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                      <span className={cn("text-xs font-semibold shrink-0", cardFolder && cardTheme ? cardTheme.folderText : "text-zinc-500")}>{g.count} words</span>
                      {!currentFolder && g.folder && (
                        <span className={cn("text-[10px] px-2 py-1 rounded border font-medium max-w-[60%] truncate flex items-center gap-1 ml-2", cardFolder && cardTheme ? `bg-black/20 border-white/10 ${cardTheme.folderText}` : "bg-zinc-950 border-zinc-800 text-zinc-400")}>
                          <Folder className="w-3 h-3 shrink-0"/> <span className="truncate">{g.folder}</span>
                        </span>
                      )}
                  </div>
                </Card>
              )})}
              
              {/* ✅ Ẩn nút tạo nhóm ở cuối Grid nếu không có quyền */}
              {allowAdd && (
                  <div className="border-2 border-dashed border-zinc-800 bg-zinc-900/30 rounded-2xl flex flex-col items-center justify-center min-h-[11rem] cursor-pointer hover:bg-zinc-900 transition-all text-zinc-600 hover:text-white hover:border-zinc-700" onClick={onAddGroup}>
                    <Plus className="w-8 h-8 mb-2 opacity-50" />
                    <span className="font-bold text-sm">Add Group</span>
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
                        <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800 transition-colors text-left group" onClick={() => { onMoveGroup(groupToMove, ""); setGroupToMove(null); }}>
                            <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400 group-hover:text-white group-hover:bg-zinc-700 transition-colors"><Folder className="w-5 h-5"/></div>
                            <span className="font-medium text-zinc-300 group-hover:text-white">Unsorted (No Folder)</span>
                        </button>
                        <div className="h-px bg-zinc-800 my-2 mx-3"></div>
                        <div className="space-y-1">
                            {folders.map(f => {
                                const fColor = folderColors[f];
                                const fStyle = fColor ? COLORS.find(c => c.id === fColor)?.style : null;
                                return (
                                <button key={f} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800 transition-colors text-left group" onClick={() => { onMoveGroup(groupToMove, f); setGroupToMove(null); }}>
                                    <div className={cn("p-2 rounded-lg transition-all", fStyle ? fStyle.iconBox : "bg-zinc-800 text-zinc-400")}><FolderOpen className="w-5 h-5"/></div>
                                    <span className="font-medium text-zinc-300 group-hover:text-white">{f}</span>
                                </button>
                            )})}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL TẠO/SỬA FOLDER */}
        {isModalOpen && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsModalOpen(false)}>
                <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                    <h3 className="text-xl font-bold text-white mb-4">{modalMode === 'create' ? "Create New Folder" : "Edit Folder"}</h3>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Folder Name</label>
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
                                {modalMode === 'create' ? (groupToMove ? "Create & Move" : "Create") : "Save Changes"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}