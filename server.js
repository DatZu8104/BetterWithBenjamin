// server.js - Phiên bản Full Tính Năng
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors());

// 1. KẾT NỐI MONGODB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Đã kết nối MongoDB!"))
  .catch(err => console.error("❌ Lỗi kết nối:", err));

// 2. ĐỊNH NGHĨA DATA MODEL (Phải khớp với Frontend)

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

// Schema cho FOLDER
const FolderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    color: { type: String, default: 'blue' },
    createdAt: { type: Number, default: Date.now } // Frontend bạn dùng number cho date
});
const Folder = mongoose.model('Folder', FolderSchema);

// Schema cho GROUP SETTINGS (Để biết Group nào nằm trong Folder nào)
const GroupSettingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    groupName: { type: String, required: true },
    folder: { type: String, default: "" }
});
const GroupSetting = mongoose.model('GroupSetting', GroupSettingSchema);

// Schema cho TỪ VỰNG (Updated khớp với Interface Word)
const VocabSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    english: { type: String, required: true },    // Frontend dùng 'english'
    definition: { type: String, required: true }, // Frontend dùng 'definition'
    type: [String],                               // Frontend dùng mảng ['n', 'v']
    group: { type: String, required: true },
    example: String,
    learned: { type: Boolean, default: false },   // Để lưu trạng thái đã thuộc
    createdAt: { type: Number, default: Date.now }
});
const Vocabulary = mongoose.model('Vocabulary', VocabSchema);


// 3. MIDDLEWARE AUTH
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: "Chưa đăng nhập" });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (err) {
        res.status(401).json({ error: "Token lỗi" });
    }
};

// 4. API ROUTES

// --- AUTH ---
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.json({ message: "Đăng ký thành công" });
    } catch (e) { res.status(500).json({ error: "Tên đã tồn tại" }); }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ error: "Sai tài khoản hoặc mật khẩu" });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ token, username });
});

// --- DATA SYNC (Lấy toàn bộ dữ liệu khi mở app) ---
app.get('/api/sync', verifyToken, async (req, res) => {
    try {
        const words = await Vocabulary.find({ userId: req.userId });
        const folders = await Folder.find({ userId: req.userId });
        const groupSettings = await GroupSetting.find({ userId: req.userId });
        
        // Trả về cấu trúc JSON y hệt cách Frontend đang cần
        res.json({ words, folders, groupSettings });
    } catch (e) { res.status(500).json({ error: "Lỗi lấy dữ liệu" }); }
});

// --- WORDS CRUD ---
app.post('/api/words', verifyToken, async (req, res) => {
    try {
        const newWord = new Vocabulary({ ...req.body, userId: req.userId });
        await newWord.save();
        res.json(newWord);
    } catch (e) { res.status(500).json(e); }
});

app.delete('/api/words/:id', verifyToken, async (req, res) => {
    try {
        await Vocabulary.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        res.json({ success: true });
    } catch (e) { res.status(500).json(e); }
});

// --- FOLDERS CRUD ---
app.post('/api/folders', verifyToken, async (req, res) => {
    try {
        const newFolder = new Folder({ ...req.body, userId: req.userId });
        await newFolder.save();
        res.json(newFolder);
    } catch (e) { res.status(500).json(e); }
});

app.delete('/api/folders/:name', verifyToken, async (req, res) => {
    try {
        // Xóa folder
        await Folder.findOneAndDelete({ name: req.params.name, userId: req.userId });
        // Cập nhật các group đang ở trong folder này ra ngoài
        await GroupSetting.updateMany(
            { userId: req.userId, folder: req.params.name }, 
            { folder: "" }
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json(e); }
});

// --- GROUPS CRUD ---
app.post('/api/groups', verifyToken, async (req, res) => {
    // Lưu hoặc cập nhật setting của group (ví dụ di chuyển folder)
    try {
        const { groupName, folder } = req.body;
        const updated = await GroupSetting.findOneAndUpdate(
            { userId: req.userId, groupName },
            { folder },
            { upsert: true, new: true } // Nếu chưa có thì tạo mới
        );
        res.json(updated);
    } catch (e) { res.status(500).json(e); }
});

app.delete('/api/groups', verifyToken, async (req, res) => {
    try {
        const { groupName } = req.body;
        // 1. Xóa setting của group
        await GroupSetting.findOneAndDelete({ userId: req.userId, groupName });
        // 2. Xóa tất cả từ vựng trong group đó
        await Vocabulary.deleteMany({ userId: req.userId, group: groupName });
        res.json({ success: true });
    } catch (e) { res.status(500).json(e); }
});


// CHẠY SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server nâng cấp chạy tại port ${PORT}`));