// backend/seed_oxford.js
//File mồi dữ liệu chuẩn bị cho hệ thống
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { User, SystemVocabulary, Folder, GroupSetting } = require('../models'); // Đảm bảo đường dẫn đúng tới models

// Load biến môi trường
dotenv.config();

// KẾT NỐI MONGODB
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("✅ Connected to MongoDB. Starting import...");
        importData();
    })
    .catch(err => {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    });

const importData = async () => {
    try {
        // 1. Tìm User Admin để gán quyền sở hữu dữ liệu
        // (Lấy admin đầu tiên tìm thấy)
        const adminUser = await User.findOne({ role: 'admin' });
        if (!adminUser) {
            console.error("❌ No Admin user found in the Database. Please create an admin first.");
            process.exit(1);
        }
        const adminId = adminUser._id;
        console.log(`👤 Data will belong to Admin: ${adminUser.username} (${adminId})`);

        // 2. Đọc file JSON
        const filePath = path.join(__dirname, 'oxford_5000_merged_final.json');
        if (!fs.existsSync(filePath)) {
            console.error(`❌ File not found at: ${filePath}`);
            console.error("👉 Please copy 'oxford_5000_merged_final.json' to the same directory as this script file.");
            process.exit(1);
        }
        
        const rawData = fs.readFileSync(filePath, 'utf-8');
        const jsonData = JSON.parse(rawData);
        console.log(`📦 Read JSON file: ${jsonData.length} words.`);

        // 3. Dọn dẹp dữ liệu cũ (Xóa sạch SystemVocabulary & Group Oxford cũ)
        console.log("🧹 Cleaning old data...");
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
            console.log("📁 Created new Folder:", folderName);
        } else {
            console.log("📁 Using existing Folder:", folderName);
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
        console.log(`🔄 Creating ${levelGroups.size} Level groups...`);
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
        console.log("🚀 Loading vocabulary into Database (This takes about 10-20 seconds)...");
        // ordered: false giúp chạy nhanh hơn và không dừng lại nếu 1 từ lỗi
        await SystemVocabulary.insertMany(wordsToInsert, { ordered: false });

        console.log("\n============================================");
        console.log("✅ GLORIOUS SUCCESS!");
        console.log(`📊 Total words loaded: ${wordsToInsert.length}`);
        console.log(`📂 Folder: ${folderName}`);
        console.log(`📑 Created groups: ${Array.from(levelGroups).join(", ")}`);
        console.log("============================================");

        process.exit(0);

    } catch (error) {
        console.error("❌ UNEXPECTED ERROR:", error);
        process.exit(1);
    }
};