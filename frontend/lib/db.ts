import Dexie, { Table } from "dexie";

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

export interface Folder {
  name: string;
  color: string;
  createdAt: number;
}

class VocabularyDB extends Dexie {
  words!: Table<Word>;
  learned!: Table<LearnedWord>;
  groupSettings!: Table<GroupSetting>;
  folders!: Table<Folder>;

  constructor() {
    super("VocabularyDatabase");

    // Nâng lên version 12 để ép cập nhật bảng folders
    this.version(12).stores({
      words: "id, english, definition, type, group",
      learned: "id",
      groupSettings: "groupName, folder",
      folders: "name, color, createdAt"
    });
  }
}

export const db = new VocabularyDB();