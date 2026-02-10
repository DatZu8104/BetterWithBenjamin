const express = require('express');
const router = express.Router();
const { Vocabulary, SystemVocabulary, Folder, GroupSetting, User, UserProgress } = require('../models');
const { verifyToken } = require('../middleware');

const checkAdmin = async (userId) => {
    const user = await User.findById(userId);
    return user && user.role === 'admin';
};

// 1. SYNC DATA (UPDATE: Hỗ trợ cấu trúc mới & Folder hệ thống)
router.get('/sync', verifyToken, async (req, res) => {
    try {
        // A. Lấy từ cá nhân
        const userWords = await Vocabulary.find({ userId: req.userId }).sort({ createdAt: -1 });
        const formattedUserWords = userWords.map(w => ({ ...w.toObject(), isGlobal: false }));

        // B. Lấy từ hệ thống + Tiến độ học
        const systemWords = await SystemVocabulary.find({});
        const userProgress = await UserProgress.find({ userId: req.userId });
        
        // Tạo Set chứa ID các từ hệ thống mà user đã học
        const learnedSysIds = new Set(userProgress.map(p => p.wordId.toString()));

        const formattedSystemWords = systemWords.map(w => ({
            _id: w._id,
            
            // ✅ MAPPING CẤU TRÚC MỚI
            word: w.word,
            definitions: w.definitions || [],
            phonetics: w.phonetics || {},
            audio: w.audio || {},
            level: w.level || "",
            href: w.href || "",
            
            // ✅ GIỮ TƯƠNG THÍCH NGƯỢC (cho code Frontend cũ không bị lỗi)
            english: w.word, 
            definition: w.definitions?.[0]?.definition || "",
            example: w.definitions?.[0]?.examples?.[0] || "",
            
            type: w.type,
            group: w.group,
            learned: learnedSysIds.has(w._id.toString()), 
            isGlobal: true,
            createdAt: w._id.getTimestamp()
        }));

        // C. Gộp lại
        const allWords = [...formattedUserWords, ...formattedSystemWords];

        // ✅ UPDATE: Lấy cả folder của mình VÀ folder hệ thống (isGlobal: true)
        const folders = await Folder.find({
            $or: [{ userId: req.userId }, { isGlobal: true }]
        });

        const groupSettings = await GroupSetting.find({
            $or: [{ userId: req.userId }, { isGlobal: true }]
        });
        
        res.json({ words: allWords, folders, groupSettings });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Lỗi sync data" }); 
    }
});

// 2. ADD WORD (UPDATE: Sửa lại logic lưu SystemVocabulary theo schema mới)
router.post('/words', verifyToken, async (req, res) => {
    try {
        // Nhận cả field cũ (english) và mới (word) để linh hoạt
        const { english, word, definition, definitions, type, group, example, isGlobal } = req.body;
        
        const wordText = word || english;

        if (isGlobal) {
            const isAdmin = await checkAdmin(req.userId);
            if (!isAdmin) return res.status(403).json({ error: "Chỉ Admin được thêm từ hệ thống" });
            
            // Nếu gửi lên theo format cũ, tự convert sang format mới
            const finalDefinitions = definitions || [{ 
                order: 1, 
                label: 'Meaning 1', 
                definition: definition, 
                examples: example ? [example] : [] 
            }];

            const newSysWord = new SystemVocabulary({ 
                word: wordText, 
                definitions: finalDefinitions, 
                type, 
                group 
            });
            await newSysWord.save();
            return res.json({ ...newSysWord.toObject(), isGlobal: true });
        } else {
            // Từ cá nhân vẫn dùng schema cũ
            const newWord = new Vocabulary({ 
                userId: req.userId, 
                english: wordText, 
                definition: definition || (definitions?.[0]?.definition), 
                type, 
                group, 
                example 
            });
            await newWord.save();
            return res.json({ ...newWord.toObject(), isGlobal: false });
        }
    } catch (e) { res.status(500).json(e); }
});

// 3. DELETE WORD
router.delete('/words/:id', verifyToken, async (req, res) => {
    try {
        const id = req.params.id;
        const userWord = await Vocabulary.findOneAndDelete({ _id: id, userId: req.userId });
        if (userWord) return res.json({ success: true, type: 'personal' });
        
        const isAdmin = await checkAdmin(req.userId);
        if (isAdmin) {
            const sysWord = await SystemVocabulary.findByIdAndDelete(id);
            if (sysWord) return res.json({ success: true, type: 'system' });
        }
        return res.status(404).json({ error: "Không tìm thấy từ hoặc không có quyền xóa" });
    } catch (e) { res.status(500).json(e); }
});

