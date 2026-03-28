const express = require('express');
const router = express.Router();

// 🚀 GỘP CHUNG 1 DÒNG IMPORT DUY NHẤT ĐỂ TRÁNH LỖI CRASH
const { Vocabulary, SystemVocabulary, Folder, GroupSetting, User, UserProgress, SavedWord } = require('../models');
const { verifyToken } = require('../middleware');

const checkAdmin = async (userId) => {
    const user = await User.findById(userId);
    return user && user.role === 'admin';
};

// ==========================================
// 🚀 QUẢN LÝ TỪ VỰNG VÀ SYNC
// ==========================================

router.get('/sync', verifyToken, async (req, res) => {
    try {
        const userWords = await Vocabulary.find({ userId: req.userId }).sort({ createdAt: -1 });
        const formattedUserWords = userWords.map(w => ({ ...w.toObject(), isGlobal: false }));

        const systemWords = await SystemVocabulary.find({});
        const userProgress = await UserProgress.find({ userId: req.userId });
        const learnedSysIds = new Set(userProgress.map(p => p.wordId.toString()));
        
        console.log("🔥 [GET /sync] Tổng số từ đã học (UserProgress):", learnedSysIds.size, "| Danh sách ID:", Array.from(learnedSysIds));

        const formattedSystemWords = systemWords.map(w => ({
            _id: w._id,
            word: w.word,
            definitions: w.definitions || [],
            phonetics: w.phonetics || {},
            audio: w.audio || {},
            level: w.level || "",
            href: w.href || "",
            english: w.word, 
            definition: w.definitions?.[0]?.definition || "",
            example: w.definitions?.[0]?.examples?.[0] || "",
            type: w.type,
            group: w.group,
            learned: learnedSysIds.has(w._id.toString()), 
            isGlobal: true,
            createdAt: w._id.getTimestamp()
        }));

        const allWords = [...formattedUserWords, ...formattedSystemWords];

        const folders = await Folder.find({
            $or: [{ userId: req.userId }, { isGlobal: true }]
        });

        const groupSettings = await GroupSetting.find({
            $or: [{ userId: req.userId }, { isGlobal: true }]
        });
        
        res.json({ words: allWords, folders, groupSettings });
    } catch (e) { 
        res.status(500).json({ error: "Lỗi sync data" }); 
    }
});

router.post('/words', verifyToken, async (req, res) => {
    try {
        const { english, word, definition, definitions, type, group, example, isGlobal } = req.body;
        const wordText = word || english;

        if (isGlobal) {
            const isAdmin = await checkAdmin(req.userId);
            if (!isAdmin) return res.status(403).json({ error: "Chỉ Admin được thêm từ hệ thống" });
            
            const finalDefinitions = definitions || [{ 
                order: 1, label: 'Meaning 1', definition: definition, examples: example ? [example] : [] 
            }];

            const newSysWord = new SystemVocabulary({ word: wordText, definitions: finalDefinitions, type, group });
            await newSysWord.save();
            return res.json({ ...newSysWord.toObject(), isGlobal: true });
        } else {
            const newWord = new Vocabulary({ 
                userId: req.userId, english: wordText, definition: definition || (definitions?.[0]?.definition), 
                type, group, example 
            });
            await newWord.save();
            return res.json({ ...newWord.toObject(), isGlobal: false });
        }
    } catch (e) { res.status(500).json(e); }
});

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

