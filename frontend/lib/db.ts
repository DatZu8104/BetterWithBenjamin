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

export interface SystemWord {
  id: string;
  [key: string]: any; 
}

class VocabularyDB extends Dexie {
  words!: Table<Word>;
  learned!: Table<LearnedWord>;
  groupSettings!: Table<GroupSetting>;
  folders!: Table<Folder>;
  systemWords!: Table<SystemWord>; 

  constructor() {
    super("VocabularyDatabase");

    this.version(13).stores({
      words: "id, english, definition, type, group",
      learned: "id",
      groupSettings: "groupName, folder",
      folders: "name, color, createdAt",
      systemWords: "id" 
    });
  }
}

export const db = new VocabularyDB();