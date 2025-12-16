const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { verifyToken, loginLimiter } = require('../middleware');

// Đăng ký
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: "Thiếu thông tin" });

        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ error: "Tên đăng nhập đã tồn tại" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();

        res.json({ message: "Đăng ký thành công" });
    } catch (e) { res.status(500).json({ error: "Lỗi Server" }); }
});

// Đăng nhập (Có loginLimiter bảo vệ)
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ error: "Sai tài khoản hoặc mật khẩu" });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, username, role: user.role });
    } catch (e) { res.status(500).json({ error: "Lỗi Server" }); }
});

// Đổi mật khẩu
router.post('/change-password', verifyToken, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return res.status(400).json({ error: "Mật khẩu cũ sai" });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ success: true, message: "Đổi mật khẩu thành công" });
    } catch (e) { res.status(500).json({ error: "Lỗi Server" }); }
});

module.exports = router;