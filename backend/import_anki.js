require('dotenv').config();
const mongoose = require('mongoose');
const AdmZip = require('adm-zip');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio'); // <--- THƯ VIỆN MỚI QUAN TRỌNG

// --- CẤU HÌNH ---
const ANKI_FILE_NAME = "The_Oxford_5000_Most_Important_Words.apkg";
const TEMP_DIR = "./temp_anki_parser";

const vocabularySchema = new mongoose.Schema({
    english: String,
    ipa: String,
    type: String,
    definition: String,   
    example: String,
    meaning_vi: String,
    group: { type: String, default: "Oxford 5000" }
}, { strict: false });

const SystemVocabulary = mongoose.model('SystemVocabulary', vocabularySchema, 'systemvocabularies');

// --- HÀM PHÂN TÍCH HTML SIÊU CHUẨN ---
function parseHtmlDefinition(htmlContent) {
    if (!htmlContent) return "See Dictionary";

    // 1. Nạp HTML vào Cheerio để xử lý như jQuery
    const $ = cheerio.load(htmlContent, null, false); // false để không bọc trong <html><body>

    // 2. CHIẾN THUẬT "LOẠI BỎ": Xóa những thứ mình ĐÃ BIẾT để lòi ra ĐỊNH NGHĨA
    
    // Xóa Từ vựng (thường nằm trong thẻ h2 hoặc class .h)
    $('.h, h2').remove();

    // Xóa Loại từ (thường nằm trong .content-type hoặc .pos)
    $('.content-type, .pos').remove();

    // Xóa Phiên âm (thường nằm trong .phon)
    $('.phon').remove();

    // Xóa Ví dụ (thường nằm trong ul, li, hoặc class .content-example)
    $('ul').remove(); 
    $('.content-example').remove();
    $('.content-circle').remove();

    // Xóa các file Media, Ảnh, Link
    $('audio, video, img, source, a').remove();
    $('.sound').remove();

    // 3. Lấy phần text còn lại
    let text = $.text();

    // 4. Dọn dẹp rác text sau khi xóa HTML
    // Xóa mã Cloze của Anki {{c1::word}}
    text = text.replace(/{{c\d::(.*?)(?::.*?)?}}/g, '$1');
    
    // Xóa các ký tự xuống dòng thừa, khoảng trắng thừa
    text = text.replace(/\s+/g, ' ').trim();
    
    // Xóa các dấu ngoặc hoặc ký tự lạ còn sót ở đầu câu
    text = text.replace(/^[\(\)\/\-,\s]+/, '').trim();

    return text || "See Dictionary";
}

// Hàm dọn dẹp text đơn giản cho các trường khác
function cleanBasic(text) {
    if (!text) return "";
    let clean = text.replace(/<[^>]*>/g, ' '); 
    clean = clean.replace(/{{c\d::(.*?)(?::.*?)?}}/g, '$1');
    return clean.replace(/\s+/g, ' ').trim();
}

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log("🔥 Connected to MongoDB.");

        console.log("🗑️  Deleting old data...");
        await SystemVocabulary.deleteMany({});
        
        console.log("📦 Extracting...");
        const zip = new AdmZip(ANKI_FILE_NAME);
        zip.extractAllTo(TEMP_DIR, true);

        const dbPath = path.join(TEMP_DIR, 'collection.anki2');
        const db = new Database(dbPath, { readonly: true });
        const rows = db.prepare('SELECT flds FROM notes').all();
        
        const bulkOps = [];
        
        rows.forEach((row, index) => {
            const fields = row.flds.split('\x1f');
            
            if (fields.length >= 7) {
                // Lấy các trường cơ bản
                const rawWord = fields[0];
                const rawType = fields[1];
                const rawIpa = fields[2];
                const rawExample = fields[3]; // Cột 3: HTML ví dụ
                const rawFullHtml = fields[6]; // Cột 6: HTML đầy đủ

                // --- MAGIC HAPPENS HERE ---
                // Dùng Cheerio để bóc tách định nghĩa từ cục HTML to đùng
                const finalDef = parseHtmlDefinition(rawFullHtml);
                
                // Dùng Cheerio để lấy ví dụ sạch từ cột 3 (nếu muốn sạch hơn nữa)
                // Nhưng cleanBasic thường là đủ cho cột ví dụ
                const finalExample = cleanBasic(rawExample);

                const wordData = {
                    english: cleanBasic(rawWord),
                    type: cleanBasic(rawType),
                    ipa: cleanBasic(rawIpa),
                    definition: finalDef, 
                    example: finalExample,
                    group: "Oxford 5000"
                };

                // Check 3 từ đầu để xem kết quả vi diệu
                if (index < 3) {
                    console.log(`\n🧐 WORD [${wordData.english}]:`);
                    console.log(`   ► Type: ${wordData.type}`);
                    console.log(`   ► Def:  "${wordData.definition}"`);
                    console.log(`   ► Ex:   "${wordData.example.substring(0, 60)}..."`);
                }

                bulkOps.push(wordData);
            }
        });

        if (bulkOps.length > 0) {
            console.log(`\n🚀 Importing ${bulkOps.length} words...`);
            const CHUNK_SIZE = 1000;
            for (let i = 0; i < bulkOps.length; i += CHUNK_SIZE) {
                const chunk = bulkOps.slice(i, i + CHUNK_SIZE);
                await SystemVocabulary.insertMany(chunk);
                process.stdout.write(".");
            }
            console.log("\n✅ DONE! Data extracted using standard parser.");
        }

        db.close();
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
        process.exit(0);

    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

main();