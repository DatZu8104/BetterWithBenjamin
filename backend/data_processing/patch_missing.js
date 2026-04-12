//Vá lỗi từ bị thiếu
const fs = require('fs');
const path = require('path');
const translate = require('@iamtraction/google-translate');

const DB_FILE = path.join(__dirname, 'final_db_ready.json');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function patchMissingTranslations() {
    console.log("🛠️ BẮT ĐẦU VÁ LỖI CÁC TỪ THIẾU TIẾNG VIỆT...\n");

    if (!fs.existsSync(DB_FILE)) {
        console.error("❌ Không tìm thấy file final_db_ready.json");
        process.exit(1);
    }

    // Đọc file dữ liệu hiện tại
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    let patchedWordsCount = 0;
    let emptyWordsCount = 0;

    for (let i = 0; i < data.length; i++) {
        const doc = data[i];

        // Nếu từ này hoàn toàn không có định nghĩa (Nhóm 2) -> Bỏ qua
        if (!doc.definitions || doc.definitions.length === 0) {
            emptyWordsCount++;
            continue;
        }

        let isModified = false;

        // Quét từng nghĩa của từ (Nhóm 1)
        for (let j = 0; j < doc.definitions.length; j++) {
            const def = doc.definitions[j];

            // Nếu nghĩa này có tiếng Anh nhưng chưa có tiếng Việt
            if (def.definition && (!def.definition_vi || def.definition_vi.trim() === '')) {
                try {
                    const res = await translate(def.definition, { from: 'en', to: 'vi' });
                    def.definition_vi = res.text;
                    isModified = true;
                    
                    await delay(1000); // Đợi 1 giây để Google không block
                } catch (err) {
                    console.error(`❌ Lỗi API khi vá từ [${doc.word}]:`, err.message);
                    if (err.message.includes("Too Many Requests")) {
                        console.log("⏳ Tạm nghỉ 10 giây...");
                        await delay(10000);
                    }
                }
            }
        }

        // Nếu có vá thành công ít nhất 1 nghĩa, báo cáo ra màn hình
        if (isModified) {
            patchedWordsCount++;
            console.log(`✅ Đã vá xong từ: [${doc.word}]`);
            
            // Ghi đè lại file liên tục để tránh mất dữ liệu
            fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
        }
    }

    console.log("\n==========================================");
    console.log("🎉 HOÀN TẤT VÁ LỖI!");
    console.log(`✅ Đã dịch bổ sung thành công: ${patchedWordsCount} từ.`);
    console.log(`⚠️ Có ${emptyWordsCount} từ bị rỗng định nghĩa tiếng Anh gốc (Cần bạn tự bổ sung sau bằng tay).`);
    console.log("==========================================");
}

patchMissingTranslations();