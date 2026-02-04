const mongoose = require('mongoose');

// 1. User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    createdAt: { type: Date, default: Date.now }
});

// 2. Vocabulary Schema (Cá nhân)
const vocabSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    english: { type: String, required: true },
    definition: { type: String, required: true },
    type: [String],
    example: String,
    group: { type: String, default: 'Uncategorized' },
    learned: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// 3. System Vocabulary Schema (Hệ thống)
const systemVocabSchema = new mongoose.Schema({
    english: { type: String, required: true },
    definition: { type: String, required: true },
    type: [String],
    example: String,
    group: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// 4. Folder Schema
const folderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    color: { type: String, default: '#3b82f6' }
});

// 5. Group Setting Schema (✅ NẰM Ở ĐÂY LÀ ĐÚNG)
const groupSettingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    groupName: { type: String, required: true },
    folder: { type: String, default: '' },
    // ✅ Có trường này để phân biệt nhóm hệ thống
    isGlobal: { type: Boolean, default: false } 
});
const userProgressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    wordId: { type: mongoose.Schema.Types.ObjectId, ref: 'SystemVocabulary', required: true },
    learned: { type: Boolean, default: true },
    updatedAt: { type: Date, default: Date.now }
});
// Đánh index để tìm nhanh và tránh trùng lặp
userProgressSchema.index({ userId: 1, wordId: 1 }, { unique: true });

module.exports = {
    User: mongoose.model('User', userSchema),
    Vocabulary: mongoose.model('Vocabulary', vocabSchema),
    SystemVocabulary: mongoose.model('SystemVocabulary', systemVocabSchema),
    Folder: mongoose.model('Folder', folderSchema),
    GroupSetting: mongoose.model('GroupSetting', groupSettingSchema),
    UserProgress: mongoose.model('UserProgress', userProgressSchema),
};