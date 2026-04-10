require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');

// Sử dụng strict: false để lấy TẤT CẢ các cột đang có thực tế trong DB
const SystemVocabulary = mongoose.model('SystemVocabulary', new mongoose.Schema({}, { strict: false }), 'systemvocabularies');

async function exportDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log("✅ Đã kết nối MongoDB.");

        // Lấy toàn bộ data dạng object thuần (lean)
        const data = await SystemVocabulary.find({}).lean();
        console.log(`📦 Đã tìm thấy ${data.length} từ vựng trong Database.`);

        // Ghi ra file JSON
        fs.writeFileSync('current_db_data.json', JSON.stringify(data, null, 2), 'utf-8');
        console.log("🎉 Đã xuất dữ liệu thành công ra file: backend/current_db_data.json");

        process.exit(0);
    } catch (error) {
        console.error("❌ Lỗi:", error);
        process.exit(1);
    }
}

exportDB();