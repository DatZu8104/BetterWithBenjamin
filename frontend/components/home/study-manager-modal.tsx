"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { FolderOpen, PlayCircle, Lock, ChevronRight, ArrowLeft, Library, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api"; // 🚀 TÍCH HỢP BỘ TỔNG HỢP API

interface StudyManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemWords: any[]; 
  onStartLearn: (folderName: string, wordsToLearn: any[]) => void; 
}

export function StudyManagerModal({ isOpen, onClose, systemWords, onStartLearn }: StudyManagerModalProps) {
  const [activeTab, setActiveTab] = useState<"existing" | "system">("system");
  const [selectedSystemGroup, setSelectedSystemGroup] = useState<string | null>(null);
  
  const [userFolders, setUserFolders] = useState<any[]>([]); 
  const [savedWordIds, setSavedWordIds] = useState<string[]>([]); 
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Gom nhóm từ hệ thống
  const systemGroups = useMemo(() => {
    const groupsMap = new Map<string, number>();
    systemWords.forEach(w => {
      const groupName = w.group || w.level || "Chưa phân loại";
      groupsMap.set(groupName, (groupsMap.get(groupName) || 0) + 1);
    });
    return Array.from(groupsMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [systemWords]);

  const wordsInSelectedGroup = useMemo(() => {
    if (!selectedSystemGroup) return [];
    return systemWords.filter(w => (w.group || w.level || "Chưa phân loại") === selectedSystemGroup);
  }, [systemWords, selectedSystemGroup]);

  // FETCH DATA MỖI KHI MỞ MODAL
  useEffect(() => {
    if (isOpen) {
      fetchUserFolders();
      fetchSavedWordIds();
      setActiveTab("system");
      setSelectedSystemGroup(null);
      setSelectedWordIds([]);
      setNewFolderName("");
    }
  }, [isOpen]);

  const fetchUserFolders = async () => {
    try {
      const data = await api.getFoldersList();
      setUserFolders(data);
    } catch (err) {
      console.error("Lỗi tải folders", err);
    }
  };

  const fetchSavedWordIds = async () => {
    try {
      const data = await api.getSavedWordIds();
      setSavedWordIds(data.map((item: any) => item.wordId));
    } catch (err) {
      console.error("Lỗi tải ID từ đã add", err);
    }
  };

  // ACTIONS XỬ LÝ
  const handleLearnExistingFolder = async (folder: any) => {
    setIsLoading(true);
    try {
      const data = await api.getFolderDetail(folder._id);
      
      // 🚀 BƯỚC ÉP PHẲNG: Chuẩn hóa dữ liệu để Flashcard đọc được
      const formattedWords = data.savedWords
        .filter((sw: any) => sw && sw.wordId)
        .map((sw: any) => {
          const w = sw.wordId;
          return {
            ...w, 
            savedWordId: sw._id,
            isMastered: sw.isMastered,
            // Ép các trường quan trọng ra ngoài cùng cho Flashcard:
            english: w.word || w.english || "",
            word: w.word || w.english || "",
            definition: w.definition || (w.definitions && w.definitions[0]?.definition) || "",
            example: w.example || (w.definitions && w.definitions[0]?.examples?.[0]) || "",
            ipa: w.ipa || w.phonetics?.us || w.phonetics?.uk || "",
            type: w.type || ""
          };
        });

      onStartLearn(folder.name, formattedWords);
      onClose();
    } catch (err) {
      console.error("Lỗi khi tải chi tiết folder cũ", err);
      alert("Không thể tải chi tiết thư mục này.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFolder = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Ngăn click nhầm vào nút học
    if (!confirm("Bạn có chắc chắn muốn xóa thư mục này?")) return;
    try {
      // 1. Gọi API xóa thư mục (Backend sẽ tự động xóa các từ bên trong)
      await api.deleteFolderById(id);
      
      // 2. Tải lại danh sách thư mục mới
      fetchUserFolders(); 
      
      // 🚀 3. BỔ SUNG: Tải lại danh sách các ID từ vựng đã bị khóa
      fetchSavedWordIds(); 
      
    } catch (err) {
      console.error("Lỗi xóa folder", err);
      alert("Xóa thư mục thất bại.");
    }
  };

  const handleToggleWord = (wordId: string) => {
    setSelectedWordIds(prev => 
      prev.includes(wordId) ? prev.filter(id => id !== wordId) : [...prev, wordId]
    );
  };

  // LUỒNG TẠO FOLDER VÀ HỌC NGAY
  const handleCreateAndLearn = async () => {
    if (!newFolderName.trim() || selectedWordIds.length === 0) return;
    setIsLoading(true);

    try {
      const newFolder = await api.createFolderAndGetId(newFolderName);
      const folderId = newFolder._id;

      await api.addWordsToFolder(folderId, selectedWordIds);
      const detailData = await api.getFolderDetail(folderId);
      fetchUserFolders();

      // 🚀 BƯỚC ÉP PHẲNG (Tương tự ở trên)
      const formattedWords = detailData.savedWords
        .filter((sw: any) => sw && sw.wordId)
        .map((sw: any) => {
          const w = sw.wordId;
          return {
            ...w,
            savedWordId: sw._id,
            isMastered: sw.isMastered,
            english: w.word || w.english || "",
            word: w.word || w.english || "",
            definition: w.definition || (w.definitions && w.definitions[0]?.definition) || "",
            example: w.example || (w.definitions && w.definitions[0]?.examples?.[0]) || "",
            ipa: w.ipa || w.phonetics?.us || w.phonetics?.uk || "",
            type: w.type || ""
          };
        });

      onStartLearn(newFolder.name, formattedWords);
      onClose();
    } catch (err) {
      console.error("Lỗi khi tạo và học:", err);
      alert("Đã xảy ra lỗi khi tạo thư mục. Vui lòng thử lại!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!max-w-[95vw] md:!max-w-[85vw] !w-full h-[90vh] md:h-[85vh] flex flex-col p-0 gap-0 bg-black text-zinc-100 border-zinc-800 shadow-2xl overflow-hidden z-[10000]">
        
        <DialogHeader className="shrink-0 border-b border-zinc-800 bg-zinc-950 px-6 pt-6 z-20">
          <DialogTitle className="text-2xl font-black tracking-tight text-white mb-4">
             Quản lý Lộ trình Học tập
          </DialogTitle>
          <div className="flex gap-8">
            <button 
              onClick={() => setActiveTab("system")}
              className={cn("pb-4 font-bold text-sm transition-all border-b-2 flex items-center gap-2", activeTab === "system" ? "border-blue-500 text-blue-400" : "border-transparent text-zinc-500 hover:text-zinc-300")}
            >
              <Library className="w-4 h-4" /> Kho từ vựng Oxford
            </button>
            <button 
              onClick={() => setActiveTab("existing")}
              className={cn("pb-4 font-bold text-sm transition-all border-b-2 flex items-center gap-2", activeTab === "existing" ? "border-blue-500 text-blue-400" : "border-transparent text-zinc-500 hover:text-zinc-300")}
            >
              <FolderOpen className="w-4 h-4" /> Thư mục của bạn
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-zinc-950/50 flex flex-col relative">
          
          {/* TAB THƯ MỤC CŨ */}
          {activeTab === "existing" && (
            <div className="absolute inset-0 overflow-y-auto p-6 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userFolders.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-zinc-500">
                    Bạn chưa có thư mục nào. Hãy sang Tab Kho từ vựng để tạo bài học nhé!
                  </div>
                ) : (
                  userFolders.map((folder) => (
                    <div 
                      key={folder._id} 
                      className="group bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-blue-600 hover:bg-blue-950/20 transition-all flex items-center justify-between"
                    >
                      <div 
                        className="flex-1 min-w-0 pr-4 cursor-pointer"
                        onClick={() => handleLearnExistingFolder(folder)}
                      >
                        <h3 className="font-bold text-base text-white truncate group-hover:text-blue-400">{folder.name}</h3>
                        <p className="text-xs text-zinc-500 mt-1">Tạo: {new Date(folder.createdAt).toLocaleDateString()}</p>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => handleDeleteFolder(e, folder._id)}
                          className="text-zinc-500 hover:text-red-500 hover:bg-red-500/10 h-8 w-8 rounded-full"
                          title="Xóa thư mục"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <PlayCircle 
                          onClick={() => handleLearnExistingFolder(folder)}
                          className="w-8 h-8 text-zinc-700 group-hover:text-blue-500 cursor-pointer" 
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB KHO OXFORD */}
          {activeTab === "system" && (
            <div className="absolute inset-0 flex flex-col p-6 overflow-hidden">
              {!selectedSystemGroup ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                    {systemGroups.map(group => (
                      <button
                        key={group.name}
                        onClick={() => setSelectedSystemGroup(group.name)}
                        className="flex flex-col items-center justify-center p-6 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-blue-950/30 hover:border-blue-900/50 transition-all group shadow-sm"
                      >
                        <FolderOpen className="w-12 h-12 text-zinc-600 group-hover:text-blue-500 mb-4 group-hover:scale-110 transition-transform" />
                        <span className="font-extrabold text-lg text-white group-hover:text-blue-400 mb-1">{group.name.toUpperCase()}</span>
                        <span className="text-xs font-semibold text-zinc-500 bg-zinc-950 px-3 py-1 rounded-full">{group.count} từ vựng</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="shrink-0 p-4 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedSystemGroup(null)} className="h-8 px-2 text-zinc-400 hover:text-white hover:bg-zinc-800">
                        <ArrowLeft className="w-4 h-4 mr-1"/> Trở về
                      </Button>
                      <div className="h-4 w-px bg-zinc-700"></div>
                      <span className="font-bold text-white text-lg">{selectedSystemGroup.toUpperCase()}</span>
                    </div>
                    <span className="text-xs font-bold bg-blue-600 text-white px-3 py-1 rounded-md shadow-md">
                      Đã chọn: {selectedWordIds.length} từ
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                    {wordsInSelectedGroup.map((word) => {
                      const wordId = word._id || word.id;
                      const isAlreadySaved = savedWordIds.includes(wordId);
                      const isSelected = selectedWordIds.includes(wordId);

                      return (
                        <div 
                          key={wordId} 
                          onClick={() => !isAlreadySaved && handleToggleWord(wordId)}
                          className={cn(
                            "flex items-center p-4 mb-2 rounded-xl border transition-all cursor-pointer",
                            isAlreadySaved 
                              ? "bg-black/30 border-transparent opacity-50 cursor-not-allowed grayscale" 
                              : isSelected
                                ? "bg-blue-950/40 border-blue-600/50" 
                                : "bg-zinc-900 border-zinc-800/60 hover:bg-zinc-800 hover:border-zinc-700"
                          )}
                        >
                          <div className="mr-5 shrink-0">
                            {isAlreadySaved ? (
                              <Lock className="w-5 h-5 text-zinc-600" />
                            ) : (
                              <Checkbox checked={isSelected} className={cn("w-6 h-6 rounded", isSelected && "bg-blue-600 border-blue-600")} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-white text-base md:text-lg flex items-center gap-3">
                              {word.word || word.english} 
                              <span className="text-[10px] md:text-xs font-bold text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded-md border border-zinc-800 uppercase tracking-widest">
                                {Array.isArray(word.type) ? word.type.join(', ') : word.type}
                              </span>
                            </p>
                            <p className="text-sm text-zinc-400 mt-1 truncate max-w-[80%]">
                              {word.definition || (word.definitions && word.definitions[0]?.definition)}
                            </p>
                          </div>
                          {isAlreadySaved && (
                            <span className="text-[10px] font-bold text-zinc-500 bg-zinc-950 px-2 py-1 rounded border border-zinc-800 ml-2 shrink-0">
                              ĐÃ THÊM
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER TẠO THƯ MỤC */}
        {activeTab === "system" && selectedSystemGroup && selectedWordIds.length > 0 && (
          <div className="shrink-0 border-t border-zinc-800 p-5 bg-zinc-950 flex flex-col md:flex-row gap-4 items-center justify-between z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.6)] animate-in slide-in-from-bottom-5">
            <div className="w-full md:w-1/2 flex items-center gap-3">
               <div className="p-2 bg-blue-900/30 rounded-lg text-blue-500 hidden md:block"><FolderOpen className="w-5 h-5"/></div>
               <Input 
                 placeholder="Tên thư mục lưu trữ (VD: Học ngày 1)..." 
                 value={newFolderName}
                 onChange={(e) => setNewFolderName(e.target.value)}
                 className="h-12 bg-black border-zinc-800 focus-visible:ring-blue-500 text-white rounded-xl w-full"
               />
            </div>
            
            <Button 
              disabled={isLoading || !newFolderName.trim()}
              onClick={handleCreateAndLearn}
              className="w-full md:w-auto bg-white text-black hover:bg-zinc-200 font-bold h-12 px-8 rounded-xl text-base transition-transform active:scale-95"
            >
              {isLoading ? "Đang xử lý..." : "Tạo Thư mục & Học ngay"} <PlayCircle className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}