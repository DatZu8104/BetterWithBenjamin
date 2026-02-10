const mongoose = require('mongoose');

// 1. User Schema (Giữ nguyên)
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    createdAt: { type: Date, default: Date.now }
});

// 2. Vocabulary Schema (Cá nhân - Giữ nguyên cho đơn giản hoặc update tùy ý)
// (Ở đây ta tạm giữ nguyên để không làm hỏng dữ liệu cũ của user)
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

// 3. System Vocabulary Schema (UPDATE LỚN: Cấu trúc Oxford mới)
// Sub-schema cho định nghĩa
const definitionSchema = new mongoose.Schema({
    order: Number,
    label: String,          // Ví dụ: Meaning 1
    definition: { type: String, required: true },
    examples: [String]      // Mảng ví dụ
}, { _id: false });

const systemVocabSchema = new mongoose.Schema({
    word: { type: String, required: true, index: true }, // Thay thế field 'english' cũ
    type: String,           // noun, verb...
    level: String,          // A1, B2...
    phonetics: {
        us: String,
        uk: String
    },
    audio: {
        us: String,
        uk: String
    },
    definitions: [definitionSchema], // Mảng các định nghĩa
    href: String,           // Link gốc
    
    // Field hỗ trợ Group
    group: { type: String, required: true }, 
    createdAt: { type: Date, default: Date.now }
});

// 4. Folder Schema (UPDATE: Thêm isGlobal)
const folderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    color: { type: String, default: '#3b82f6' },
    isGlobal: { type: Boolean, default: false } // ✅ Folder chung cho toàn hệ thống
});

// 5. Group Setting Schema
const groupSettingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    groupName: { type: String, required: true },
    folder: { type: String, default: '' },
    isGlobal: { type: Boolean, default: false } 
});

// 6. User Progress (Giữ nguyên)
const userProgressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    wordId: { type: mongoose.Schema.Types.ObjectId, ref: 'SystemVocabulary', required: true },
    learned: { type: Boolean, default: true },
    updatedAt: { type: Date, default: Date.now }
});
userProgressSchema.index({ userId: 1, wordId: 1 }, { unique: true });

module.exports = {
    User: mongoose.model('User', userSchema),
    Vocabulary: mongoose.model('Vocabulary', vocabSchema),
    SystemVocabulary: mongoose.model('SystemVocabulary', systemVocabSchema),
    Folder: mongoose.model('Folder', folderSchema),
    GroupSetting: mongoose.model('GroupSetting', groupSettingSchema),
    UserProgress: mongoose.model('UserProgress', userProgressSchema),
};