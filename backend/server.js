const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

// Import Routes & Middleware
const { globalLimiter } = require('./middleware');
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const adminRoutes = require('./routes/admin');

dotenv.config();
const app = express();

// --- CONFIG SECURITY ---
app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
}));

// ✅ 1. Thêm dòng này để đọc dữ liệu Form (Bắt buộc)
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ 2. Dòng này để đọc JSON
app.use(express.json({ limit: '10mb' }));

// ❌ 3. TẠM THỜI TẮT DÒNG NÀY (Thêm // ở đầu)
// app.use(mongoSanitize()); 

app.use('/api', globalLimiter); 

// --- DATABASE CONNECT ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// --- ROUTES ---
app.use('/api', authRoutes);
app.use('/api', dataRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));