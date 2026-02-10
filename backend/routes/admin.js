const express = require('express');
const router = express.Router();
// ✅ 1. Import đầy đủ các Model cần thiết
const { User, Vocabulary, SystemVocabulary, Folder, GroupSetting } = require('../models');
const { verifyToken, verifyAdmin } = require('../middleware');

// --- CÁC API QUẢN LÝ USER (Giữ nguyên) ---

// Lấy danh sách Users
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

// Xóa User
router.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        await Vocabulary.deleteMany({ userId: req.params.id });
        res.json({ success: true });
    } catch (e) { res.status(500).json(e); }
});

// Lấy từ vựng của User cụ thể
router.get('/users/:id/words', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const words = await Vocabulary.find({ userId: req.params.id });
        res.json(words);
    } catch (e) { res.status(500).json(e); }
});

// Import từ cho User cụ thể (Giữ lại nếu bạn cần sửa chữa tài khoản user)
router.post('/users/:userId/import', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const inputData = req.body;
        let wordsToImport = Array.isArray(inputData) ? inputData : (inputData.words || []);

        if (wordsToImport.length === 0) return res.status(400).json({ error: "Không có dữ liệu" });

        const cleanWords = wordsToImport.map(w => ({
            userId: userId, // Fix: schema dùng userId
            english: w.english || w.word,
            definition: w.definition || w.definitions?.[0]?.definition || "",
            type: Array.isArray(w.type) ? w.type : [w.type],
            example: w.example || w.definitions?.[0]?.examples?.[0] || "",
            group: 'Admin Import',
            learned: false,
            createdAt: new Date()
        }));

        await Vocabulary.insertMany(cleanWords);
        res.json({ success: true, count: cleanWords.length });
    } catch (error) {
        res.status(500).json({ error: "Lỗi import user" });
    }
});

// Xóa 1 từ vựng (hệ thống hoặc cá nhân - admin quyền lực nhất)
router.delete('/words/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await Vocabulary.findByIdAndDelete(req.params.id); // Thử xóa ở User
        await SystemVocabulary.findByIdAndDelete(req.params.id); // Thử xóa ở System
        res.json({ success: true });
    } catch (e) { res.status(500).json(e); }
});

// --- ✅ API QUAN TRỌNG NHẤT: IMPORT OXFORD TOÀN TẬP ---

router.post('/import-oxford-full', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const jsonData = req.body; // Dữ liệu file JSON lớn
        console.log(`Đang xử lý ${jsonData.length} từ...`);

        // 1. Dọn dẹp dữ liệu cũ (Theo yêu cầu của bạn)
        await SystemVocabulary.deleteMany({}); 
        // Xóa các nhóm Oxford cũ để tránh trùng lặp
        await GroupSetting.deleteMany({ isGlobal: true, groupName: { $regex: /^Oxford Level/ } });

        // 2. Tạo/Lấy Folder hệ thống "Oxford 5000 Total"
        const folderName = "Oxford 5000 Total";
        let folder = await Folder.findOne({ name: folderName, isGlobal: true });
        
        if (!folder) {
            folder = await Folder.create({ 
                userId: req.userId, 
                name: folderName, 
                color: "#e11d48", // Màu đỏ
                isGlobal: true 
            });
        }

        // 3. Xử lý chia nhóm theo Level
        const levelGroups = new Set();
        
        const wordsToInsert = jsonData.map(item => {
            // Chuẩn hóa Level (nếu null thì cho vào Unknown)
            const lvl = item.level ? item.level.toUpperCase().trim() : "Others";
            const groupName = `Oxford Level ${lvl}`;
            
            levelGroups.add(groupName);

            // Map dữ liệu JSON sang Schema Mới
            return {
                word: item.word,
                type: item.type,
                level: lvl,
                phonetics: {
                    us: item.phonetics?.us || "",
                    uk: item.phonetics?.uk || ""
                },
                audio: {
                    us: item.audio?.us || "",
                    uk: item.audio?.uk || ""
                },
                definitions: item.definitions.map(def => ({
                    order: def.order,
                    label: def.label,
                    definition: def.definition,
                    examples: def.examples || []
                })),
                href: item.href,
                group: groupName // ✅ Tự động vào nhóm Level tương ứng
            };
        });

        // 4. Tạo các GroupSetting (Level A1, A2...) và nhét vào Folder
        for (const groupName of levelGroups) {
            await GroupSetting.create({ 
                userId: req.userId,
                groupName: groupName, 
                folder: folderName, // ✅ Nhét vào folder chung
                isGlobal: true 
            });
        }

        // 5. Insert dữ liệu mới
        // Dùng insertMany với option ordered: false để nếu 1 từ lỗi thì các từ khác vẫn chạy
        await SystemVocabulary.insertMany(wordsToInsert, { ordered: false });

        res.json({ 
            success: true, 
            message: `Đã nhập xong ${wordsToInsert.length} từ. Đã chia thành ${levelGroups.size} cấp độ trong folder "${folderName}".` 
        });

    } catch (e) {
        console.error("Import Oxford Error:", e);
        res.status(500).json({ error: e.message || "Lỗi server khi import" });
    }
});

module.exports = router;