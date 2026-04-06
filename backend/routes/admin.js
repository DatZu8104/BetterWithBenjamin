const express = require('express');
const router = express.Router();
const { User, Vocabulary, SystemVocabulary, Folder, GroupSetting, SavedWord, UserProgress } = require('../models');
const { verifyToken, verifyAdmin } = require('../middleware');


// Lấy danh sách tất cả người dùng (kèm thống kê chi tiết)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });

    const usersWithStats = await Promise.all(users.map(async (user) => {
      // 1. Số từ do user tự tạo
      const customWordCount = await Vocabulary.countDocuments({ userId: user._id });
      
      // 2. Số từ hệ thống (Oxford) mà user đã lưu
      const systemWordCount = await SavedWord.countDocuments({ userId: user._id });
      
      // 3. Số từ hệ thống user đã học (learned: true)
      const learnedSystemCount = await UserProgress.countDocuments({ userId: user._id, learned: true });
      
      // 4. Số từ tự tạo user đã học
      const learnedCustomCount = await Vocabulary.countDocuments({ userId: user._id, learned: true });

      return {
        ...user.toObject(),
        customWordCount,
        systemWordCount,
        learnedCount: learnedSystemCount + learnedCustomCount, // Tổng số từ đã thuộc
        totalWords: customWordCount + systemWordCount // Tổng tài nguyên đang có
      };
    }));

    res.json(usersWithStats);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách người dùng:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
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

// Lấy chi tiết tiến độ học từ vựng của 1 user cụ thể
router.get('/users/:id/progress', async (req, res) => {
  try {
    const userId = req.params.id;

    // 1. Lấy dữ liệu từ hệ thống (Oxford)
    const savedWords = await SavedWord.find({ userId }).populate('wordId');
    const userProgress = await UserProgress.find({ userId });

    const systemProgress = savedWords.map(saved => {
      // Tìm xem từ này đã có trong bảng Progress chưa
      const progress = userProgress.find(p => p.wordId.toString() === saved.wordId._id.toString());
      return {
        _id: saved.wordId._id,
        word: saved.wordId.word,
        pos: saved.wordId.pos,
        ipa: saved.wordId.ipa,
        meaning: saved.wordId.meaning,
        isMastered: saved.isMastered,
        learned: progress ? progress.learned : false,
        type: 'system'
      };
    });

    // 2. Lấy dữ liệu từ tự tạo (Vocabulary)
    const customWords = await Vocabulary.find({ userId });
    const customProgress = customWords.map(word => ({
        _id: word._id,
        word: word.word,
        meaning: word.meaning,
        learned: word.learned || false,
        type: 'custom'
    }));

    // 3. Trả về kết quả đã phân loại
    res.json({
        systemWords: systemProgress,
        customWords: customProgress,
        stats: {
            totalSystem: systemProgress.length,
            learnedSystem: systemProgress.filter(w => w.learned).length,
            totalCustom: customProgress.length,
            learnedCustom: customProgress.filter(w => w.learned).length
        }
    });
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết tiến độ user:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});
module.exports = router;