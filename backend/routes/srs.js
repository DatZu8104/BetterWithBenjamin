const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const SrsProgress = require('../models/SrsProgress');
const { Vocabulary, SavedWord } = require('../models');
const { calculateNextReview, INITIAL_EASE_FACTOR } = require('../utils/srsAlgorithm');
const { verifyToken } = require('../middleware');

// ─────────────────────────────────────────────
// GET /api/srs/due
// Lấy tất cả từ đến hạn ôn hôm nay (cả personal & system)
// ─────────────────────────────────────────────
router.get('/due', verifyToken, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        const dueRecords = await SrsProgress.find({
            userId: req.userId,
            nextReview: { $lte: today }
        }).lean();

        // Tách personal và system
        const personalIds = dueRecords
            .filter(r => r.wordType === 'personal')
            .map(r => r.wordId);

        const systemIds = dueRecords
            .filter(r => r.wordType === 'system')
            .map(r => r.wordId);

        // Lấy chi tiết từ vựng
        const [personalWords, systemSavedWords] = await Promise.all([
            Vocabulary.find({ _id: { $in: personalIds }, userId: req.userId }).lean(),
            SavedWord.find({ wordId: { $in: systemIds }, userId: req.userId })
                .populate('wordId')
                .lean()
        ]);

        // Gắn SRS data vào từng từ
        const srsMap = {};
        dueRecords.forEach(r => { srsMap[r.wordId.toString()] = r; });

        const formattedPersonal = personalWords.map(w => ({
            ...w,
            wordType: 'personal',
            srs: srsMap[w._id.toString()] || null
        }));

        const formattedSystem = systemSavedWords
            .filter(sw => sw.wordId)
            .map(sw => ({
                ...sw.wordId,
                savedWordId: sw._id,
                wordType: 'system',
                srs: srsMap[sw.wordId._id.toString()] || null
            }));

        res.json({
            personal: formattedPersonal,
            system: formattedSystem,
            totalDue: formattedPersonal.length + formattedSystem.length
        });

    } catch (err) {
        console.error('SRS due error:', err);
        res.status(500).json({ error: 'Failed to fetch due words' });
    }
});

// ─────────────────────────────────────────────
// GET /api/srs/count
// Chỉ lấy số lượng từ đến hạn (dùng cho badge & notification)
// ─────────────────────────────────────────────
router.get('/count', verifyToken, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        const count = await SrsProgress.countDocuments({
            userId: req.userId,
            nextReview: { $lte: today }
        });

        res.json({ count });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch count' });
    }
});

// ─────────────────────────────────────────────
// POST /api/srs/review
// Cập nhật sau mỗi lần ôn (Again/Hard/Good/Easy)
// Body: { wordId, wordType, button }
// ─────────────────────────────────────────────
router.post('/review', verifyToken, async (req, res) => {
    try {
        const { wordId, wordType, button } = req.body;

        if (!wordId || !wordType || !button) {
            return res.status(400).json({ error: 'Missing wordId, wordType or button' });
        }

        if (!['personal', 'system'].includes(wordType)) {
            return res.status(400).json({ error: 'Invalid wordType' });
        }

        if (!['again', 'hard', 'good', 'easy'].includes(button)) {
            return res.status(400).json({ error: 'Invalid button' });
        }

        // Tìm record hiện tại hoặc tạo mới (upsert)
        let record = await SrsProgress.findOne({
            userId: req.userId,
            wordId: new mongoose.Types.ObjectId(wordId),
            wordType
        });

        if (!record) {
            // Từ chưa có SRS record → tạo mới với giá trị mặc định
            record = new SrsProgress({
                userId: req.userId,
                wordId: new mongoose.Types.ObjectId(wordId),
                wordType,
                interval: 1,
                repetition: 0,
                easeFactor: INITIAL_EASE_FACTOR,
                nextReview: new Date(),
                totalReviews: 0,
                correctReviews: 0
            });
        }

        // Tính toán SM-2
        const updated = calculateNextReview(record, button);
        const isCorrect = ['good', 'easy'].includes(button);

        record.interval = updated.interval;
        record.repetition = updated.repetition;
        record.easeFactor = updated.easeFactor;
        record.nextReview = updated.nextReview;
        record.lastReviewed = updated.lastReviewed;
        record.totalReviews += 1;
        if (isCorrect) record.correctReviews += 1;

        await record.save();

        res.json({
            success: true,
            nextReview: record.nextReview,
            interval: record.interval,
            easeFactor: record.easeFactor
        });

    } catch (err) {
        console.error('SRS review error:', err);
        res.status(500).json({ error: 'Failed to update SRS progress' });
    }
});

