const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'final_db_ready.json');
const OUTPUT_FILE = path.join(__dirname, 'missing_words.json');

function findMissingTranslations() {
    console.log("🔍 ĐANG QUÉT TÌM CÁC TỪ THIẾU TIẾNG VIỆT...");

    if (!fs.existsSync(DB_FILE)) {
        console.error("❌ Không tìm thấy file final_db_ready.json");
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    const missingWords = [];

    data.forEach(doc => {
        let isMissing = false;

        // Trường hợp 1: Từ này hoàn toàn không có mảng định nghĩa
        if (!doc.definitions || doc.definitions.length === 0) {
            isMissing = true;
        } else {
            // Trường hợp 2: Có mảng định nghĩa nhưng bị thiếu thuộc tính 'definition_vi'
            for (let i = 0; i < doc.definitions.length; i++) {
                if (!doc.definitions[i].definition_vi || doc.definitions[i].definition_vi.trim() === '') {
                    isMissing = true;
                    break;
                }
            }
        }

        if (isMissing) {
            missingWords.push({
                _id: doc._id,
                word: doc.word,
                type: doc.type,
                definitions_count: doc.definitions ? doc.definitions.length : 0
            });
        }
    });

    console.log(`\n================================`);
    console.log(`🚨 KẾT QUẢ: Bắt được ${missingWords.length} từ bị lỗi/thiếu tiếng Việt!`);
    
    if (missingWords.length > 0) {
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(missingWords, null, 2), 'utf-8');
        console.log(`📁 Danh sách chi tiết đã xuất ra file: backend/missing_words.json`);
        
        console.log("\n👀 Danh sách 15 từ đầu tiên để bạn xem nhanh:");
        missingWords.slice(0, 15).forEach((item, index) => {
            console.log(`  ${index + 1}. [${item.word}] - Loại từ: ${item.type} - Số nghĩa gốc: ${item.definitions_count}`);
        });
    }
    console.log(`================================\n`);
}

findMissingTranslations();