// 4. UPDATE WORD
router.patch('/words/:id', verifyToken, async (req, res) => {
    try {
        const id = req.params.id;
        const updateData = req.body;

        const userWord = await Vocabulary.findOneAndUpdate(
            { _id: id, userId: req.userId },
            updateData,
            { new: true }
        );
        if (userWord) return res.json({ ...userWord.toObject(), isGlobal: false });

        const sysWord = await SystemVocabulary.findById(id);
        if (sysWord) {
            if (typeof updateData.learned === 'boolean') {
                 if (updateData.learned) {
                     await UserProgress.findOneAndUpdate(
                         { userId: req.userId, wordId: id },
                         { learned: true, updatedAt: new Date() },
                         { upsert: true }
                     );
                 } else {
                     await UserProgress.findOneAndDelete({ userId: req.userId, wordId: id });
                 }
                 return res.json({ ...sysWord.toObject(), learned: updateData.learned, isGlobal: true });
            }

            const isAdmin = await checkAdmin(req.userId);
            if (isAdmin) {
                 const updatedSys = await SystemVocabulary.findByIdAndUpdate(id, updateData, { new: true });
                 return res.json({ ...updatedSys.toObject(), isGlobal: true });
            }
        }
        return res.status(403).json({ error: "Không có quyền sửa từ này" });
    } catch (e) { res.status(500).json(e); }
});

// 5. RESET BATCH
router.post('/words/reset-batch', verifyToken, async (req, res) => {
    try {
        const { ids } = req.body;
        await Vocabulary.updateMany(
            { _id: { $in: ids }, userId: req.userId },
            { $set: { learned: false } }
        );
        await UserProgress.deleteMany({ 
            userId: req.userId, 
            wordId: { $in: ids } 
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json(e); }
});

// FOLDERS
router.post('/folders', verifyToken, async (req, res) => {
    // Cho phép tạo folder global nếu là admin (tùy chọn)
    await Folder.create({ ...req.body, userId: req.userId });
    res.json({ success: true });
});
router.delete('/folders/:name', verifyToken, async (req, res) => {
    await Folder.findOneAndDelete({ name: req.params.name, userId: req.userId });
    res.json({ success: true });
});

// GROUPS
router.post('/groups', verifyToken, async (req, res) => {
    try {
        let { groupName, folder, isGlobal } = req.body;
        if (isGlobal) {
            const isAdmin = await checkAdmin(req.userId);
            if (!isAdmin) return res.status(403).json({ error: "Chỉ Admin tạo được nhóm hệ thống" });
        } else { isGlobal = false; }
        
        const query = isGlobal ? { isGlobal: true, groupName } : { userId: req.userId, groupName, isGlobal: false };
        await GroupSetting.findOneAndUpdate(query, { userId: req.userId, groupName, folder, isGlobal }, { upsert: true, new: true });
        res.json({ success: true });
    } catch (e) { res.status(500).json(e); }
});
router.delete('/groups/:groupName', verifyToken, async (req, res) => {
    try {
        const groupName = decodeURIComponent(req.params.groupName);
        const isAdmin = await checkAdmin(req.userId);
        const personalGroup = await GroupSetting.findOneAndDelete({ 
            userId: req.userId, groupName: groupName, $or: [{ isGlobal: false }, { isGlobal: { $exists: false } }]
        });
        if (personalGroup) {
            await Vocabulary.deleteMany({ userId: req.userId, group: groupName });
            return res.json({ success: true, type: 'personal' });
        }
        if (isAdmin) {
            const globalGroup = await GroupSetting.findOneAndDelete({ groupName: groupName, isGlobal: true });
            if (globalGroup) {
                await SystemVocabulary.deleteMany({ group: groupName });
                return res.json({ success: true, type: 'system' });
            }
        }
        res.status(404).json({ error: "Không tìm thấy nhóm hoặc không có quyền" });
    } catch (e) { res.status(500).json(e); }
});

// IMPORT (Cá nhân)
router.post('/import', verifyToken, async (req, res) => {
    try {
        const { words, learned } = req.body;
        const userId = req.userId;
        if (!words || !Array.isArray(words)) return res.status(400).json({ error: "Dữ liệu lỗi" });
        const learnedSet = new Set(learned || []);
        const operations = words.map(word => ({
            updateOne: {
                filter: { userId: userId, english: word.english },
                update: { 
                    $set: {
                        definition: word.definition,
                        type: Array.isArray(word.type) ? word.type : [word.type],
                        group: word.group || "Chưa phân loại",
                        learned: learnedSet.has(word.id) || word.learned === true,
                        isGlobal: false,
                        updatedAt: new Date()
                    },
                    $setOnInsert: { userId: userId, createdAt: new Date() }
                },
                upsert: true
            }
        }));
        if (operations.length > 0) await Vocabulary.bulkWrite(operations);
        res.json({ success: true, message: `Đã nhập ${operations.length} từ` });
    } catch (e) { res.status(500).json({ error: "Lỗi nhập liệu" }); }
});

module.exports = router;