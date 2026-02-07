const AdmZip = require('adm-zip');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ANKI_FILE_NAME = "The_Oxford_5000_Most_Important_Words.apkg";
const TEMP_DIR = "./temp_analyze_example";

// --- HÀM XỬ LÝ VÍ DỤ NÂNG CAO ---
function cleanExampleAdvanced(html) {
    if (!html) return "";
    const $ = cheerio.load(html, null, false);

    // 1. Bóc tách từng dòng ví dụ (thường nằm trong thẻ <li>)
    let lines = [];
    $('li').each((i, el) => {
        lines.push($(el).text().trim());
    });

    // Nếu không có thẻ <li>, lấy toàn bộ text
    if (lines.length === 0) {
        lines.push($.text().trim());
    }

    // 2. XỬ LÝ MÃ ANKI (CLOZE DELETION)
    // Quy tắc: {{c1::Nội dung::Gợi ý}}  -> Lấy "Nội dung"
    //          {{c1::Nội dung}}         -> Lấy "Nội dung"
    const cleanedLines = lines.map(line => {
        // Regex này tìm cụm {{c<số>::...}} và chỉ giữ lại phần text chính
        let clean = line.replace(/{{c\d::(.*?)(?::.*?)?}}/g, '$1');
        
        // Xóa các ký tự rác nếu còn sót
        clean = clean.replace(/&nbsp;/g, ' '); 
        clean = clean.replace(/\s+/g, ' ').trim();
        return clean;
    });

    return cleanedLines.filter(l => l.length > 0).join('\n');
}

async function analyze() {
    let dbSqlite = null;
    try {
        console.log("🧐 ĐANG PHÂN TÍCH CẤU TRÚC VÍ DỤ...");

        const ankiPath = path.join(__dirname, ANKI_FILE_NAME);
        if (!fs.existsSync(ankiPath)) throw new Error("Thiếu file .apkg");
        const zip = new AdmZip(ankiPath);
        zip.extractAllTo(TEMP_DIR, true);

        const dbPath = path.join(TEMP_DIR, 'collection.anki2');
        dbSqlite = new Database(dbPath, { readonly: true });
        
        // Lấy 10 từ để soi cho kỹ
        const rows = dbSqlite.prepare('SELECT flds FROM notes LIMIT 10').all();

        console.log("\n================ SO SÁNH TRƯỚC VÀ SAU XỬ LÝ ================");

        rows.forEach((row, index) => {
            const fields = row.flds.split('\x1f');
            if (fields.length >= 4) { // Cột 3 là Ví dụ
                const word = fields[0].replace(/<[^>]*>/g, '').trim();
                const rawExampleHtml = fields[3]; // Cột gốc
                
                // Áp dụng hàm làm sạch mới
                const finalExample = cleanExampleAdvanced(rawExampleHtml);

                // Chỉ hiện những từ có ví dụ để phân tích
                if (finalExample.length > 0) {
                    console.log(`\n📌 TỪ [${index + 1}]: ${word.toUpperCase()}`);
                    console.log(`   🔴 GỐC (Raw HTML):`);
                    console.log(`      ${rawExampleHtml.substring(0, 100)}...`); // In 100 ký tự đầu
                    console.log(`   🟢 SAU KHI FIX (Cleaned):`);
                    console.log(`      ${finalExample}`);
                }
            }
        });

        console.log("\n============================================================");
        console.log("❓ Bạn kiểm tra xem phần 'SAU KHI FIX' đã mất hết dấu {{:}} chưa?");

    } catch (error) {
        console.error("❌ Lỗi:", error);
    } finally {
        if (dbSqlite) dbSqlite.close();
        try { fs.rmSync(TEMP_DIR, { recursive: true, force: true }); } catch (e) {}
    }
}

analyze();