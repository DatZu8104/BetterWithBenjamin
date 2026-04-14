const express = require('express');
const router = express.Router();

const { Vocabulary, SystemVocabulary, Folder, GroupSetting, User, UserProgress, SavedWord, SystemFolder } = require('../models');
const { verifyToken } = require('../middleware');

const checkAdmin = async (userId) => {
    const user = await User.findById(userId);
    return user && user.role === 'admin';
};

router.get('/sync', verifyToken, async (req, res) => {
    try {
        const userWords = await Vocabulary.find({ userId: req.userId }).sort({ createdAt: -1 });
        const formattedUserWords = userWords.map(w => ({ ...w.toObject(), isGlobal: false }));

        const userProgress = await UserProgress.find({ userId: req.userId });
        const learnedSysIds = userProgress.map(p => p.wordId.toString());
        
        const personalFolders = await Folder.find({ userId: req.userId, $or: [{ isGlobal: false }, { isGlobal: { $exists: false } }] });
        
        const systemFolders = await SystemFolder.find({}); 

        const personalGroupSettings = await GroupSetting.find({ userId: req.userId, $or: [{ isGlobal: false }, { isGlobal: { $exists: false } }] });
        const systemGroupSettings = await GroupSetting.find({ isGlobal: true });
        
        res.json({ 
            words: formattedUserWords, 
            learnedSystemIds: learnedSysIds, 
            personalFolders,       
            systemFolders,       
            personalGroupSettings, 
            systemGroupSettings    
        });
    } catch (e) { 
        res.status(500).json({ error: "Lỗi sync data" }); 
    }
});

router.get('/sync-system', verifyToken, async (req, res) => {
    try {
        const systemWords = await SystemVocabulary.find({});
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
            learned: false,
            isGlobal: true,
            createdAt: w.createdAt || new Date()
        }));

        res.json(formattedSystemWords);
    } catch (e) { 
        res.status(500).json({ error: "Sync system data error" }); 
    }
});

