const express = require('express');
const router = express.Router();
const { Vocabulary, Folder, GroupSetting, User } = require('../models');
const { verifyToken } = require('../middleware');

// --- HELPER: Kiểm tra quyền Admin ---
const checkAdmin = async (userId) => {
    const user = await User.findById(userId);
    return user && user.role === 'admin';
};

// 1. Sync Data (Lấy dữ liệu cho cả Personal và System)
router.get('/sync', verifyToken, async (req, res) => {
    try {
        const words = await Vocabulary.find({
            $or: [
                { userId: req.userId }, // Từ cá nhân
                { isGlobal: true }      // Từ hệ thống
            ]
        }).sort({ createdAt: -1 });

        const folders = await Folder.find({ userId: req.userId });
        const groupSettings = await GroupSetting.find({ userId: req.userId });
        
        res.json({ words, folders, groupSettings });
    } catch (e) { res.status(500).json({ error: "Lỗi lấy dữ liệu" }); }
});

// 2. Thêm từ
router.post('/words', verifyToken, async (req, res) => {
    try {
        let { english, definition, type, group, example, isGlobal } = req.body;
        
        // Nếu user yêu cầu tạo từ Global, phải check quyền Admin
        if (isGlobal) {
            const isAdmin = await checkAdmin(req.userId);
            if (!isAdmin) isGlobal = false; // User thường -> Ép về từ cá nhân
        } else {
            isGlobal = false;
        }

        const newWord = new Vocabulary({
            userId: req.userId,
            english, definition, type, group, example, isGlobal
        });
        await newWord.save();
        res.json(newWord);
    } catch (e) { res.status(500).json(e); }
});

// 3. Xóa từ (Bảo mật: User không được xóa từ Global)
router.delete('/words/:id', verifyToken, async (req, res) => {
    try {
        const word = await Vocabulary.findById(req.params.id);
        if (!word) return res.status(404).json({ error: "Không tìm thấy" });

        const isAdmin = await checkAdmin(req.userId);

        // Từ hệ thống: Chỉ Admin được xóa
        if (word.isGlobal && !isAdmin) {
            return res.status(403).json({ error: "Chỉ Admin mới được xóa từ hệ thống" });
        }
        // Từ cá nhân: Chỉ chủ sở hữu được xóa
        if (!word.isGlobal && word.userId.toString() !== req.userId) {
            return res.status(403).json({ error: "Không có quyền" });
        }

        await Vocabulary.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json(e); }
});

// 4. Sửa từ (Logic tương tự Xóa)
router.patch('/words/:id', verifyToken, async (req, res) => {
    try {
        const word = await Vocabulary.findById(req.params.id);
        if (!word) return res.status(404).json({ error: "Không tìm thấy từ" });

        const isAdmin = await checkAdmin(req.userId);

        // Chặn sửa nếu không đủ quyền
        if (word.isGlobal && !isAdmin) {
            return res.status(403).json({ error: "Chỉ Admin được sửa từ hệ thống" });
        }
        if (!word.isGlobal && word.userId.toString() !== req.userId) {
            return res.status(403).json({ error: "Không chính chủ" });
        }

        const updated = await Vocabulary.findByIdAndUpdate(
            req.params.id,
            req.body, 
            { new: true }
        );
        res.json(updated);
    } catch (e) { res.status(500).json(e); }
});

// 5. Reset hàng loạt
router.post('/words/reset-batch', verifyToken, async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: "Thiếu danh sách ID" });
        
        // Reset progress cho phép trên cả từ global (vì learned là trạng thái cá nhân? 
        // ⚠️ Lưu ý: Nếu 'learned' lưu trực tiếp trên Word Global thì tất cả user sẽ thấy nó learned.
        // Để giải quyết triệt để vấn đề "User học từ Global", cần bảng riêng "UserWordProgress".
        // Tuy nhiên với kiến trúc hiện tại, ta tạm thời cho phép reset nếu là chủ sở hữu.
        
        await Vocabulary.updateMany(
            { _id: { $in: ids }, userId: req.userId }, // Chỉ reset từ của mình
            { $set: { learned: false } }
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json(e); }
});

// --- Folder & Group APIs (Giữ nguyên logic nhưng thêm check quyền nếu cần) ---

router.post('/folders', verifyToken, async (req, res) => {
    await Folder.create({ ...req.body, userId: req.userId });
    res.json({ success: true });
});

router.delete('/folders/:name', verifyToken, async (req, res) => {
    await Folder.findOneAndDelete({ name: req.params.name, userId: req.userId });
    res.json({ success: true });
});

router.post('/groups', verifyToken, async (req, res) => {
    await GroupSetting.findOneAndUpdate(
        { userId: req.userId, groupName: req.body.groupName },
        { ...req.body, userId: req.userId },
        { upsert: true }
    );
    res.json({ success: true });
});

router.delete('/groups/:groupName', verifyToken, async (req, res) => {
    try {
        const groupName = req.params.groupName;
        const userId = req.userId;

        // Xóa cài đặt nhóm
        await GroupSetting.findOneAndDelete({ userId: userId, groupName: groupName });

        // Xóa từ vựng: Chỉ xóa từ của user, KHÔNG xóa từ Global trong nhóm đó (để an toàn)
        const result = await Vocabulary.deleteMany({ 
            userId: userId, 
            group: groupName,
            isGlobal: false // ✅ An toàn: Chỉ xóa từ cá nhân
        });

        res.json({ 
            success: true, 
            message: `Đã xóa nhóm cá nhân và ${result.deletedCount} từ vựng.` 
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
                        isGlobal: false, // Import mặc định là cá nhân
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