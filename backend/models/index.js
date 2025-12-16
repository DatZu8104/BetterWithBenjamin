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
    group: { type: String, default: 'Uncategorized' },
    learned: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// 3. Folder & Group Schema
const folderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    color: { type: String, default: '#3b82f6' }
});

const groupSettingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    groupName: { type: String, required: true },
    folder: { type: String, default: '' }
});

module.exports = {
    User: mongoose.model('User', userSchema),
    Vocabulary: mongoose.model('Vocabulary', vocabSchema),
    Folder: mongoose.model('Folder', folderSchema),
    GroupSetting: mongoose.model('GroupSetting', groupSettingSchema)
};