const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); 

const { User, Vocabulary } = require('./models');

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("❌ Lỗi: Không tìm thấy MONGO_URI trong file .env");
    process.exit(1);
}

const importData = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Tìm hoặc Tạo Admin
        let adminUser = await User.findOne({ role: 'admin' });
        if (!adminUser) {
            console.log('⚠️ Đang tạo Admin mặc định...');
            adminUser = await User.create({
                username: 'system_admin',
                password: 'admin_password_123', 
                role: 'admin'
            });
        }

        // 2. Đọc file JSON
        const jsonPath = path.join(__dirname, 'full-word.json');
        const rawData = fs.readFileSync(jsonPath, 'utf-8');
        const wordsData = JSON.parse(rawData);

        // 3. QUAN TRỌNG: Xóa dữ liệu hệ thống cũ (để nạp lại cái mới có isGlobal)
        console.log("🗑 Đang xóa dữ liệu hệ thống cũ...");
        await Vocabulary.deleteMany({ isGlobal: true });
        // Nếu lần trước import chưa có isGlobal, lệnh trên có thể không xóa được gì.
        // Bạn có thể xóa tạm bằng userId của admin nếu cần thiết, nhưng chạy đoạn dưới là quan trọng nhất.

        // 4. Chuẩn bị dữ liệu mới
        const vocabularyDocs = wordsData.map(item => {
            const val = item.value;
            const definition = val.definition || `(${val.type}) See Oxford Dictionary`; 
            const example = (val.examples && val.examples.length > 0) ? val.examples[0] : "";
            const levelGroup = val.level ? `Oxford Level ${val.level}` : "Oxford Others";

            return {
                userId: adminUser._id,
                english: val.word,
                definition: definition, 
                type: val.type ? [val.type] : [],
                example: example,
                group: levelGroup,
                learned: false,
                isGlobal: true,    // ✅ ĐÂY LÀ DÒNG QUAN TRỌNG NHẤT
                createdAt: new Date()
            };
        });

        // 5. Lưu vào DB
        console.log(`⏳ Đang thêm ${vocabularyDocs.length} từ vào Database...`);
        await Vocabulary.insertMany(vocabularyDocs);

        console.log('🎉 Import thành công! Dữ liệu đã được cập nhật isGlobal: true');
        process.exit();

    } catch (error) {
        console.error('❌ Lỗi Import:', error);
        process.exit(1);
    }
};

importData();