const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { User } = require('../models');

//  Rate Limiters 
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 200, 
    message: "Too many requests, please try again later."
});

const loginLimiter = process.env.NODE_ENV === 'production'
    ? rateLimit({
        windowMs: 5 * 60 * 1000,
        max: 10,
        handler: (req, res) => {
            res.status(429).json({ error: "Too many login attempts. Please wait 5 minutes." });
        }
    })
    : (req, res, next) => next(); 

//  Verify Token
const verifyToken = async (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: "Not logged in (No Token)" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(401).json({ error: "Account does not exist" });

        req.userId = decoded.id;
        req.userRole = user.role;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Login session expired" });
    }
};

//  Verify Admin
const verifyAdmin = (req, res, next) => {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ error: "You do not have Admin rights" });
    }
    next();
};

module.exports = { globalLimiter, loginLimiter, verifyToken, verifyAdmin };