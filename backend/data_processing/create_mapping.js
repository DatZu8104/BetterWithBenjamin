// dịch tự động
const fs = require('fs');
const path = require('path');
const translate = require('@iamtraction/google-translate');

// Đường dẫn file
const INPUT_FILE = path.join(__dirname, 'current_db_data.json');
const OUTPUT_FILE = path.join(__dirname, 'vi_translations_mapping.json');

// Hàm delay để không bị Google block
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function createMapping() {
    console.log("🚀 BẮT ĐẦU GIAI ĐOẠN 2: DỊCH VÀ TẠO FILE MAPPING...");

    // 1. Kiểm tra file gốc
    if (!fs.existsSync(INPUT_FILE)) {
        console.error("❌ Không tìm thấy file current_db_data.json. Hãy chạy Giai đoạn 1 trước!");
        process.exit(1);
    }

    const rawData = fs.readFileSync(INPUT_FILE, 'utf-8');
    const words = JSON.parse(rawData);
    console.log(`📦 Đã đọc file gốc: ${words.length} từ vựng.`);

    // 2. Load Checkpoint (Đọc file mapping cũ nếu có để chạy tiếp)
    let mappingData = [];
    if (fs.existsSync(OUTPUT_FILE)) {
        const existingData = fs.readFileSync(OUTPUT_FILE, 'utf-8');
        if (existingData) {
            mappingData = JSON.parse(existingData);
            console.log(`🔄 Tìm thấy bản nháp (checkpoint). Đã dịch sẵn ${mappingData.length} từ. Sẽ chạy tiếp...`);
        }
    }

    // Tạo một Set chứa ID các từ đã dịch để tra cứu cho nhanh
    const completedWordIds = new Set(mappingData.map(item => item.word_id.toString()));

    let newTranslationsCount = 0;

    // 3. Vòng lặp dịch thuật
    for (let i = 0; i < words.length; i++) {
        const doc = words[i];
        const wordIdStr = doc._id.toString();

        // NẾU TỪ NÀY ĐÃ DỊCH RỒI -> BỎ QUA
        if (completedWordIds.has(wordIdStr)) {
            continue; 
        }

        const translatedDefinitions = [];
        let hasError = false;

        // Dịch từng định nghĩa của từ
        for (let j = 0; j < doc.definitions.length; j++) {
            const defObj = doc.definitions[j];
            
            try {
                const res = await translate(defObj.definition, { from: 'en', to: 'vi' });
                translatedDefinitions.push({
                    order: defObj.order,
                    definition_en: defObj.definition, // Lưu lại tiếng Anh để lát mở file ra so sánh cho dễ
                    definition_vi: res.text
                });
                
                await delay(800); // Tạm dừng 0.8 giây giữa các câu
            } catch (error) {
                console.error(`\n❌ Lỗi khi dịch từ [${doc.word}]:`, error.message);
                hasError = true;
                
                if (error.message.includes("Too Many Requests")) {
                    console.log("⏳ Google bắt nghỉ mệt. Đợi 10 giây rồi chạy tiếp...");
                    await delay(10000);
                }
                break; // Thoát vòng lặp định nghĩa, lát chạy lại từ này sau
            }
        }

        // 4. Lưu lại (Checkpoint) ngay lập tức
        if (!hasError && translatedDefinitions.length > 0) {
            mappingData.push({
                word_id: wordIdStr,
                word: doc.word,
                translations: translatedDefinitions
            });

            // Ghi đè vào file Mapping sau mỗi 10 từ để an toàn (không ghi liên tục xót ổ cứng)
            if (newTranslationsCount % 10 === 0) {
                fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mappingData, null, 2), 'utf-8');
            }

            newTranslationsCount++;
            process.stdout.write(`\r✅ Tiến độ: Đã dịch thêm ${newTranslationsCount} từ. Đang xử lý: [${doc.word}]...       `);
        }
    }

    // Ghi cú chót khi hoàn thành toàn bộ
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mappingData, null, 2), 'utf-8');
    
    console.log("\n\n==========================================");
    console.log("🎉 XONG GIAI ĐOẠN 2!");
    console.log(`📁 File tổng hợp nghĩa đã được lưu tại: backend/vi_translations_mapping.json`);
    console.log(`👉 BẠN CÓ THỂ MỞ FILE NÀY LÊN ĐỂ KIỂM TRA HOẶC SỬA LỖI CHÍNH TẢ!`);
    console.log("==========================================");
}

createMapping();