require('dotenv').config();
const mongoose = require('mongoose');
const AdmZip = require('adm-zip');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Import Model
const { SystemVocabulary } = require('./models'); 

// --- CẤU HÌNH ---
const ANKI_FILE_NAME = "The_Oxford_5000_Most_Important_Words.apkg";
const TEMP_DIR = "./temp_import_complete";
const MONGO_URI = process.env.MONGO_URI;

// --- HÀM 1: LÀM SẠCH VÍ DỤ (XỬ LÝ MÃ CLOZE {{...}}) ---
function cleanExampleAdvanced(html) {
    if (!html) return "";
    const $ = cheerio.load(html, null, false);

    // 1. Lấy từng dòng ví dụ
    let lines = [];
    $('li').each((i, el) => {
        lines.push($(el).text().trim());
    });
    // Nếu không có thẻ li, lấy toàn bộ text
    if (lines.length === 0) {
        lines.push($.text().trim());
    }

    // 2. Regex xử lý mã Cloze Deletion của Anki
    // {{c1::hello::xin chào}} -> hello
    // {{c1::world}} -> world
    const cleanedLines = lines.map(line => {
        let clean = line.replace(/{{c\d::(.*?)(?::.*?)?}}/g, '$1');
        clean = clean.replace(/&nbsp;/g, ' '); 
        clean = clean.replace(/\s+/g, ' ').trim();
        return clean;
    });

    // Lọc bỏ dòng rỗng và nối lại
    return cleanedLines.filter(l => l.length > 0).join('\n');
}

// --- HÀM 2: LẤY ĐỊNH NGHĨA THÔ (Sẽ lọc IPA sau) ---
function parseDefinitionRaw(html) {
    if (!html) return "";
    const $ = cheerio.load(html, null, false);
    
    // Xóa rác
    $('.h, h2, h3').remove();       
    $('.phon, .phonetics').remove(); 
    $('.pos, .content-type').remove(); 
    $('.sound, audio, a, img').remove(); 
    $('.x, .examples, ul, .content-example').remove(); 
    
    let text = $.text();
    text = text.replace(/{{c\d::.*?}}/g, ''); 
    return text.replace(/\s+/g, ' ').trim();
}

function cleanText(text) {
    if (!text) return "";
    let t = text.replace(/<[^>]*>/g, '');
    t = t.replace(/&nbsp;/g, ' ');
    return t.replace(/\s+/g, ' ').trim();
}

async function main() {
    let dbSqlite = null;
    try {
        console.log("🚀 BẮT ĐẦU IMPORT FULL (CLEAN DATA)...");
        
        // 1. KẾT NỐI & XÓA DATA CŨ
        await mongoose.connect(MONGO_URI);
        console.log("✅ Đã kết nối MongoDB.");
        
        console.log("🗑  ĐANG XÓA DỮ LIỆU CŨ...");
        await SystemVocabulary.deleteMany({});
        console.log("✅ Database đã sạch sẽ.");

        // 2. GIẢI NÉN
        const ankiPath = path.join(__dirname, ANKI_FILE_NAME);
        if (!fs.existsSync(ankiPath)) throw new Error(`Không tìm thấy file ${ANKI_FILE_NAME}`);

        console.log("📦 Đang giải nén file Anki...");
        const zip = new AdmZip(ankiPath);
        zip.extractAllTo(TEMP_DIR, true);

        // 3. ĐỌC SQLite
        const dbPath = path.join(TEMP_DIR, 'collection.anki2');
        dbSqlite = new Database(dbPath, { readonly: true });
        
        const rows = dbSqlite.prepare('SELECT flds FROM notes').all();
        console.log(`🔍 Tìm thấy ${rows.length} từ vựng. Đang xử lý...`);

        const bulkDocs = [];
        let successCount = 0;

        rows.forEach((row) => {
            const fields = row.flds.split('\x1f');
            if (fields.length >= 7) {
                const word = cleanText(fields[0]);
                const type = cleanText(fields[1]);
                const ipa = cleanText(fields[2]);
                
                // 🔥 Xử lý Ví dụ bằng hàm mới (sạch mã {{:}})
                const example = cleanExampleAdvanced(fields[3]);
                
                // 🔥 Xử lý Nghĩa (Xóa IPA thừa)
                let definition = parseDefinitionRaw(fields[6]);
                if (ipa && definition.includes(ipa)) {
                    definition = definition.replace(ipa, '').trim();
                }
                // Xóa dấu câu thừa ở đầu
                definition = definition.replace(/^[\/\s,;.-]+/, '').trim();

                // 🛡️ Cơ chế an toàn: Không để nghĩa rỗng
                if (!definition || definition.length === 0) {
                    definition = "See Dictionary"; 
                }

                if (word) {
                    bulkDocs.push({
                        english: word,
                        type: type,
                        pronunciation: ipa,
                        definition: definition,
                        example: example,
                        group: "Oxford 5000",
                        system: true,
                        meaning_vi: "" 
                    });
                    successCount++;
                }
            }
        });

        // 4. GHI VÀO DB
        if (bulkDocs.length > 0) {
            console.log(`⏳ Đang ghi ${bulkDocs.length} từ vào Database...`);
            const CHUNK_SIZE = 1000;
            for (let i = 0; i < bulkDocs.length; i += CHUNK_SIZE) {
                const chunk = bulkDocs.slice(i, i + CHUNK_SIZE);
                try {
                    await SystemVocabulary.insertMany(chunk, { ordered: false });
                    process.stdout.write("█");
                } catch (e) {
                    process.stdout.write("x"); // Đánh dấu nếu có lỗi nhỏ (thường là trùng lặp)
                }
            }
            console.log("\n\n🎉 HOÀN TẤT 100%!");
            console.log(`✅ Đã thêm: ${successCount} từ vào nhóm "Oxford 5000".`);
        }

    } catch (error) {
        console.error("\n❌ LỖI:", error);
    } finally {
        if (dbSqlite) dbSqlite.close();
        try { fs.rmSync(TEMP_DIR, { recursive: true, force: true }); } catch (e) {}
        process.exit(0);
    }
}

main();