router.patch('/words/:id', verifyToken, async (req, res) => {
    try {
        const id = req.params.id;
        const updateData = req.body;

        const userWord = await Vocabulary.findOneAndUpdate(
            { _id: id, userId: req.userId }, updateData, { new: true }
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

router.post('/words/reset-batch', verifyToken, async (req, res) => {
    try {
        const { ids } = req.body;
        await Vocabulary.updateMany({ _id: { $in: ids }, userId: req.userId }, { $set: { learned: false } });
        await UserProgress.deleteMany({ userId: req.userId, wordId: { $in: ids } });
        res.json({ success: true });
    } catch (e) { res.status(500).json(e); }
});

// ==========================================
// 🚀 QUẢN LÝ NHÓM CŨ VÀ IMPORT
// ==========================================

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
        res.status(404).json({ error: "Không tìm thấy nhóm" });
    } catch (e) { res.status(500).json(e); }
});

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

// ==========================================
// 🚀 TÍNH NĂNG MỚI: QUẢN LÝ THƯ MỤC & GIỎ HÀNG
// ==========================================

// 1. Lấy danh sách Folder
router.get('/folders', verifyToken, async (req, res) => {
    try {
        const folders = await Folder.find({ userId: req.userId }).sort({ createdAt: -1 });
        res.json(folders);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khi lấy danh sách thư mục' });
    }
});

// 2. Tạo Folder Mới
router.post('/folders', verifyToken, async (req, res) => {
    try {
        const { name, color } = req.body;
        const newFolder = new Folder({
            userId: req.userId,
            name: name,
            color: color || '#3b82f6' 
        });
        const savedFolder = await newFolder.save();
        res.status(201).json(savedFolder); // 🚀 Trả về đối tượng đầy đủ có chứa _id
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khi tạo thư mục mới' });
    }
});

// 3. Xóa Folder
router.delete('/folders/:id', verifyToken, async (req, res) => {
    try {
        const folderId = req.params.id;
        await SavedWord.deleteMany({ folderId, userId: req.userId });
        await Folder.findOneAndDelete({ _id: folderId, userId: req.userId });
        res.json({ message: 'Đã xóa thư mục thành công' });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khi xóa thư mục' });
    }
});

// 4. Xem chi tiết Folder
router.get('/folders/:id', verifyToken, async (req, res) => {
    try {
        const folder = await Folder.findOne({ _id: req.params.id, userId: req.userId });
        if (!folder) return res.status(404).json({ error: 'Không tìm thấy thư mục' });

        const savedWords = await SavedWord.find({ folderId: folder._id, userId: req.userId })
            .populate('wordId') 
            .sort({ addedAt: 1 }); 

        res.json({ folder, savedWords });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khi tải chi tiết thư mục' });
    }
});

// 5. Reset tiến độ Folder
router.put('/folders/:id/reset', verifyToken, async (req, res) => {
    try {
        // Lấy danh sách các từ trong folder này
        const savedWords = await SavedWord.find({ folderId: req.params.id, userId: req.userId });
        const wordIds = savedWords.map(sw => sw.wordId);

        // 🚀 ĐỒNG BỘ: Rút các từ này khỏi tiến độ tổng (UserProgress)
        await UserProgress.deleteMany({ userId: req.userId, wordId: { $in: wordIds } });

        // Reset lại isMastered trong thư mục
        await SavedWord.updateMany(
            { folderId: req.params.id, userId: req.userId },
            { isMastered: false }
        );
        res.json({ message: 'Đã reset tiến độ thư mục' });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khi reset tiến độ' });
    }
});

// 6. Thêm từ vào Folder
router.post('/folders/:id/add-words', verifyToken, async (req, res) => {
    try {
        const { wordIds } = req.body; 
        const folderId = req.params.id;

        const wordsToAdd = wordIds.map(wordId => ({
            userId: req.userId,
            folderId: folderId,
            wordId: wordId
        }));

        await SavedWord.insertMany(wordsToAdd, { ordered: false });
        res.json({ message: 'Thêm từ vựng thành công!' });
    } catch (err) {
        if (err.code === 11000) {
             return res.json({ message: 'Đã thêm từ (bỏ qua trùng lặp)' });
        }
        res.status(500).json({ error: 'Lỗi khi thêm từ' });
    }
});

// 7. Cập nhật isMastered (Đã thuộc hay chưa) - ĐÃ THÊM LOGIC ĐỒNG BỘ
router.put('/saved-words/:id/master', verifyToken, async (req, res) => {
    try {
        const { isMastered } = req.body; 
        const savedWord = await SavedWord.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            { isMastered: isMastered },
            { new: true }
        );

        // 🚀 BƯỚC QUAN TRỌNG: Đồng bộ sang bảng UserProgress để Header nhảy số
        if (savedWord && savedWord.wordId) {
            if (isMastered) {
                // Nếu thuộc -> Lưu vào UserProgress
                await UserProgress.findOneAndUpdate(
                    { userId: req.userId, wordId: savedWord.wordId },
                    { learned: true, updatedAt: new Date() },
                    { upsert: true }
                );
            } else {
                // Nếu chưa nhớ -> Xóa khỏi UserProgress
                await UserProgress.findOneAndDelete({ 
                    userId: req.userId, 
                    wordId: savedWord.wordId 
                });
            }
        }

        res.json(savedWord);
    } catch (err) {
        console.error("Lỗi sync tiến độ:", err);
        res.status(500).json({ error: 'Lỗi cập nhật' });
    }
});

// 8. Lấy toàn bộ ID từ đã chọn
router.get('/saved-words/all-ids', verifyToken, async (req, res) => {
    try {
        const savedWords = await SavedWord.find({ userId: req.userId }).select('wordId folderId');
        res.json(savedWords);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi danh sách ID' });
    }
});

module.exports = router;