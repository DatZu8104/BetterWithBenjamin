//Nối dữ liệu tiếng Việtds
const fs = require('fs');
const path = require('path');

// Đường dẫn các file
const DB_FILE = path.join(__dirname, 'current_db_data.json');
const MAPPING_FILE = path.join(__dirname, 'vi_translations_mapping.json');
const OUTPUT_FILE = path.join(__dirname, 'final_db_ready.json');

function mergeData() {
    console.log("🚀 BẮT ĐẦU GIAI ĐOẠN 3: GỘP DỮ LIỆU...");

    // 1. Kiểm tra xem 2 file có tồn tại không
    if (!fs.existsSync(DB_FILE) || !fs.existsSync(MAPPING_FILE)) {
        console.error("❌ Thiếu file! Hãy chắc chắn bạn có đủ 'current_db_data.json' và 'vi_translations_mapping.json'");
        process.exit(1);
    }

    // 2. Đọc cả 2 file lên bộ nhớ
    const dbData = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    const mappingData = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf-8'));
    
    console.log(`📦 Đã đọc DB gốc: ${dbData.length} từ.`);
    console.log(`📦 Đã đọc bản dịch: ${mappingData.length} từ.`);

    // 3. Xây dựng "Từ điển tra cứu nhanh" (Lookup Table) từ file Mapping
    // Cấu trúc: lookupTable["698ad5ffc..."][1] = "nghĩa tiếng việt số 1"
    const lookupTable = {};
    mappingData.forEach(item => {
        const wordId = item.word_id;
        lookupTable[wordId] = {};
        
        item.translations.forEach(trans => {
            lookupTable[wordId][trans.order] = trans.definition_vi;
        });
    });

    // 4. Bắt đầu "khâu" tiếng Việt vào file DB gốc
    let updatedWordsCount = 0;
    let totalDefinitionsUpdated = 0;

    for (let i = 0; i < dbData.length; i++) {
        const doc = dbData[i];
        const wordId = doc._id.toString();

        // Nếu tìm thấy từ này trong bảng tra cứu bản dịch
        if (lookupTable[wordId]) {
            let wordHasNewTranslation = false;

            // Quét từng nghĩa gốc của nó
            for (let j = 0; j < doc.definitions.length; j++) {
                const def = doc.definitions[j];
                const translatedText = lookupTable[wordId][def.order];

                // Nếu có nghĩa tiếng Việt tương ứng -> Gán vào object gốc
                if (translatedText) {
                    def.definition_vi = translatedText;
                    wordHasNewTranslation = true;
                    totalDefinitionsUpdated++;
                }
            }

            if (wordHasNewTranslation) {
                updatedWordsCount++;
            }
        }
    }

    // 5. Lưu kết quả ra file mới
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(dbData, null, 2), 'utf-8');

    console.log("\n==========================================");
    console.log("🎉 KHÂU DỮ LIỆU THÀNH CÔNG!");
    console.log(`✅ Số từ vựng được cập nhật: ${updatedWordsCount}`);
    console.log(`✅ Tổng số định nghĩa được thêm tiếng Việt: ${totalDefinitionsUpdated}`);
    console.log(`📁 File hoàn chỉnh đã được lưu tại: backend/final_db_ready.json`);
    console.log("==========================================");
}

mergeData();