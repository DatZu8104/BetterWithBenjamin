const AdmZip = require('adm-zip');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Tên file Anki của bạn
const ANKI_FILE_NAME = "The_Oxford_5000_Most_Important_Words.apkg"; 
const TEMP_DIR = "./temp_check_anki";

try {
    // 1. Giải nén nhanh
    if (!fs.existsSync(ANKI_FILE_NAME)) {
        throw new Error("❌ Không tìm thấy file .apkg!");
    }
    const zip = new AdmZip(ANKI_FILE_NAME);
    zip.extractAllTo(TEMP_DIR, true);

    // 2. Đọc thử 1 dòng
    const dbPath = path.join(TEMP_DIR, 'collection.anki2');
    const db = new Database(dbPath, { readonly: true });
    
    // Lấy đúng 1 thẻ đầu tiên để soi
    const row = db.prepare('SELECT flds FROM notes LIMIT 1').get();
    
    if (row) {
        // Anki ngăn cách các trường bằng ký tự đặc biệt \x1f
        const fields = row.flds.split('\x1f');

        console.log("\n==========================================");
        console.log("🔍 CẤU TRÚC DỮ LIỆU CỦA FILE NÀY LÀ:");
        console.log("==========================================\n");
        
        fields.forEach((content, index) => {
            // Cắt ngắn bớt nếu nội dung quá dài (ví dụ file base64 ảnh)
            const displayContent = content.length > 100 ? content.substring(0, 100) + "..." : content;
            console.log(`👉 [Index ${index}]: ${displayContent}`);
        });
        
        console.log("\n==========================================");
        console.log("💡 HÃY COPY KẾT QUẢ NÀY GỬI CHO TÔI ĐỂ TÔI SỬA SCRIPT IMPORT!");
    } else {
        console.log("❌ File rỗng, không có dữ liệu note nào.");
    }

    db.close();
    // Dọn dẹp
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });

} catch (error) {
    console.error("Lỗi:", error.message);
}