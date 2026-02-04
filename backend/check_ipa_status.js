require('dotenv').config();
const mongoose = require('mongoose');

// Khai báo Schema (chỉ cần các trường cần check)
const vocabularySchema = new mongoose.Schema({
    english: String,
    ipa: String, // Đây là cái mình cần soi
}, { strict: false });

const SystemVocabulary = mongoose.model('SystemVocabulary', vocabularySchema, 'systemvocabularies');

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log("🔥 Đã kết nối DB.");

        // Lấy thử 5 từ đầu tiên
        const docs = await SystemVocabulary.find({}).limit(5);

        if (docs.length === 0) {
            console.log("⚠️ Database đang rỗng! Bạn cần chạy bước Import.");
        } else {
            console.log("\n--- KẾT QUẢ SOI DỮ LIỆU ---");
            docs.forEach(doc => {
                console.log(`Từ: [${doc.english}]`);
                // Kiểm tra xem có IPA không
                if (doc.ipa) {
                    console.log(`✅ IPA: ${doc.ipa}`);
                } else {
                    console.log(`❌ IPA: (Trống/Chưa có)`);
                }
                console.log("---------------------------");
            });
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();