const express = require('express');
const router = express.Router();
// ✅ Import thêm UserProgress
const { Vocabulary, SystemVocabulary, Folder, GroupSetting, User, UserProgress } = require('../models');
const { verifyToken } = require('../middleware');

const checkAdmin = async (userId) => {
    const user = await User.findById(userId);
    return user && user.role === 'admin';
};

// 1. SYNC DATA (Đã nâng cấp logic ghép tiến độ học)
router.get('/sync', verifyToken, async (req, res) => {
    try {
        // A. Lấy từ cá nhân (Đã có sẵn trường learned)
        const userWords = await Vocabulary.find({ userId: req.userId }).sort({ createdAt: -1 });
        const formattedUserWords = userWords.map(w => ({ ...w.toObject(), isGlobal: false }));

        // B. Lấy từ hệ thống + Tiến độ học của User này
        const systemWords = await SystemVocabulary.find({});
        const userProgress = await UserProgress.find({ userId: req.userId });
        
        // Tạo Set chứa ID các từ hệ thống mà user đã học
        const learnedSysIds = new Set(userProgress.map(p => p.wordId.toString()));

        const formattedSystemWords = systemWords.map(w => ({
            _id: w._id,
            english: w.english,
            definition: w.definition,
            type: w.type,
            example: w.example,
            group: w.group,
            // ✅ Check xem từ này có trong danh sách đã học không
            learned: learnedSysIds.has(w._id.toString()), 
            isGlobal: true,
            createdAt: w._id.getTimestamp()
        }));

        // C. Gộp lại
        const allWords = [...formattedUserWords, ...formattedSystemWords];

        const folders = await Folder.find({ userId: req.userId });
        // Lấy setting nhóm (chấp nhận cả nhóm cũ chưa có isGlobal)
        const groupSettings = await GroupSetting.find({
            $or: [{ userId: req.userId }, { isGlobal: true }]
        });
        
        res.json({ words: allWords, folders, groupSettings });
    } catch (e) { res.status(500).json({ error: "Lỗi sync data" }); }
});

// ... (API POST /words giữ nguyên) ...
router.post('/words', verifyToken, async (req, res) => {
    try {
        const { english, definition, type, group, example, isGlobal } = req.body;
        if (isGlobal) {
            const isAdmin = await checkAdmin(req.userId);
            if (!isAdmin) return res.status(403).json({ error: "Chỉ Admin được thêm từ hệ thống" });
            const newSysWord = new SystemVocabulary({ english, definition, type, group, example });
            await newSysWord.save();
            return res.json({ ...newSysWord.toObject(), isGlobal: true });
        } else {
            const newWord = new Vocabulary({ userId: req.userId, english, definition, type, group, example });
            await newWord.save();
            return res.json({ ...newWord.toObject(), isGlobal: false });
        }
    } catch (e) { res.status(500).json(e); }
});

// ... (API DELETE /words giữ nguyên) ...
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

// 4. UPDATE TỪ (Nâng cấp: Xử lý học từ hệ thống)
router.patch('/words/:id', verifyToken, async (req, res) => {
    try {
        const id = req.params.id;
        const updateData = req.body;

        // A. Thử sửa bảng cá nhân (Update bình thường)
        const userWord = await Vocabulary.findOneAndUpdate(
            { _id: id, userId: req.userId },
            updateData,
            { new: true }
        );
        if (userWord) return res.json({ ...userWord.toObject(), isGlobal: false });

        // B. Nếu không phải từ cá nhân -> Check từ hệ thống
        const sysWord = await SystemVocabulary.findById(id);
        if (sysWord) {
            // ✅ Trường hợp 1: User đánh dấu "Đã thuộc" (hoặc bỏ thuộc)
            if (typeof updateData.learned === 'boolean') {
                 if (updateData.learned) {
                     // Lưu vào bảng Progress
                     await UserProgress.findOneAndUpdate(
                         { userId: req.userId, wordId: id },
                         { learned: true, updatedAt: new Date() },
                         { upsert: true } // Nếu chưa có thì tạo mới
                     );
                 } else {
                     // Xóa khỏi bảng Progress
                     await UserProgress.findOneAndDelete({ userId: req.userId, wordId: id });
                 }
                 // Trả về object đã merge learned để frontend cập nhật
                 return res.json({ ...sysWord.toObject(), learned: updateData.learned, isGlobal: true });
            }

            // ✅ Trường hợp 2: Admin sửa nội dung (English, Definition...)
            const isAdmin = await checkAdmin(req.userId);
            if (isAdmin) {
                 const updatedSys = await SystemVocabulary.findByIdAndUpdate(id, updateData, { new: true });
                 return res.json({ ...updatedSys.toObject(), isGlobal: true });
            }
        }

        return res.status(403).json({ error: "Không có quyền sửa từ này" });
    } catch (e) { res.status(500).json(e); }
});

// 5. RESET BATCH (Nâng cấp: Reset cả progress hệ thống)
router.post('/words/reset-batch', verifyToken, async (req, res) => {
    try {
        const { ids } = req.body;
        // 1. Reset từ cá nhân
        await Vocabulary.updateMany(
            { _id: { $in: ids }, userId: req.userId },
            { $set: { learned: false } }
        );

        // 2. Reset từ hệ thống (Xóa khỏi bảng Progress)
        await UserProgress.deleteMany({ 
            userId: req.userId, 
            wordId: { $in: ids } 
        });

        res.json({ success: true });
    } catch (e) { res.status(500).json(e); }
});

// ... (Các API Folder/Group/Import giữ nguyên như cũ) ...
// (Đảm bảo copy lại phần Group API đã sửa ở bước trước)

router.post('/folders', verifyToken, async (req, res) => {
    await Folder.create({ ...req.body, userId: req.userId });
    res.json({ success: true });
});
router.delete('/folders/:name', verifyToken, async (req, res) => {
    await Folder.findOneAndDelete({ name: req.params.name, userId: req.userId });
    res.json({ success: true });
});
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