// ─────────────────────────────────────────────
// POST /api/srs/init
// Tạo SRS record khi người dùng nhấn "Đã thuộc" lần đầu
// trong learn mode thông thường
// Body: { wordId, wordType }
// ─────────────────────────────────────────────
router.post('/init', verifyToken, async (req, res) => {
    try {
        const { wordId, wordType } = req.body;

        if (!wordId || !wordType) {
            return res.status(400).json({ error: 'Missing wordId or wordType' });
        }

        const existing = await SrsProgress.findOne({
            userId: req.userId,
            wordId: new mongoose.Types.ObjectId(wordId),
            wordType
        });

        // Nếu đã có record rồi thì không làm gì, tránh reset tiến trình
        if (existing) return res.json({ success: true, alreadyExists: true });

        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + 1);
        nextReview.setHours(0, 0, 0, 0);

        const record = new SrsProgress({
            userId: req.userId,
            wordId: new mongoose.Types.ObjectId(wordId),
            wordType,
            interval: 1,
            repetition: 1,
            easeFactor: INITIAL_EASE_FACTOR,
            nextReview,
            totalReviews: 1,
            correctReviews: 1,
            lastReviewed: new Date()
        });

        await record.save();
        res.json({ success: true, alreadyExists: false });

    } catch (err) {
        console.error('SRS init error:', err);
        res.status(500).json({ error: 'Failed to init SRS record' });
    }
});

// ─────────────────────────────────────────────
// GET /api/srs/stats/:wordId?wordType=personal|system
// Lấy thống kê SRS của 1 từ cụ thể (dùng cho SmartReviewCard)
// ─────────────────────────────────────────────
router.get('/stats/:wordId', verifyToken, async (req, res) => {
    try {
        const { wordType } = req.query;

        const record = await SrsProgress.findOne({
            userId: req.userId,
            wordId: new mongoose.Types.ObjectId(req.params.wordId),
            wordType
        }).lean();

        if (!record) return res.json(null);

        res.json({
            interval: record.interval,
            repetition: record.repetition,
            easeFactor: record.easeFactor,
            nextReview: record.nextReview,
            totalReviews: record.totalReviews,
            correctReviews: record.correctReviews,
            accuracy: record.totalReviews > 0
                ? Math.round((record.correctReviews / record.totalReviews) * 100)
                : 0,
            lastReviewed: record.lastReviewed
        });

    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// ─────────────────────────────────────────────
// DELETE /api/srs/:wordId?wordType=personal|system
// Xóa SRS record khi user xóa từ (kèm confirm ở frontend)
// ─────────────────────────────────────────────
router.delete('/:wordId', verifyToken, async (req, res) => {
    try {
        const { wordType } = req.query;

        await SrsProgress.findOneAndDelete({
            userId: req.userId,
            wordId: new mongoose.Types.ObjectId(req.params.wordId),
            wordType
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete SRS record' });
    }
});
// ─────────────────────────────────────────────
// POST /api/srs/admin/time-shift
// Admin only — shift nextReview về quá khứ X ngày để test
// ─────────────────────────────────────────────
router.post('/admin/time-shift', verifyToken, async (req, res) => {
    try {
        const user = await require('../models').User.findById(req.userId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin only' });
        }

        const days = Number(req.body.days);
        if (!days || isNaN(days) || days <= 0) {
            return res.status(400).json({ error: 'Invalid days value' });
        }

        const records = await SrsProgress.find({ userId: req.userId });

        if (records.length === 0) {
            return res.json({ success: true, affected: 0, message: 'No records found' });
        }

        const bulkOps = records.map(record => {
            const original = record.isTimeShifted
                ? record.originalNextReview
                : record.nextReview;

            const shifted = new Date(record.nextReview);
            shifted.setDate(shifted.getDate() - days);
            shifted.setHours(0, 0, 0, 0);

            return {
                updateOne: {
                    filter: { _id: record._id },
                    update: {
                        $set: {
                            nextReview: shifted,
                            originalNextReview: original,
                            isTimeShifted: true
                        }
                    }
                }
            };
        });

        await SrsProgress.bulkWrite(bulkOps);

        res.json({
            success: true,
            affected: records.length,
            shiftedDays: days,
            message: `Shifted ${records.length} records back ${days} day(s)`
        });

    } catch (err) {
        console.error('Time shift error:', err);
        res.status(500).json({ error: 'Failed to time shift' });
    }
});

// ─────────────────────────────────────────────
// POST /api/srs/admin/time-reset
// Admin only — hoàn tác về ngày thật
// ─────────────────────────────────────────────
router.post('/admin/time-reset', verifyToken, async (req, res) => {
    try {
        const user = await require('../models').User.findById(req.userId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin only' });
        }

        const records = await SrsProgress.find({
            userId: req.userId,
            isTimeShifted: true,
            originalNextReview: { $ne: null }
        });

        if (records.length === 0) {
            return res.json({ success: true, affected: 0, message: 'Nothing to reset' });
        }

        const bulkOps = records.map(record => ({
            updateOne: {
                filter: { _id: record._id },
                update: {
                    $set: { nextReview: record.originalNextReview },
                    $unset: { originalNextReview: '', isTimeShifted: '' }
                }
            }
        }));

        await SrsProgress.bulkWrite(bulkOps);

        res.json({
            success: true,
            affected: records.length,
            message: `Reset ${records.length} records to real dates`
        });

    } catch (err) {
        console.error('Time reset error:', err);
        res.status(500).json({ error: 'Failed to reset time' });
    }
});


module.exports = router;