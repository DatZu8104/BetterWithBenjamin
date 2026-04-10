"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Save, X, ArrowLeft, Search, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface GroupEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderId: string;
  folderName: string;
  words: any[]; 
  onRefreshData: () => void;
}

export function GroupEditModal({ isOpen, onClose, folderId, folderName, words, onRefreshData }: GroupEditModalProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newFolderName, setNewFolderName] = useState(folderName);
  const [searchTerm, setSearchTerm] = useState("");

  const [visibleCount, setVisibleCount] = useState(50);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setNewFolderName(folderName);
      setIsEditingName(false);
      setSearchTerm("");
      setVisibleCount(50);
    }
  }, [isOpen, folderName]);

  useEffect(() => {
    setVisibleCount(50);
  }, [searchTerm]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 50);
        }
      },
      { rootMargin: "200px" }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleSaveFolderName = async () => {
    if (!newFolderName.trim() || newFolderName === folderName) {
      setIsEditingName(false);
      return;
    }
    try {
      await api.renameFolder(folderId, newFolderName);
      onRefreshData();
      setIsEditingName(false);
    } catch (error) {
      alert("Lỗi khi đổi tên thư mục!");
    }
  };

  const handleRemoveWord = async (savedWordId: string) => {
    if (!confirm("Remove this word from the current directory?")) return;
    try {
      await api.removeWordFromFolder(savedWordId); 
      onRefreshData();
    } catch (error) {
      alert("Error when withdrawing vocabulary! Make sure the server is running.");
    }
  };

  const filteredWords = words.filter((word) => {
    const displayWord = word.wordId?.word || word.word || word.english || "";
    const displayDef = word.wordId?.definition || word.definition || (word.wordId?.definitions?.[0]?.definition) || "";
    const lowerSearch = searchTerm.toLowerCase();
    
    return displayWord.toLowerCase().includes(lowerSearch) || 
           displayDef.toLowerCase().includes(lowerSearch);
  });

  const displayedWords = filteredWords.slice(0, visibleCount);

  return (
    <>
      {/* LỚP PHỦ LÀM TỐI TOÀN BỘ MÀN HÌNH BÊN DƯỚI */}
      {isOpen && (
        <div className="fixed inset-0 z-[10001] bg-black/85 backdrop-blur-sm pointer-events-none transition-all duration-300" />
      )}

      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="!max-w-[95vw] md:!max-w-[60vw] !w-full h-[95vh] md:h-[90vh] flex flex-col p-0 gap-0 bg-zinc-950 text-zinc-100 border-zinc-800 shadow-2xl overflow-hidden z-[10002]">
          
          {/* HEADER */}
          <DialogHeader className="shrink-0 border-b border-zinc-800 bg-black px-6 py-3 z-20 flex flex-col gap-1">
            <Button 
              variant="ghost" 
              onClick={onClose} 
              className="w-fit -ml-3 h-8 mb-1 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Return
            </Button>

            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3 w-full md:w-auto pr-4">
                {isEditingName ? (
                  <>
                    <Input 
                      value={newFolderName} 
                      onChange={(e) => setNewFolderName(e.target.value)}
                      className="h-10 bg-zinc-900 border-zinc-700 text-white font-bold text-xl w-full max-w-sm focus-visible:ring-blue-500"
                      autoFocus
                    />
                    <Button size="icon" onClick={handleSaveFolderName} className="bg-blue-600 hover:bg-blue-500 text-white shrink-0">
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" onClick={() => { setIsEditingName(false); setNewFolderName(folderName); }} className="text-zinc-400 hover:text-white shrink-0">
                      Hủy
                    </Button>
                  </>
                ) : (
                  <>
                    <DialogTitle className="text-2xl md:text-3xl font-black text-white truncate">
                      {folderName}
                    </DialogTitle>
                    <Button variant="ghost" size="icon" onClick={() => setIsEditingName(true)} className="text-zinc-500 hover:text-blue-400 shrink-0">
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>

              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest hidden sm:block shrink-0 text-right">
                Manage Personal Folders
              </span>
            </div>
          </DialogHeader>

          {/* BODY */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-zinc-950/50 flex flex-col">
            
            <div className="mb-6 flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input 
                  placeholder="Search for vocabulary or definitions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-zinc-900 border-zinc-800 text-white w-full rounded-xl focus-visible:ring-blue-500"
                />
              </div>
              
              <p className="text-sm font-medium text-zinc-400">
                Showing: <span className="text-blue-400 font-bold">{displayedWords.length}</span> / {filteredWords.length} vocabulary
              </p>
            </div>

            {/* DANH SÁCH TỪ VỰNG */}
            {words.length === 0 ? (
              <div className="text-center py-20 text-zinc-500 flex-1 flex flex-col items-center justify-center">
                <p>This folder is currently empty.</p>
              </div>
            ) : filteredWords.length === 0 ? (
              <div className="text-center py-10 text-zinc-500">
                <p>No vocabulary found matching "{searchTerm}".</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* 🚀 MỚI: Chỉ render mảng displayedWords đã được cắt */}
                {displayedWords.map((word) => {
                  const savedWordId = word._id; 
                  const displayWord = word.wordId?.word || word.word || word.english;
                  const displayType = word.wordId?.type || word.type;
                  const displayDef = word.wordId?.definition || word.definition || (word.wordId?.definitions?.[0]?.definition);

                  return (
                    <div 
                      key={savedWordId} 
                      className="flex flex-row items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800/60 hover:bg-zinc-800 hover:border-zinc-700 transition-all group shadow-sm"
                    >
                      <div className="flex flex-col flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-white text-lg truncate">
                            {displayWord} 
                          </span>
                          {displayType && (
                            <span className="text-[10px] font-bold text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 uppercase tracking-widest shrink-0">
                              {Array.isArray(displayType) ? displayType.join(', ') : displayType}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-400 truncate w-full">
                          {displayDef}
                        </p>
                      </div>

                      <div className="shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Remove from directory"
                          onClick={() => handleRemoveWord(savedWordId)} 
                          className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 h-10 w-10 rounded-full"
                        >
                          <X className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {/* 🚀 MỚI: Thẻ Observer nằm cuối danh sách để kích hoạt load thêm */}
                {visibleCount < filteredWords.length && (
                  <div ref={loaderRef} className="w-full h-16 flex items-center justify-center mt-4">
                    <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
                  </div>
                )}

              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}