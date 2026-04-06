const express = require('express');
const router = express.Router();
const { User, Vocabulary, SystemVocabulary, Folder, GroupSetting } = require('../models');
const { verifyToken, verifyAdmin } = require('../middleware');


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

// Import từ cho User cụ thể 
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

router.delete('/words/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await Vocabulary.findByIdAndDelete(req.params.id);
        await SystemVocabulary.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json(e); }
});


router.post('/import-oxford-full', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const jsonData = req.body; 
        console.log(`Đang xử lý ${jsonData.length} từ...`);

         await SystemVocabulary.deleteMany({}); 
         await GroupSetting.deleteMany({ isGlobal: true, groupName: { $regex: /^Oxford Level/ } });

        const folderName = "Oxford 5000 Total";
        let folder = await Folder.findOne({ name: folderName, isGlobal: true });
        
        if (!folder) {
            folder = await Folder.create({ 
                userId: req.userId, 
                name: folderName, 
                color: "#e11d48",
                isGlobal: true 
            });
        }

        const levelGroups = new Set();
        
        const wordsToInsert = jsonData.map(item => {
            const lvl = item.level ? item.level.toUpperCase().trim() : "Others";
            const groupName = `Oxford Level ${lvl}`;
            
            levelGroups.add(groupName);

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
                group: groupName // 
            };
        });

        for (const groupName of levelGroups) {
            await GroupSetting.create({ 
                userId: req.userId,
                groupName: groupName, 
                folder: folderName, 
                isGlobal: true 
            });
        }

        await SystemVocabulary.insertMany(wordsToInsert, { ordered: false });

        res.json({ 
            success: true, 
            message: `Finished importing ${wordsToInsert.length} words. Divided into ${levelGroups.size} levels in folder "${folderName}".` 
        });

    } catch (e) {
        console.error("Import Oxford Error:", e);
        res.status(500).json({ error: e.message || "Server error when importing" });
    }
});

module.exports = router;