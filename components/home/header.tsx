'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; 
import { BookOpen, Download, Upload, Search, X } from 'lucide-react'; 

interface HeaderProps {
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
}

export function Header({ onExport, onImport, onReset, searchTerm, onSearchChange }: HeaderProps) {
  return (
    <header className="h-16 shrink-0 border-b border-zinc-800 flex items-center justify-between px-4 bg-black/80 backdrop-blur z-50 sticky top-0 text-white">
      
      {/* LOGO */}
      <div 
        className="flex items-center gap-2 font-bold text-xl cursor-pointer mr-4 hover:opacity-80 transition-opacity" 
        onClick={onReset}
      >
        <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-lg">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <span className="hidden md:inline">Flashcards</span>
      </div>

      {/* THANH TÌM KIẾM (MÀU TỐI) */}
      <div className="flex-1 max-w-md mx-2 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input 
          placeholder="Tìm từ vựng..." 
          className="pl-9 h-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:bg-zinc-900 focus:border-zinc-600 focus:ring-0 transition-all rounded-full"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchTerm && (
          <button 
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* IMPORT / EXPORT */}
      <div className="flex items-center gap-2 ml-4">
        <Button variant="ghost" size="sm" onClick={onExport} title="Export" className="hidden sm:flex text-zinc-400 hover:text-white hover:bg-zinc-900">
          <Download className="w-4 h-4 sm:mr-2" /> 
          <span className="hidden sm:inline">Export</span>
        </Button>
        <label className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-zinc-200 transition-colors h-9 px-3 bg-white text-black font-bold shadow-sm">
          <Upload className="w-4 h-4 sm:mr-2" /> 
          <span className="hidden sm:inline">Import</span>
          <input 
            type="file" 
            accept="application/json" 
            className="hidden" 
            onChange={onImport} 
          />
        </label>
      </div>
    </header>
  );
}