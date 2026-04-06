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
        console.log("🔥 Connected to DB.");

        // Lấy thử 5 từ đầu tiên
        const docs = await SystemVocabulary.find({}).limit(5);

        if (docs.length === 0) {
            console.log("⚠️ Database is empty! You need to run the Import step.");
        } else {
            console.log("\n--- DATA INSPECTION RESULT ---");
            docs.forEach(doc => {
                console.log(`Word: [${doc.english}]`);
                // Kiểm tra xem có IPA không
                if (doc.ipa) {
                    console.log(`✅ IPA: ${doc.ipa}`);
                } else {
                    console.log(`❌ IPA: (Empty/Not found)`);
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