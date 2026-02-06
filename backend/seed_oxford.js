const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); 

// ✅ QUAN TRỌNG: Import SystemVocabulary thay vì Vocabulary
const { SystemVocabulary } = require('./models'); 

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("❌ Lỗi: Không tìm thấy MONGO_URI trong file .env");
    process.exit(1);
}

const importData = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Đọc file JSON
        const jsonPath = path.join(__dirname, 'full-word.json');
        const rawData = fs.readFileSync(jsonPath, 'utf-8');
        const wordsData = JSON.parse(rawData);

        // 2. XÓA DỮ LIỆU CŨ TRONG BẢNG HỆ THỐNG
        // ✅ Dùng SystemVocabulary
        console.log("🗑 Đang xóa dữ liệu hệ thống cũ...");
        await SystemVocabulary.deleteMany({}); 

        // 3. Chuẩn bị dữ liệu mới
        const vocabularyDocs = wordsData.map(item => {
            const val = item.value;
            const definition = val.definition || `(${val.type}) See Dictionary`; 
            const example = (val.examples && val.examples.length > 0) ? val.examples[0] : "";
            const levelGroup = val.level ? `Oxford Level ${val.level}` : "Oxford Others";

            return {
                // ❌ KHÔNG CẦN userId nữa (vì đây là SystemVocabulary)
                english: val.word,
                definition: definition, 
                type: val.type ? [val.type] : [],
                example: example,
                group: levelGroup,
                // Không cần isGlobal hay learned ở đây
                createdAt: new Date()
            };
        });

        // 4. Lưu vào DB
        // ✅ Dùng SystemVocabulary
        console.log(`⏳ Đang thêm ${vocabularyDocs.length} từ vào Bảng Hệ Thống...`);
        await SystemVocabulary.insertMany(vocabularyDocs);

        console.log('🎉 Import thành công vào SystemVocabulary!');
        process.exit();

    } catch (error) {
        console.error('❌ Lỗi Import:', error);
        process.exit(1);
    }
};

importData();