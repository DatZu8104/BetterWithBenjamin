"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
// 🚀 IMPORT THÊM PENCIL VÀ GROUP EDIT MODAL
import { FolderOpen, PlayCircle, Lock, ChevronRight, ArrowLeft, Library, Trash2, Pencil, ChevronDown, X} from "lucide-react";import { cn } from "@/lib/utils";
import { api } from "@/lib/api"; 
import { GroupEditModal } from "./group-edit-modal"; 
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
interface StudyManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemWords: any[]; 
  onStartLearn: (folderName: string, wordsToLearn: any[]) => void; 
  onRefreshData?: () => void;
}

export function StudyManagerModal({ isOpen, onClose, systemWords, onStartLearn, onRefreshData }: StudyManagerModalProps) {
  const [activeTab, setActiveTab] = useState<"existing" | "system">("system");
  const [selectedSystemGroup, setSelectedSystemGroup] = useState<string | null>(null);
  
  const [userFolders, setUserFolders] = useState<any[]>([]); 
  const [savedWordIds, setSavedWordIds] = useState<Set<string>>(new Set());
  const [folderWordCounts, setFolderWordCounts] = useState<Record<string, number>>({});  
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [quickSelectInputValue, setQuickSelectInputValue] = useState("");
  const [isPending, startTransition] = useTransition();
  // 🚀 STATE QUẢN LÝ MODAL CHỈNH SỬA THƯ MỤC
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFolderData, setEditingFolderData] = useState<{ id: string, name: string } | null>(null);
  const [editingFolderWords, setEditingFolderWords] = useState<any[]>([]);
  const [visibleCount, setVisibleCount] = useState(30);

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

  const availableWords = useMemo(() => {
      return wordsInSelectedGroup.filter(
        (word) => !savedWordIds.has(word._id || word.id)
      );
    }, [wordsInSelectedGroup, savedWordIds]);

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