router.post('/words', verifyToken, async (req, res) => {
    try {
        const { english, word, definition, definitions, type, group, example, isGlobal } = req.body;
        const wordText = word || english;

        if (isGlobal) {
            const isAdmin = await checkAdmin(req.userId);
            if (!isAdmin) return res.status(403).json({ error: "Only Admin can be added from the system" });
            
            const finalDefinitions = definitions || [{ 
                order: 1, label: 'Meaning 1', definition: definition, examples: example ? [example] : [] 
            }];

            const finalType = Array.isArray(type) ? type.join(', ') : type;

            const newSysWord = new SystemVocabulary({ 
                word: wordText, 
                definitions: finalDefinitions, 
                type: finalType, 
                group 
            });
            
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
    } catch (e) { 
        console.error("Lỗi khi thêm từ vựng:", e);
        res.status(500).json(e); 
    }
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
        return res.status(404).json({ error: "Word not found or permission to delete is not available" });
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
        return res.status(403).json({ error: "There is no right to edit this word" });
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

router.post('/groups', verifyToken, async (req, res) => {
    try {
        let { groupName, folder, isGlobal } = req.body;
        if (isGlobal) {
            const isAdmin = await checkAdmin(req.userId);
            if (!isAdmin) return res.status(403).json({ error: "There is no right to edit this word" });
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

        const deletedWords = await Vocabulary.deleteMany({ userId: req.userId, group: groupName });

        if (personalGroup || deletedWords.deletedCount > 0) {
            return res.json({ success: true, type: 'personal' });
        }

        if (isAdmin) {
            const globalGroup = await GroupSetting.findOneAndDelete({ groupName: groupName, isGlobal: true });
            const deletedSys = await SystemVocabulary.deleteMany({ group: groupName });
            if (globalGroup || deletedSys.deletedCount > 0) {
                return res.json({ success: true, type: 'system' });
            }
        }
        res.status(404).json({ error: "Group not found" });
    } catch (e) { res.status(500).json(e); }
});

router.post('/import', verifyToken, async (req, res) => {
    try {
        const { words, learned } = req.body;
        const userId = req.userId;
        if (!words || !Array.isArray(words)) return res.status(400).json({ error: "Error data" });
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
        res.json({ success: true, message: `Imported ${operations.length} words` });
    } catch (e) { res.status(500).json({ error: "Input error" }); }
});

router.post('/folders', verifyToken, async (req, res) => {
    try {
        const { name, color, isGlobal, isSystemSaved } = req.body; 
        
        // NẾU LÀ ADMIN TẠO FOLDER HỆ THỐNG -> LƯU VÀO BẢNG SYSTEM FOLDER
        if (isGlobal) {
            const isAdmin = await checkAdmin(req.userId);
            if (!isAdmin) return res.status(403).json({ error: 'Only Admin can add system folders' });
            
            const newSysFolder = new SystemFolder({
                name: name,
                color: color || '#3b82f6'
            });
            const savedSysFolder = await newSysFolder.save();
            return res.status(201).json(savedSysFolder);
        }

        // NẾU LÀ NGƯỜI DÙNG BÌNH THƯỜNG -> LƯU VÀO BẢNG FOLDER CÁ NHÂN
        const newFolder = new Folder({
            userId: req.userId,
            name: name,
            color: color || '#3b82f6',
            isGlobal: false,
            isSystemSaved: isSystemSaved || false 
        });
        const savedFolder = await newFolder.save();
        res.status(201).json(savedFolder);
    } catch (err) {
        res.status(500).json({ error: 'Error creating new folder' });
    }
});

router.delete('/folders/:id', verifyToken, async (req, res) => {
    try {
        const identifier = req.params.id;
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier);
        let isSystemFolder = false;

        let folder = await Folder.findOne({
            userId: req.userId,
            ...(isObjectId ? { _id: identifier } : { name: identifier })
        });

        if (!folder && (await checkAdmin(req.userId))) {
            folder = await SystemFolder.findOne({
                ...(isObjectId ? { _id: identifier } : { name: identifier })
            });
            if (folder) isSystemFolder = true;
        }

        if (!folder) return res.status(404).json({ error: 'Folder not found' });

        const folderId = folder._id;
        const folderName = folder.name;

        // --- NẾU LÀ FOLDER HỆ THỐNG ---
        if (isSystemFolder) {
    const groupsInFolder = await GroupSetting.find({ 
        isGlobal: true, 
        folder: { $regex: new RegExp(`^${folderName}$`, 'i') } 
    });
    const groupNames = groupsInFolder.map(g => g.groupName);
    
    // Xóa tất cả từ vựng thuộc các group con + group tự tạo
    const allGroupNames = [...groupNames, folderName];
    await SystemVocabulary.deleteMany({ group: { $in: allGroupNames } });

    // Xóa GroupSetting theo folder + theo tên tự tạo
    await GroupSetting.deleteMany({ 
        isGlobal: true, 
        $or: [
            { folder: { $regex: new RegExp(`^${folderName}$`, 'i') } },
            { groupName: folderName }
        ]
    });

    await SystemFolder.findByIdAndDelete(folderId);
    return res.json({ message: 'Deleted system folder, groups, and words successfully' });
}
        
        else {
            const savedWords = await SavedWord.find({ folderId, userId: req.userId });
            const systemWordIds = savedWords.map(sw => sw.wordId);
            if (systemWordIds.length > 0) {
                await UserProgress.deleteMany({ userId: req.userId, wordId: { $in: systemWordIds } });
            }
            await SavedWord.deleteMany({ folderId, userId: req.userId });

            const groupsInFolder = await GroupSetting.find({ 
                userId: req.userId, 
                folder: { $regex: new RegExp(`^${folderName}$`, 'i') } 
            });
            const groupNames = groupsInFolder.map(g => g.groupName);
            
            const allGroupNames = [...groupNames, folderName]; 
            await SystemVocabulary.deleteMany({ group: { $in: allGroupNames } });

            await GroupSetting.deleteMany({ 
                userId: req.userId, 
                folder: { $regex: new RegExp(`^${folderName}$`, 'i') } 
            });
            await Folder.findByIdAndDelete(folderId);

            return res.json({ message: 'Deleted personal folder, groups, and words successfully' });
        }
    } catch (err) {
        console.error("Error deleting folder:", err);
        res.status(500).json({ error: 'Error deleting folder' });
    }
});

router.get('/folders', verifyToken, async (req, res) => {
    try {
        const folders = await Folder.find({ 
            userId: req.userId,
            isGlobal: false,
            isSystemSaved: true 
        }).sort({ createdAt: -1 });
        res.json(folders);
    } catch (err) {
        res.status(500).json({ error: 'Error getting directory list' });
    }
});
router.get('/folders/:id', verifyToken, async (req, res) => {
    try {
        const folder = await Folder.findOne({ _id: req.params.id, userId: req.userId });
        if (!folder) return res.status(404).json({ error: 'Directory not found' });

        const savedWords = await SavedWord.find({ folderId: folder._id, userId: req.userId })
            .populate('wordId') 
            .sort({ addedAt: 1 }); 

        res.json({ folder, savedWords });
    } catch (err) {
        res.status(500).json({ error: 'Error loading folder details' });
    }
});

router.put('/folders/:id/reset', verifyToken, async (req, res) => {
    try {
        const savedWords = await SavedWord.find({ folderId: req.params.id, userId: req.userId });
        const wordIds = savedWords.map(sw => sw.wordId);

        await UserProgress.deleteMany({ userId: req.userId, wordId: { $in: wordIds } });

        await SavedWord.updateMany(
            { folderId: req.params.id, userId: req.userId },
            { isMastered: false }
        );
        res.json({ message: 'Folder progress has been reset' });
    } catch (err) {
        res.status(500).json({ error: 'Error when resetting progress' });
    }
});

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
        res.json({ message: 'Added vocabulary successfully!' });
    } catch (err) {
        if (err.code === 11000) {
             return res.json({ message: 'Added words (ignore duplicates)' });
        }
        res.status(500).json({ error: 'Error when adding words' });
    }
});

