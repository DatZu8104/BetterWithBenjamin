// backend/seed_oxford.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { User, SystemVocabulary, Folder, GroupSetting } = require('./models'); // Đảm bảo đường dẫn đúng tới models

// Load biến môi trường
dotenv.config();

// KẾT NỐI MONGODB
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("✅ Đã kết nối MongoDB. Bắt đầu import...");
        importData();
    })
    .catch(err => {
        console.error("❌ Lỗi kết nối MongoDB:", err);
        process.exit(1);
    });

const importData = async () => {
    try {
        // 1. Tìm User Admin để gán quyền sở hữu dữ liệu
        // (Lấy admin đầu tiên tìm thấy)
        const adminUser = await User.findOne({ role: 'admin' });
        if (!adminUser) {
            console.error("❌ Không tìm thấy user nào là Admin trong Database. Hãy tạo admin trước.");
            process.exit(1);
        }
        const adminId = adminUser._id;
        console.log(`👤 Dữ liệu sẽ thuộc về Admin: ${adminUser.username} (${adminId})`);

        // 2. Đọc file JSON
        const filePath = path.join(__dirname, 'oxford_5000_merged_final.json');
        if (!fs.existsSync(filePath)) {
            console.error(`❌ Không tìm thấy file tại: ${filePath}`);
            console.error("👉 Hãy copy file 'oxford_5000_merged_final.json' vào cùng thư mục với file script này.");
            process.exit(1);
        }
        
        const rawData = fs.readFileSync(filePath, 'utf-8');
        const jsonData = JSON.parse(rawData);
        console.log(`📦 Đã đọc file JSON: ${jsonData.length} từ.`);

        // 3. Dọn dẹp dữ liệu cũ (Xóa sạch SystemVocabulary & Group Oxford cũ)
        console.log("🧹 Đang dọn dẹp dữ liệu cũ...");
        await SystemVocabulary.deleteMany({});
        await GroupSetting.deleteMany({ isGlobal: true, groupName: { $regex: /^Oxford Level/ } });
        
        // 4. Tạo Folder hệ thống
        const folderName = "Oxford 5000 Total";
        let folder = await Folder.findOne({ name: folderName, isGlobal: true });
        if (!folder) {
            folder = await Folder.create({
                userId: adminId,
                name: folderName,
                color: "#e11d48",
                isGlobal: true
            });
            console.log("📁 Đã tạo Folder mới:", folderName);
        } else {
            console.log("📁 Sử dụng Folder có sẵn:", folderName);
        }

        // 5. Chuẩn bị dữ liệu để Insert
        const levelGroups = new Set();
        const wordsToInsert = jsonData.map(item => {
            const lvl = item.level ? item.level.toUpperCase().trim() : "Others";
            const groupName = `Oxford Level ${lvl}`;
            levelGroups.add(groupName);

            return {
                word: item.word,
                type: item.type,
                level: lvl,
                phonetics: {
                    us: item.phonetics?.us || "",
                    uk: item.phonetics?.uk || ""
                },
                audio: {
                    us: item.audio?.us || "",
                    uk: item.audio?.uk || ""
                },
                // Mapping definitions
                definitions: item.definitions.map(def => ({
                    order: def.order,
                    label: def.label,
                    definition: def.definition,
                    examples: def.examples || []
                })),
                href: item.href,
                group: groupName, // Gán nhóm
                createdAt: new Date()
            };
        });

        // 6. Tạo các Group Setting
        console.log(`🔄 Đang tạo ${levelGroups.size} nhóm Level...`);
        for (const groupName of levelGroups) {
            await GroupSetting.findOneAndUpdate(
                { groupName: groupName, isGlobal: true },
                { 
                    userId: adminId,
                    groupName: groupName, 
                    folder: folderName, 
                    isGlobal: true 
                },
                { upsert: true, new: true }
            );
        }

        // 7. Insert hàng loạt vào Database
        console.log("🚀 Đang nạp từ vựng vào Database (Việc này mất khoảng 10-20 giây)...");
        // ordered: false giúp chạy nhanh hơn và không dừng lại nếu 1 từ lỗi
        await SystemVocabulary.insertMany(wordsToInsert, { ordered: false });

        console.log("\n============================================");
        console.log("✅ THÀNH CÔNG RỰC RỠ!");
        console.log(`📊 Tổng số từ đã nạp: ${wordsToInsert.length}`);
        console.log(`📂 Folder: ${folderName}`);
        console.log(`📑 Các nhóm đã tạo: ${Array.from(levelGroups).join(", ")}`);
        console.log("============================================");

        process.exit(0);

    } catch (error) {
        console.error("❌ LỖI KHÔNG MONG MUỐN:", error);
        process.exit(1);
    }
};