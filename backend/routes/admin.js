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
router.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        await Vocabulary.deleteMany({ userId: req.params.id }); // Xóa luôn từ vựng của họ
        res.json({ success: true });
    } catch (e) { res.status(500).json(e); }
});

// Xem từ vựng của User (Chỉ Admin)
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