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

class VocabularyDB extends Dexie {
  words!: Table<Word>;
  learned!: Table<LearnedWord>;

  constructor() {
    super("VocabularyDatabase");

    this.version(4).stores({
      words: "id, english, definition, type, group",
      learned: "id",
    });
  }
}

export const db = new VocabularyDB();
