const express = require('express');
const router = express.Router();
const { User, Vocabulary } = require('../models');
const { verifyToken, verifyAdmin } = require('../middleware');

// Lấy danh sách Users (Chỉ Admin)
router.get('/users', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        const usersWithCount = await Promise.all(users.map(async (user) => {
            const count = await Vocabulary.countDocuments({ userId: user._id });
            return { ...user.toObject(), wordCount: count };
        }));
        res.json(usersWithCount);
    } catch (e) { res.status(500).json(e); }
});

// Xóa User (Chỉ Admin)

// Trong file routes/admin.js

// ... (các code cũ)

// ✅ API MỚI: Import dữ liệu cho một User cụ thể (Chỉ Admin dùng)
router.post('/users/:userId/import', async (req, res) => {
    try {
        const { userId } = req.params;
        const inputData = req.body; // Dữ liệu JSON gửi lên

        // Kiểm tra định dạng dữ liệu (Hỗ trợ cả mảng hoặc object backup chuẩn)
        let wordsToImport = [];
        if (Array.isArray(inputData)) {
            wordsToImport = inputData;
        } else if (inputData.words && Array.isArray(inputData.words)) {
            wordsToImport = inputData.words;
        }

        if (wordsToImport.length === 0) {
            return res.status(400).json({ error: "Không tìm thấy dữ liệu từ vựng hợp lệ." });
        }

        // Gán ID của User mục tiêu vào từng từ
        const cleanWords = wordsToImport.map(w => ({
            user: userId,          // Quan trọng: Gán cho user được chọn
            english: w.english,
            definition: w.definition,
            type: w.type || 'noun',
            example: w.example || '',
            group: w.group || 'Admin Import',
            learned: false,        // Mặc định là chưa học
            createdAt: new Date()
        }));

        // Lưu vào Database (Yêu cầu model Word đã được import ở đầu file)
        // const Word = require('../models/Word'); // Đảm bảo dòng này có ở đầu file
        await Vocabulary.insertMany(cleanWords);

        res.json({ success: true, count: cleanWords.length, message: `Đã nhập ${cleanWords.length} từ cho User này.` });

    } catch (error) {
        console.error("Admin Import Error:", error);
        res.status(500).json({ error: "Lỗi Server khi nhập dữ liệu." });
    }
});
// --- BỔ SUNG API XÓA NHÓM (Backend) ---
// Frontend gọi: DELETE /api/groups/Tên%20Nhóm

router.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        await Vocabulary.deleteMany({ userId: req.params.id }); // Xóa luôn từ vựng của họ
        res.json({ success: true });
    } catch (e) { res.status(500).json(e); }
});
router.get('/users/:id/words', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const words = await Vocabulary.find({ userId: req.params.id });
        res.json(words);
    } catch (e) { res.status(500).json(e); }
});

// Xóa từ vựng vi phạm (Chỉ Admin)
router.delete('/words/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await Vocabulary.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json(e); }
});

module.exports = router;