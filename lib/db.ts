import Dexie, { Table } from "dexie";

// ... (Giữ nguyên các interface Word, LearnedWord, GroupSetting)
export interface Word {
  id: string;
  english: string;
  definition: string;
  type: string[];
  group: string;
}

export interface LearnedWord {
  id: string;
}

export interface GroupSetting {
  groupName: string;
  folder: string;
}

// CẬP NHẬT: Thêm trường color
export interface Folder {
  name: string;
  color: string; // "blue", "red", "green", etc.
  createdAt: number;
}

class VocabularyDB extends Dexie {
  words!: Table<Word>;
  learned!: Table<LearnedWord>;
  groupSettings!: Table<GroupSetting>;
  folders!: Table<Folder>;

  constructor() {
    super("VocabularyDatabase");

    // Nâng version lên 11 để thêm trường color
    this.version(11).stores({
      words: "id, english, definition, type, group",
      learned: "id",
      groupSettings: "groupName, folder",
      folders: "name, color, createdAt" // Schema mới
    });
  }
}

export const db = new VocabularyDB();