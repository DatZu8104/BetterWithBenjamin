const mongoose = require('mongoose');

// 1. User Schema 
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    createdAt: { type: Date, default: Date.now }
});

// 2. Vocabulary Schema 
const vocabSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    english: { type: String, required: true },
    definition: { type: String, required: true },
    type: [String],
    example: String,
    ipa: { type: String },
    group: { type: String, default: 'Uncategorized' },
    learned: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// 3. System Vocabulary Schema (Oxford)
const definitionSchema = new mongoose.Schema({
    order: Number,
    label: String,          
    definition: { type: String, required: true },
    examples: [String]      
}, { _id: false });

const systemVocabSchema = new mongoose.Schema({
    word: { type: String, required: true, index: true }, 
    type: String,           
    level: String,          
    phonetics: {
        us: String,
        uk: String
    },
    audio: {
        us: String,
        uk: String
    },
    definitions: [definitionSchema], 
    href: String,           
    group: { type: String, required: true }, 
    createdAt: { type: Date, default: Date.now }
});

// 4. Folder Schema
const folderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    color: { type: String, default: '#3b82f6' },
    isGlobal: { type: Boolean, default: false }, 
    createdAt: { type: Date, default: Date.now }
});

// 5. Group Setting Schema
const groupSettingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    groupName: { type: String, required: true },
    folder: { type: String, default: '' },
    isGlobal: { type: Boolean, default: false } 
});

// 6. User Progress 
const userProgressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    wordId: { type: mongoose.Schema.Types.ObjectId, ref: 'SystemVocabulary', required: true },
    learned: { type: Boolean, default: true },
    updatedAt: { type: Date, default: Date.now }
});
userProgressSchema.index({ userId: 1, wordId: 1 }, { unique: true });

// 7. SavedWord Schema
const savedWordSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', required: true },
    wordId: { type: mongoose.Schema.Types.ObjectId, ref: 'SystemVocabulary', required: true },
    isMastered: { type: Boolean, default: false }, 
    addedAt: { type: Date, default: Date.now }
});
savedWordSchema.index({ userId: 1, folderId: 1, wordId: 1 }, { unique: true });

module.exports = {
    User: mongoose.model('User', userSchema),
    Vocabulary: mongoose.model('Vocabulary', vocabSchema),
    SystemVocabulary: mongoose.model('SystemVocabulary', systemVocabSchema),
    Folder: mongoose.model('Folder', folderSchema),
    GroupSetting: mongoose.model('GroupSetting', groupSettingSchema),
    UserProgress: mongoose.model('UserProgress', userProgressSchema),
    SavedWord: mongoose.model('SavedWord', savedWordSchema), 
};