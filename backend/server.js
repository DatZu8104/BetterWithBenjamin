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

// 2. ĐỊNH NGHĨA DATA MODEL 
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' }, // 'user' hoặc 'admin'
    createdAt: { type: Date, default: Date.now }
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
const verifyToken = async (req, res, next) => { // Thêm async
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: "Chưa đăng nhập" });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // ✅ THÊM ĐOẠN NÀY: Kiểm tra xem User còn trong DB không
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ error: "Tài khoản không tồn tại" });
        }

        req.userId = decoded.id;
        next();
    } catch (err) {
        res.status(401).json({ error: "Token lỗi" });
    }
};

// 2. MIDDLEWARE CHECK ADMIN
const verifyAdmin = async (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: "Chưa đăng nhập" });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: "Không có quyền Admin" });
        }
        
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
// 3. ADMIN ROUTES (Thêm vào cuối phần routes)

// Lấy danh sách tất cả user
app.get('/api/admin/users', verifyAdmin, async (req, res) => {
    try {
        // Lấy tất cả user trừ password, sắp xếp mới nhất
        const users = await User.find({}, '-password').sort({ createdAt: -1 });
        
        // Đếm số từ vựng của mỗi user để hiển thị cho đẹp
        const usersWithStats = await Promise.all(users.map(async (u) => {
            const wordCount = await Vocabulary.countDocuments({ userId: u._id });
            return { ...u.toObject(), wordCount };
        }));

        res.json(usersWithStats);
    } catch (e) { res.status(500).json(e); }
});

// Xóa User (Xóa sạch dữ liệu liên quan)
app.delete('/api/admin/users/:id', verifyAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        // Xóa User
        await User.findByIdAndDelete(userId);
        // Xóa Từ vựng
        await Vocabulary.deleteMany({ userId });
        // Xóa Folder
        await Folder.deleteMany({ userId });
        // Xóa Group Settings
        await GroupSetting.deleteMany({ userId });

        res.json({ success: true, message: "Đã xóa người dùng và toàn bộ dữ liệu" });
    } catch (e) { res.status(500).json(e); }
});

// Xem từ vựng của 1 User cụ thể
app.get('/api/admin/users/:id/words', verifyAdmin, async (req, res) => {
    try {
        const words = await Vocabulary.find({ userId: req.params.id }).sort({ createdAt: -1 });
        res.json(words);
    } catch (e) { res.status(500).json(e); }
});

// Admin xóa từ vựng bất kỳ
app.delete('/api/admin/words/:id', verifyAdmin, async (req, res) => {
    try {
        await Vocabulary.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json(e); }
}); 

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ error: "Sai tài khoản hoặc mật khẩu" });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    // ✅ Trả về thêm user.role
    res.json({ token, username, role: user.role }); 
});
app.post('/api/words/reset-batch', verifyToken, async (req, res) => {
    try {
        const { ids } = req.body; // Nhận danh sách ID cần reset
        if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: "Thiếu danh sách ID" });

        // Cập nhật 1 lần cho tất cả ID trong danh sách
        await Vocabulary.updateMany(
            { _id: { $in: ids }, userId: req.userId },
            { $set: { learned: false } }
        );
        
        res.json({ success: true, count: ids.length });
    } catch (e) { res.status(500).json(e); }
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
// ... (Các đoạn code cũ giữ nguyên)

// ✅ THÊM API CẬP NHẬT TRẠNG THÁI TỪ VỰNG (Học xong từ nào lưu từ đó)
app.patch('/api/words/:id', verifyToken, async (req, res) => {
    try {
        const { learned } = req.body; // Nhận { learned: true/false }
        const updatedWord = await Vocabulary.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            { $set: { learned: learned } },
            { new: true }
        );
        res.json(updatedWord);
    } catch (e) { res.status(500).json(e); }
});

// ... (các đoạn code cũ)

// ✅ THÊM ĐOẠN NÀY VÀO: API Cập nhật trạng thái từ vựng
app.patch('/api/words/:id', verifyToken, async (req, res) => {
    try {
        const { learned } = req.body; // Lấy trạng thái mới từ Frontend gửi lên
        
        // Tìm từ vựng theo ID và UserID, sau đó cập nhật
        const updatedWord = await Vocabulary.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            { $set: { learned: learned } }, // Lưu trạng thái mới
            { new: true } // Trả về kết quả mới nhất
        );
        
        res.json(updatedWord);
    } catch (e) {
        console.error("Lỗi cập nhật từ:", e);
        res.status(500).json({ error: "Không thể cập nhật từ" });
    }
});

// ... (code cũ)

// --- API ĐỔI MẬT KHẨU ---
app.post('/api/change-password', verifyToken, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.userId;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: "Vui lòng nhập đủ thông tin" });
        }

        // 1. Tìm user trong DB
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "Tài khoản không tồn tại" });

        // 2. Kiểm tra mật khẩu cũ
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Mật khẩu cũ không chính xác" });
        }

        // 3. Mã hóa mật khẩu mới và lưu lại
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ success: true, message: "Đổi mật khẩu thành công!" });
    } catch (error) {
        console.error("Change pass error:", error);
        res.status(500).json({ error: "Lỗi Server" });
    }
});

// --- API IMPORT DATA (CẤU TRÚC MỚI) ---
app.post('/api/import', verifyToken, async (req, res) => {
    try {
        // Lấy dữ liệu theo cấu trúc file JSON của bạn
        const { words, learned, groups } = req.body; 
        const userId = req.userId;

        if (!words || !Array.isArray(words)) {
            return res.status(400).json({ error: "File không hợp lệ: Thiếu danh sách words" });
        }

        // 1. Tạo bộ lọc ID các từ đã học (để tra cứu cho nhanh)
        // File JSON của bạn để ID đã học trong mảng "learned": ["id1", "id2"...]
        const learnedSet = new Set(learned || []);

        // 2. Chuẩn bị dữ liệu để ghi vào MongoDB
        const operations = words.map(word => {
            // Kiểm tra: Từ này có nằm trong danh sách đã học không?
            // Hoặc bản thân từ đó có trường learned=true không?
            const isLearned = learnedSet.has(word.id) || word.learned === true;

            return {
                updateOne: {
                    // Tìm từ theo Tiếng Anh + User (để tránh trùng lặp)
                    filter: { userId: userId, english: word.english },
                    
                    update: { 
                        $set: {
                            definition: word.definition,
                            type: Array.isArray(word.type) ? word.type : [word.type], // Đảm bảo type luôn là mảng
                            group: word.group || "Chưa phân loại",
                            learned: isLearned, // ✅ Cập nhật trạng thái học đúng
                            updatedAt: new Date()
                        },
                        $setOnInsert: { 
                            userId: userId,
                            createdAt: new Date()
                        }
                    },
                    upsert: true // Nếu chưa có thì tạo mới, có rồi thì cập nhật
                }
            };
        });

        // 3. Thực thi ghi vào Database
        if (operations.length > 0) {
            await Vocabulary.bulkWrite(operations);
        }

        // 4. (Tùy chọn) Xử lý Groups nếu cần thiết
        // Vì ứng dụng tự động nhóm theo tên group của từ, nên bước này không bắt buộc 
        // trừ khi bạn muốn lưu màu sắc folder.

        res.json({ success: true, message: `Đã nhập thành công ${operations.length} từ!` });

    } catch (error) {
        console.error("Import error:", error);
        res.status(500).json({ error: "Lỗi Server khi nhập dữ liệu" });
    }
});


// CHẠY SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server nâng cấp chạy tại port ${PORT}`));