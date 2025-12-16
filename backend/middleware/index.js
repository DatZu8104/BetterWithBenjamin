const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { User } = require('../models');

// 1. Rate Limiters (Chống Spam)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 200, 
    message: "Quá nhiều request, vui lòng thử lại sau."
});

const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, 
    max: 10, 
    message: "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi 5 phút."
});

// 2. Verify Token (Kiểm tra đăng nhập)
const verifyToken = async (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: "Chưa đăng nhập (No Token)" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(401).json({ error: "Tài khoản không tồn tại" });

        req.userId = decoded.id;
        req.userRole = user.role;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Phiên đăng nhập hết hạn" });
    }
};

// 3. Verify Admin (Kiểm tra quyền Admin)
const verifyAdmin = (req, res, next) => {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ error: "Bạn không có quyền Admin" });
    }
    next();
};

module.exports = { globalLimiter, loginLimiter, verifyToken, verifyAdmin };