router.put('/saved-words/:id/master', verifyToken, async (req, res) => {
    try {
        const { isMastered } = req.body; 
        const savedWord = await SavedWord.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            { isMastered: isMastered },
            { new: true }
        );

        if (savedWord && savedWord.wordId) {
            if (isMastered) {
                await UserProgress.findOneAndUpdate(
                    { userId: req.userId, wordId: savedWord.wordId },
                    { learned: true, updatedAt: new Date() },
                    { upsert: true }
                );
            } else {
                await UserProgress.findOneAndDelete({ 
                    userId: req.userId, 
                    wordId: savedWord.wordId 
                });
            }
        }

        res.json(savedWord);
    } catch (err) {
        console.error("Progress sync error:", err);
        res.status(500).json({ error: 'Update error' });
    }
});

router.get('/saved-words/all-ids', verifyToken, async (req, res) => {
    try {
        const savedWords = await SavedWord.find({ userId: req.userId }).select('wordId folderId');
        res.json(savedWords);
    } catch (err) {
        res.status(500).json({ error: 'ID list error' });
    }
});

router.put('/folders/:id', verifyToken, async (req, res) => {
    try {
        const { name } = req.body;
        
        let updatedFolder = await Folder.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            { name: name },
            { new: true }
        );

        if (!updatedFolder && (await checkAdmin(req.userId))) {
            updatedFolder = await SystemFolder.findOneAndUpdate(
                { _id: req.params.id },
                { name: name },
                { new: true }
            );
        }

        if (!updatedFolder) return res.status(404).json({ error: 'Directory not found' });
        res.json(updatedFolder);
    } catch (err) {
        res.status(500).json({ error: 'Error when renaming folder' });
    }
});

router.delete('/saved-words/:id', verifyToken, async (req, res) => {
    try {
        const savedWord = await SavedWord.findOne({
            _id: req.params.id,
            userId: req.userId
        });

        if (savedWord) {
            await UserProgress.findOneAndDelete({
                userId: req.userId,
                wordId: savedWord.wordId
            });
            
            await SavedWord.findByIdAndDelete(req.params.id);
        }
        
        res.json({ success: true, message: 'Updated progress successfully' });
    } catch (err) {
        console.error("Error deleting saved word:", err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;