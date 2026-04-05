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

// THÊM MỚI: Interface cho từ vựng hệ thống
export interface SystemWord {
  id: string;
  [key: string]: any; // Dùng any để linh hoạt nhận các trường phonetics, audio... từ API
}

class VocabularyDB extends Dexie {
  words!: Table<Word>;
  learned!: Table<LearnedWord>;
  groupSettings!: Table<GroupSetting>;
  folders!: Table<Folder>;
  systemWords!: Table<SystemWord>; // THÊM MỚI: Khai báo bảng systemWords

  constructor() {
    super("VocabularyDatabase");

    // QUAN TRỌNG: Nâng lên version 13 để Dexie tạo thêm bảng mới
    this.version(13).stores({
      words: "id, english, definition, type, group",
      learned: "id",
      groupSettings: "groupName, folder",
      folders: "name, color, createdAt",
      systemWords: "id" // THÊM MỚI: Bảng mới chỉ cần index khóa chính là id
    });
  }
}

export const db = new VocabularyDB();