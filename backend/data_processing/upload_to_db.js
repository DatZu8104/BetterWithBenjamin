//Đẩy dữ liệu hoàn chỉnh lên lại MongoDB
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'final_db_ready.json');

// Khai báo Model (strict: false để cho phép lưu trường definition_vi)
const SystemVocabulary = mongoose.model('SystemVocabulary', new mongoose.Schema({}, { strict: false }), 'systemvocabularies');

async function uploadToDB() {
    console.log("🚀 BẮT ĐẦU GIAI ĐOẠN 4: ĐẨY DỮ LIỆU LÊN MONGODB...\n");

    if (!fs.existsSync(DB_FILE)) {
        console.error("❌ Không tìm thấy file final_db_ready.json. Vui lòng kiểm tra lại!");
        process.exit(1);
    }

    try {
        // 1. Kết nối DB
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log("✅ Đã kết nối MongoDB thành công.");

        // 2. Đọc file
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        console.log(`📦 Đã đọc file final_db_ready.json: ${data.length} từ vựng.`);
        console.log("⏳ Đang chuẩn bị gói cập nhật (BulkWrite)...");

        // 3. Xây dựng danh sách các lệnh cập nhật
        const bulkOperations = data.map(doc => ({
            updateOne: {
                filter: { _id: doc._id }, // Tìm đúng từ theo ID
                update: { 
                    $set: { 
                        definitions: doc.definitions // Cập nhật (đè) mảng định nghĩa mới có tiếng Việt
                    } 
                }
            }
        }));

        // 4. Bắn lên Database theo từng cụm (Chunk) để không bị quá tải
        const CHUNK_SIZE = 1000;
        let totalUpdated = 0;

        console.log(`🚀 Bắt đầu bắn lên Database...`);
        for (let i = 0; i < bulkOperations.length; i += CHUNK_SIZE) {
            const chunk = bulkOperations.slice(i, i + CHUNK_SIZE);
            const result = await SystemVocabulary.bulkWrite(chunk);
            
            totalUpdated += result.modifiedCount;
            process.stdout.write("█"); // In thanh tiến độ
        }

        console.log("\n\n==========================================");
        console.log("🏆 CHÚC MỪNG! HOÀN TẤT DỰ ÁN 100%!");
        console.log(`✅ Đã cập nhật thành công ${totalUpdated} từ vựng trên Database.`);
        console.log("👉 Bây giờ bạn có thể mở ứng dụng web lên và tận hưởng thành quả!");
        console.log("==========================================");

        process.exit(0);

    } catch (error) {
        console.error("\n❌ LỖI HỆ THỐNG:", error);
        process.exit(1);
    }
}

uploadToDB();