const express = require('express');
const router = express.Router();
const { Vocabulary, Folder, GroupSetting } = require('../models');
const { verifyToken } = require('../middleware');

// Sync Data (Lấy hết dữ liệu)
router.get('/sync', verifyToken, async (req, res) => {
    try {
        const words = await Vocabulary.find({ userId: req.userId }).sort({ createdAt: -1 });
        const folders = await Folder.find({ userId: req.userId });
        const groupSettings = await GroupSetting.find({ userId: req.userId });
        res.json({ words, folders, groupSettings });
    } catch (e) { res.status(500).json({ error: "Lỗi lấy dữ liệu" }); }
});

// Thêm từ
router.post('/words', verifyToken, async (req, res) => {
    try {
        const newWord = new Vocabulary({ ...req.body, userId: req.userId });
        await newWord.save();
        res.json(newWord);
    } catch (e) { res.status(500).json(e); }
});

// Xóa từ
router.delete('/words/:id', verifyToken, async (req, res) => {
    await Vocabulary.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ success: true });
});

// Sửa từ
router.patch('/words/:id', verifyToken, async (req, res) => {
    const updated = await Vocabulary.findOneAndUpdate(
        { _id: req.params.id, userId: req.userId },
        req.body, { new: true }
    );
    res.json(updated);
});

// Reset hàng loạt
router.post('/words/reset-batch', verifyToken, async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: "Thiếu danh sách ID" });
        await Vocabulary.updateMany(
            { _id: { $in: ids }, userId: req.userId },
            { $set: { learned: false } }
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json(e); }
});

// Folder APIs
router.post('/folders', verifyToken, async (req, res) => {
    await Folder.create({ ...req.body, userId: req.userId });
    res.json({ success: true });
});
router.delete('/folders/:name', verifyToken, async (req, res) => {
    await Folder.findOneAndDelete({ name: req.params.name, userId: req.userId });
    res.json({ success: true });
});

// Group APIs
router.post('/groups', verifyToken, async (req, res) => {
    await GroupSetting.findOneAndUpdate(
        { userId: req.userId, groupName: req.body.groupName },
        { ...req.body, userId: req.userId },
        { upsert: true }
    );
    res.json({ success: true });
});
// ✅ API XÓA NHÓM MỚI (Khớp với Frontend)
router.delete('/groups/:groupName', verifyToken, async (req, res) => {
    try {
        const groupName = req.params.groupName; // Lấy tên nhóm từ URL
        const userId = req.userId;

        // 1. Xóa cài đặt nhóm (nếu có)
        await GroupSetting.findOneAndDelete({ userId: userId, groupName: groupName });

        // 2. Xóa tất cả từ vựng trong nhóm này
        // QUAN TRỌNG: Dùng 'Vocabulary' thay vì 'Word' để khớp với khai báo ở đầu file của bạn
        const result = await Vocabulary.deleteMany({ userId: userId, group: groupName });

        res.json({ 
            success: true, 
            message: `Đã xóa nhóm '${groupName}' và ${result.deletedCount} từ vựng.` 
        });
    } catch (e) { 
        console.error("Lỗi xóa nhóm:", e);
        res.status(500).json({ error: "Lỗi Server" }); 
    }
});
// Import Data
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