// 👉 BƯỚC 2.2: Reset lại số lượng hiển thị mỗi khi đổi Tab hoặc Nhóm
  useEffect(() => {
    setVisibleCount(30);
  }, [selectedSystemGroup, activeTab]);

  useEffect(() => {
    if (selectedSystemGroup && availableWords.length > 0) {
      // Đếm xem trong giỏ hàng hiện tại có bao nhiêu từ thuộc về nhóm này
      const countInThisGroup = selectedWordIds.filter(id => 
        availableWords.some((w: any) => (w._id || w.id) === id)
      ).length;
      
      setQuickSelectInputValue(countInThisGroup > 0 ? countInThisGroup.toString() : "");
    }
  }, [selectedSystemGroup, availableWords]);

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
      setSavedWordIds(new Set(data.map((item: any) => item.wordId)));
      
      // 🚀 MỚI: Đếm số lượng từ vựng cho từng thư mục (Dựa vào folderId)
      const counts: Record<string, number> = {};
      data.forEach((item: any) => {
        if (item.folderId) {
          counts[item.folderId] = (counts[item.folderId] || 0) + 1;
        }
      });
      setFolderWordCounts(counts); // Lưu vào State
      
    } catch (err) {
      console.error("Lỗi tải ID từ đã add", err);
    }
  };

  // 🚀 ACTION MỚI: MỞ MODAL SỬA THƯ MỤC
  const handleOpenEditFolder = async (e: React.MouseEvent, folder: any) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      const data = await api.getFolderDetail(folder._id);
      setEditingFolderData({ id: folder._id, name: folder.name });
      setEditingFolderWords(data.savedWords || []);
      setIsEditModalOpen(true);
    } catch (err) {
      alert("Không thể tải chi tiết thư mục để sửa.");
    } finally {
      setIsLoading(false);
    }
  };

  // 🚀 ACTION MỚI: REFRESH DATA SAU KHI SỬA
  const handleRefreshEditModal = async () => {
    fetchUserFolders(); // Cập nhật danh sách bên ngoài
    fetchSavedWordIds(); // Cập nhật trạng thái khóa
    if (onRefreshData) onRefreshData();
    // Cập nhật ngay lập tức danh sách từ vựng bên trong Modal đang mở
    if (editingFolderData) {
      try {
         const data = await api.getFolderDetail(editingFolderData.id);
         setEditingFolderWords(data.savedWords || []);
         
         // Lấy lại tên mới nhất nếu vừa bị đổi
         const newFolders = await api.getFoldersList();
         const updated = newFolders.find((f: any) => f._id === editingFolderData.id);
         if (updated) {
           setEditingFolderData({ id: updated._id, name: updated.name });
         }
      } catch(e) {}
    }
  };

  const handleLearnExistingFolder = async (folder: any) => {
    setIsLoading(true);
    try {
      const data = await api.getFolderDetail(folder._id);
      const formattedWords = data.savedWords
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

      onStartLearn(folder.name, formattedWords);
      onClose();
    } catch (err) {
      alert("Không thể tải chi tiết thư mục này.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFolder = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    if (!confirm("Bạn có chắc chắn muốn xóa thư mục này?")) return;
    try {
      await api.deleteFolderById(id);
      fetchUserFolders(); 
      fetchSavedWordIds(); 
      if (onRefreshData) onRefreshData();
    } catch (err) {
      alert("Xóa thư mục thất bại.");
    }
  };

  const handleToggleWord = (wordId: string) => {
    setSelectedWordIds(prev => 
      prev.includes(wordId) ? prev.filter(id => id !== wordId) : [...prev, wordId]
    );
  };

  // 👉 BƯỚC 3: Hàm "Bộ não" xử lý việc chọn số lượng từ
  const applyWordSelection = (count: number | "ALL") => {
    // 1. Lọc ra những ID đang nằm trong giỏ hàng nhưng THUỘC VỀ CÁC NHÓM KHÁC
    const idsFromOtherGroups = selectedWordIds.filter(
      id => !availableWords.some((w: any) => (w._id || w.id) === id)
    );

    // 2. Nếu chọn 0 -> Chỉ rút các từ của nhóm HIỆN TẠI ra khỏi giỏ
    if (count === 0) {
      setSelectedWordIds(idsFromOtherGroups);
      setQuickSelectInputValue("");
      return;
    }

    // 3. Tính toán số lượng cần lấy cho nhóm HIỆN TẠI
    const targetCount = count === "ALL" ? availableWords.length : Math.min(count, availableWords.length);
    setQuickSelectInputValue(targetCount.toString());

    const wordsToSelect = availableWords.slice(0, targetCount);
    const newSelectedIdsForThisGroup = wordsToSelect.map((w: any) => w._id || w.id);
    
    // 4. Gộp (Merge): Từ của nhóm khác + Từ mới chọn của nhóm này
    setSelectedWordIds([...idsFromOtherGroups, ...newSelectedIdsForThisGroup]);
  };

  // 👉 BƯỚC 4.1: Chỉ cho phép người dùng gõ số
  const handleQuickSelectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d+$/.test(value)) {
      setQuickSelectInputValue(value);
    }
  };

  // 👉 BƯỚC 1.2: Hàm xóa trắng giỏ hàng trên toàn hệ thống
  const handleClearCart = () => {
    setSelectedWordIds([]);
    setQuickSelectInputValue("");
  };

  // 👉 BƯỚC 2.3: Bộ cảm biến cuộn chuột (Tự động Load More)
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // Nếu cuộn cách đáy 100px thì load thêm 30 từ
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      setVisibleCount((prev) => prev + 30);
    }
  };

  // 👉 BƯỚC 4.2: Khi người dùng gõ xong (click chuột ra ngoài) thì áp dụng số đó
  const handleQuickSelectBlur = () => {
    if (!quickSelectInputValue) return; 
    
    const num = parseInt(quickSelectInputValue, 10);
    if (isNaN(num) || num <= 0) {
      applyWordSelection(0); // Nếu gõ số tào lao thì đưa về 0
    } else {
      applyWordSelection(num);
    }
  };

  // 👉 BƯỚC 4.3: Nhấn Enter cũng sẽ áp dụng ngay giống như click ra ngoài
  const handleQuickSelectKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleQuickSelectBlur();
    }
  };

  const handleCreateAndLearn = async () => {
    if (!newFolderName.trim() || selectedWordIds.length === 0) return;
    setIsLoading(true);

    try {
      const newFolder = await api.createFolderAndGetId(newFolderName);
      const folderId = newFolder._id;

      await api.addWordsToFolder(folderId, selectedWordIds);
      const detailData = await api.getFolderDetail(folderId);
      fetchUserFolders();

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
      alert("Đã xảy ra lỗi khi tạo thư mục. Vui lòng thử lại!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="!max-w-[98vw] md:!max-w-[95vw] !w-full h-[95vh] md:h-[92vh] flex flex-col p-0 gap-0 bg-black text-zinc-100 border-zinc-800 shadow-2xl overflow-hidden z-[10000]">
          {/* 🚀 HEADER ĐÃ ĐƯỢC CHỈNH LẠI ĐỂ 2 TAB SONG SONG VỚI TIÊU ĐỀ */}
          {/* 🚀 HEADER ĐÃ ĐƯỢC CHỈNH LẠI ĐỂ 2 TAB SONG SONG VỚI TIÊU ĐỀ */}
          <DialogHeader className="shrink-0 border-b border-zinc-800 bg-zinc-950 px-6 pt-4 md:pt-6 z-20 flex flex-col md:flex-row md:items-end justify-between gap-2 md:gap-4 relative">
            
            <DialogTitle className="text-2xl font-black tracking-tight text-white pb-2 md:pb-4 shrink-0">
               Quản lý Lộ trình Học tập
            </DialogTitle>
            
            {/* Vùng chứa Tabs và Nút X */}
            <div className="flex items-end justify-between md:justify-end gap-4 md:gap-8 w-full md:w-auto">
              
              {/* Cụm Tabs */}
              <div className="flex gap-6 overflow-x-auto custom-scrollbar">
                <button 
                  onClick={() => startTransition(() => setActiveTab("system"))}
                  className={cn("pb-4 font-bold text-sm transition-all border-b-2 flex items-center gap-2 whitespace-nowrap", activeTab === "system" ? "border-blue-500 text-blue-400" : "border-transparent text-zinc-500 hover:text-zinc-300")}
                >
                  <Library className="w-4 h-4" /> Kho từ vựng Oxford
                </button>
                
                <button 
                  onClick={() => startTransition(() => setActiveTab("existing"))}
                  className={cn("pb-4 font-bold text-sm transition-all border-b-2 flex items-center gap-2 whitespace-nowrap", activeTab === "existing" ? "border-blue-500 text-blue-400" : "border-transparent text-zinc-500 hover:text-zinc-300")}
                >
                  <FolderOpen className="w-4 h-4" /> Thư mục của bạn
                </button>
              </div>

              {/* 👉 Nút X để đóng Modal */}
              <button 
                onClick={onClose}
                className="pb-4 text-zinc-500 hover:text-red-400 transition-colors shrink-0 outline-none"
                title="Đóng cửa sổ"
              >
                <X className="w-6 h-6" />
              </button>

            </div>
          </DialogHeader>
          

          <div className={cn("flex-1 min-h-0 bg-zinc-950/50 flex flex-col relative transition-opacity duration-200", isPending && "opacity-50 pointer-events-none")}>
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
                          <h3 className="font-bold text-base text-white truncate group-hover:text-blue-400 mb-2">
                             {folder.name}
                          </h3>
                          {/* 🚀 MỚI: Badge hiển thị Ngày tạo và Số lượng từ */}
                          <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-400">
                             <span className="bg-zinc-950 px-2 py-1 rounded-md border border-zinc-800/80 flex items-center gap-1.5">
                                📅 {folder.createdAt ? new Date(folder.createdAt).toLocaleDateString('vi-VN') : 'Mới đây'}                             </span>
                             <span className="bg-blue-950/30 text-blue-400 px-2 py-1 rounded-md border border-blue-900/30 flex items-center gap-1.5">
                                📦 {folderWordCounts[folder._id] || 0} từ
                             </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          {/* 🚀 NÚT CHỈNH SỬA THƯ MỤC */}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => handleOpenEditFolder(e, folder)}
                            className="text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 h-8 w-8 rounded-full"
                            title="Chỉnh sửa thư mục"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>

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
                            className="w-8 h-8 ml-1 text-zinc-700 group-hover:text-blue-500 cursor-pointer" 
                            title="Học ngay"
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
                          onClick={() => startTransition(() => setSelectedSystemGroup(group.name))}
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
                    {/* 🚀 HEADER MỚI: TÍCH HỢP LUÔN THANH TẠO THƯ MỤC LÊN ĐÂY */}
                    <div className="shrink-0 p-3 md:p-4 border-b border-zinc-800 bg-zinc-950 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 z-10">
                      
                      {/* TRÁI: Nút Back & Tên Nhóm Oxford */}
                      <div className="flex items-center gap-3 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => startTransition(() => setSelectedSystemGroup(null))} className="h-8 px-2 text-zinc-400 hover:text-white hover:bg-zinc-800">
                          <ArrowLeft className="w-4 h-4 mr-1"/> Trở về
                        </Button>
                        <div className="h-4 w-px bg-zinc-700"></div>
                        <span className="font-bold text-white text-base md:text-lg">{selectedSystemGroup.toUpperCase()}</span>
                      </div>

                      {/* PHẢI: Chỉ còn lại Combobox chọn nhanh cho nhóm này */}
                      <div className="flex items-center gap-2 w-full lg:w-auto">
                        
                        {/* 👉 BƯỚC 5.1: COMBOBOX CHỌN NHANH MỚI (Giữ nguyên phần này của bạn) */}
                        <div className="hidden md:flex items-center h-10 bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden shrink-0 shadow-md focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                          <Input
                            value={quickSelectInputValue || (selectedWordIds.length > 0 ? selectedWordIds.length.toString() : "")}
                            onChange={handleQuickSelectChange}
                            onBlur={handleQuickSelectBlur}
                            onKeyDown={handleQuickSelectKeyDown}
                            placeholder="0"
                            className="w-14 h-full border-0 bg-transparent text-center text-sm font-bold text-blue-300 focus-visible:ring-0 px-1 shadow-none"
                          />
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="h-full px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border-l border-zinc-700 transition-colors flex items-center justify-center outline-none">
                                <ChevronDown className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            
                            <DropdownMenuContent align="end" className="w-52 bg-zinc-900 border-zinc-800 text-zinc-200 z-[10005]">
                              <div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Chọn nhanh (Max: {availableWords.length})
                              </div>
                              <DropdownMenuItem onClick={() => applyWordSelection(10)} className="cursor-pointer hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white">
                                ⚡ Chọn 10 từ mới
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => applyWordSelection(20)} className="cursor-pointer hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white">
                                ⚡ Chọn 20 từ mới
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => applyWordSelection(50)} className="cursor-pointer hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white">
                                ⚡ Chọn 50 từ mới
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => applyWordSelection("ALL")} className="cursor-pointer hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white font-bold text-blue-400">
                                ✨ Chọn tất cả ({availableWords.length})
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => applyWordSelection(0)} className="cursor-pointer text-red-400 hover:bg-red-500/20 hover:text-red-300 focus:bg-red-500/20 focus:text-red-300 mt-1 border-t border-zinc-800 pt-2">
                                Bỏ chọn tất cả
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <div className="h-full flex items-center bg-zinc-950 px-3 border-l border-zinc-800 text-xs font-bold text-zinc-500 cursor-default">
                            / {availableWords.length}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* DANH SÁCH TỪ VỰNG DẠNG LƯỚI GỌN GÀNG */}
                    {/* DANH SÁCH TỪ VỰNG DẠNG LƯỚI GỌN GÀNG */}
                    {/* 👉 BƯỚC 2.4: Gắn sự kiện onScroll vào thẻ div có thanh cuộn */}
                    <div 
                      className="flex-1 overflow-y-auto p-4 pb-24 custom-scrollbar"
                      onScroll={handleScroll}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
                        {/* 👉 BƯỚC 2.4: Dùng slice để cắt đúng số lượng cần thiết ra vẽ */}
                        {wordsInSelectedGroup.slice(0, visibleCount).map((word) => {
                          const wordId = word._id || word.id;
                          const isAlreadySaved = savedWordIds.has(wordId);
                          const isSelected = selectedWordIds.includes(wordId);

                          return (
                            <div 
                              key={wordId} 
                              onClick={() => !isAlreadySaved && handleToggleWord(wordId)}
                              className={cn(
                                "flex items-center p-3 rounded-xl border transition-all cursor-pointer shadow-sm group",
                                isAlreadySaved 
                                  ? "bg-black/30 border-transparent opacity-50 cursor-not-allowed grayscale" 
                                  : isSelected
                                    ? "bg-blue-950/40 border-blue-600/50 ring-1 ring-blue-600/50" 
                                    : "bg-zinc-900 border-zinc-800/60 hover:bg-zinc-800 hover:border-zinc-700"
                              )}
                            >
                              <div className="mr-3 shrink-0">
                                {isAlreadySaved ? (
                                  <Lock className="w-4 h-4 text-zinc-600" />
                                ) : (
                                  <Checkbox 
                                    checked={isSelected} 
                                    className={cn("w-5 h-5 rounded transition-transform group-active:scale-95", isSelected && "bg-blue-600 border-blue-600")} 
                                  />
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0 flex flex-col">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="font-bold text-white text-base truncate">
                                    {word.word || word.english} 
                                  </span>
                                  {word.type && (
                                    <span className="text-[9px] font-bold text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 uppercase tracking-widest shrink-0">
                                      {Array.isArray(word.type) ? word.type.join(', ') : word.type}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-zinc-400 truncate w-full">
                                  {word.definition || (word.definitions && word.definitions[0]?.definition)}
                                </p>
                              </div>

                              {isAlreadySaved && (
                                <span className="text-[9px] font-bold text-zinc-600 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800/50 ml-2 shrink-0">
                                  ĐÃ CÓ
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* 👉 GIAI ĐOẠN 3: THANH DOCK GIỎ HÀNG NỔI (LUÔN HIỂN THỊ) */}
          <div className="absolute bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 p-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-4 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            
            {/* TRÁI: Hiển thị tổng số từ & Nút Xóa */}
            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Giỏ từ vựng</span>
                <span className="text-xl md:text-2xl font-black text-blue-400">
                  {selectedWordIds.length} <span className="text-sm font-bold text-zinc-400">từ đã chọn</span>
                </span>
              </div>
              
              <Button 
                variant="ghost" 
                onClick={handleClearCart}
                disabled={selectedWordIds.length === 0}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-10 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Xóa giỏ
              </Button>
            </div>

            {/* PHẢI: Form đặt tên và Nút Tạo */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Input 
                placeholder="Tên thư mục mới (VD: Bài học 1)..." 
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="h-11 bg-black border-zinc-700 focus-visible:ring-blue-500 text-white rounded-xl w-full md:w-64 shadow-inner"
              />
              <Button 
                disabled={isLoading || !newFolderName.trim() || selectedWordIds.length === 0}
                onClick={handleCreateAndLearn}
                className="h-11 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 rounded-xl text-sm shrink-0 transition-transform active:scale-95 shadow-lg shadow-blue-900/20 disabled:opacity-50"
              >
                {isLoading ? "Đang xử lý..." : "Tạo & Học ngay"}
              </Button>
            </div>

          </div>

        </DialogContent>
      </Dialog>

      {/* 🚀 MODAL CHỈNH SỬA THƯ MỤC CÁ NHÂN (RENDER NGOÀI DIALOG CHÍNH) */}
      {editingFolderData && (
        <GroupEditModal 
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          folderId={editingFolderData.id}
          folderName={editingFolderData.name}
          words={editingFolderWords}
          onRefreshData={handleRefreshEditModal}
        />
      )}
    </>
  );
}