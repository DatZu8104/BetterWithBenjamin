const AdmZip = require('adm-zip');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// --- CẤU HÌNH ---
const ANKI_FILE_NAME = "The_Oxford_5000_Most_Important_Words.apkg";
const OUTPUT_FILE = "oxford_5000_cleaned.csv"; // Tên file xuất ra
const TEMP_DIR = "./temp_export_csv";

// --- HÀM 1: LÀM SẠCH VÍ DỤ ---
function cleanExampleAdvanced(html) {
    if (!html) return "";
    const $ = cheerio.load(html, null, false);
    let lines = [];
    $('li').each((i, el) => { lines.push($(el).text().trim()); });
    if (lines.length === 0) lines.push($.text().trim());

    // Regex xử lý mã Cloze
    const cleanedLines = lines.map(line => {
        let clean = line.replace(/{{c\d::(.*?)(?::.*?)?}}/g, '$1');
        clean = clean.replace(/&nbsp;/g, ' '); 
        clean = clean.replace(/\s+/g, ' ').trim();
        return clean;
    });
    return cleanedLines.filter(l => l.length > 0).join('\n');
}

// --- HÀM 2: LẤY ĐỊNH NGHĨA THÔ ---
function parseDefinitionRaw(html) {
    if (!html) return "";
    const $ = cheerio.load(html, null, false);
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

// --- HÀM 3: CHUẨN HÓA CSV (QUAN TRỌNG) ---
// Giúp text chứa dấu phẩy hoặc xuống dòng không bị nhảy cột trong Excel
function toCsvField(text) {
    if (!text) return "";
    // Chuyển đổi sang string và escape dấu ngoặc kép (") thành ("")
    let safe = text.toString().replace(/"/g, '""');
    // Nếu có dấu phẩy, xuống dòng, hoặc ngoặc kép thì bọc trong ngoặc kép
    if (safe.includes(',') || safe.includes('\n') || safe.includes('"') || safe.includes(';')) {
        return `"${safe}"`;
    }
    return safe;
}

async function exportToCsv() {
    let dbSqlite = null;
    try {
        console.log("📊 EXPORTING DATA TO CSV FILE...");

        const ankiPath = path.join(__dirname, ANKI_FILE_NAME);
        if (!fs.existsSync(ankiPath)) throw new Error(`File not found ${ANKI_FILE_NAME}`);

        // 1. Giải nén
        const zip = new AdmZip(ankiPath);
        zip.extractAllTo(TEMP_DIR, true);

        // 2. Đọc SQLite
        const dbPath = path.join(TEMP_DIR, 'collection.anki2');
        dbSqlite = new Database(dbPath, { readonly: true });
        const rows = dbSqlite.prepare('SELECT flds FROM notes').all();
        console.log(`🔍 Found ${rows.length} words. Processing...`);

        // 3. TẠO FILE CSV VÀ GHI HEADER
        const writeStream = fs.createWriteStream(path.join(__dirname, OUTPUT_FILE), { encoding: 'utf8' });
        
        // Ghi dòng tiêu đề (Header)
        // Dùng dấu phẩy (,) làm ngăn cách
        writeStream.write(`Word,Type,IPA,Definition,Example,Group\n`);

        let count = 0;

        rows.forEach((row) => {
            const fields = row.flds.split('\x1f');
            if (fields.length >= 7) {
                const word = cleanText(fields[0]);
                const type = cleanText(fields[1]);
                const ipa = cleanText(fields[2]);
                const example = cleanExampleAdvanced(fields[3]);
                
                let definition = parseDefinitionRaw(fields[6]);
                if (ipa && definition.includes(ipa)) {
                    definition = definition.replace(ipa, '').trim();
                }
                definition = definition.replace(/^[\/\s,;.-]+/, '').trim();
                if (!definition) definition = "See Dictionary";

                if (word) {
                    // Ghi dòng dữ liệu
                    const line = [
                        toCsvField(word),
                        toCsvField(type),
                        toCsvField(ipa),
                        toCsvField(definition),
                        toCsvField(example),
                        toCsvField("Oxford 5000")
                    ].join(',');

                    writeStream.write(line + '\n');
                    count++;
                }
            }
        });

        writeStream.end();

        console.log("\n✅ FILE EXPORT SUCCESSFUL!");
        console.log(`📁 File saved at: backend/${OUTPUT_FILE}`);
        console.log(`📊 Total rows: ${count}`);
        console.log("👉 You can open this file with Excel or Google Sheets.");

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        if (dbSqlite) dbSqlite.close();
        try { fs.rmSync(TEMP_DIR, { recursive: true, force: true }); } catch (e) {}
    }
}

exportToCsv();