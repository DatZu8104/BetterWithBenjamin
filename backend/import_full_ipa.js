require('dotenv').config();
const mongoose = require('mongoose');
const AdmZip = require('adm-zip');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// --- CẤU HÌNH ---
const ANKI_FILE_NAME = "The_Oxford_5000_Most_Important_Words.apkg";
const TEMP_DIR = "./temp_anki_fix_ipa";

const vocabularySchema = new mongoose.Schema({
    english: String,
    ipa: String,
    type: String,
    definition: String,   
    example: String,
    group: { type: String, default: "Oxford 5000" }
}, { strict: false });

const SystemVocabulary = mongoose.model('SystemVocabulary', vocabularySchema, 'systemvocabularies');

function cleanText(text) {
    if (!text) return "";
    let clean = text.replace(/<[^>]*>/g, ' '); 
    clean = clean.replace(/{{c\d::(.*?)(?::.*?)?}}/g, '$1');
    return clean.replace(/\s+/g, ' ').trim();
}

// --- HÀM LỌC ĐỊNH NGHĨA (LOGIC MỚI) ---
// Truyền thêm knownIpa, knownType, knownWord để tìm và diệt chúng trong định nghĩa
function parseDefinition(htmlContent, knownWord, knownType, knownIpa) {
    if (!htmlContent) return "See Dictionary";
    const $ = cheerio.load(htmlContent, null, false);
    
    // 1. Xóa bằng Cheerio (Cấu trúc HTML)
    $('.h, h2').remove(); 
    $('.content-type, .pos').remove(); 
    $('.phon').remove(); 
    $('ul, .content-example, .content-circle').remove(); 
    $('audio, video, img, source, a, .sound').remove(); 

    let text = $.text();
    text = text.replace(/{{c\d::(.*?)(?::.*?)?}}/g, '$1'); 

    // 2. XÓA BẰNG CHUỖI (QUAN TRỌNG NHẤT)
    // Dùng chính dữ liệu đã biết để xóa khỏi chuỗi định nghĩa
    
    // Xóa IPA (Nếu nó dính ở đầu)
    if (knownIpa) {
        // Xóa chính xác chuỗi IPA
        text = text.replace(knownIpa, '');
        // Đôi khi Anki thêm dấu cách thừa, ví dụ: / abc / thay vì /abc/
        // Ta xóa luôn các mẫu text nằm giữa 2 dấu gạch chéo ở đầu câu
        text = text.replace(/^\s*\/.*?\/\s*/, ''); 
    }

    // Xóa Loại từ (Nếu dính)
    if (knownType) {
        text = text.replace(knownType, '');
        // Xóa các từ nằm trong ngoặc đơn ở đầu câu (thường là loại từ sót lại)
        text = text.replace(/^\s*\(.*?\)\s*/, '');
    }

    // Xóa Từ vựng gốc (Nếu dính)
    if (knownWord) {
        // Dùng RegExp để xóa không phân biệt hoa thường (case insensitive)
        const regex = new RegExp(knownWord, 'gi');
        text = text.replace(regex, '');
    }

    // 3. Dọn dẹp ký tự rác cuối cùng
    // Xóa dấu gạch chéo, dấu ngoặc, dấu phẩy còn sót lại ở đầu câu
    text = text.replace(/^[\s\/\(\)\-.,]+/, '').trim();

    // Viết hoa chữ cái đầu tiên của định nghĩa cho đẹp
    if (text.length > 0) {
        text = text.charAt(0).toUpperCase() + text.slice(1);
    }

    return text;
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
        console.log(`🔍 Found ${rows.length} vocabularies.`);
        
        const bulkOps = [];
        
        rows.forEach((row, index) => {
            const fields = row.flds.split('\x1f');
            
            if (fields.length >= 7) {
                // Lấy dữ liệu sạch từng phần trước
                const word = cleanText(fields[0]);
                const type = cleanText(fields[1]);
                const ipaRaw = cleanText(fields[2]); // IPA sạch lấy từ cột 2
                const example = cleanText(fields[3]);
                
                // Truyền IPA sạch vào hàm này để nó biết đường mà xóa
                const def = parseDefinition(fields[6], word, type, ipaRaw);

                const wordData = {
                    english: word,
                    type: type,
                    ipa: ipaRaw,
                    definition: def,
                    example: example,
                    group: "Oxford 5000"
                };

                // KIỂM TRA MẪU (Rất quan trọng)
                if (index < 3) {
                    console.log(`\n🧐 WORD [${wordData.english}]:`);
                    console.log(`   ► Original IPA (Column 2): "${wordData.ipa}"`);
                    console.log(`   ► Clean Meaning:      "${wordData.definition}"`);
                    console.log("----------------------------------");
                }

                bulkOps.push(wordData);
            }
        });

        if (bulkOps.length > 0) {
            console.log(`🚀 Importing ${bulkOps.length} words...`);
            const CHUNK_SIZE = 1000;
            for (let i = 0; i < bulkOps.length; i += CHUNK_SIZE) {
                const chunk = bulkOps.slice(i, i + CHUNK_SIZE);
                await SystemVocabulary.insertMany(chunk);
                process.stdout.write(".");
            }
            console.log("\n✅ DONE!");
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