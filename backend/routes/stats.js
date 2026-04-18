const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Vocabulary, SavedWord } = require('../models');
const { verifyToken } = require('../middleware');

// API lấy thống kê tiến độ cho các Nhóm/Thư mục Cá nhân
router.get('/personal-groups-progress', verifyToken, async (req, res) => {
    try {
        // Ép kiểu userId về dạng ObjectId của MongoDB để so sánh
        const userId = new mongoose.Types.ObjectId(req.userId);

        // Sử dụng Aggregation Pipeline 
        const stats = await Vocabulary.aggregate([
            // BƯỚC 1: Lọc ra tất cả từ vựng của đúng User đang đăng nhập
            { $match: { userId: userId } },
            
            // BƯỚC 2: Gom nhóm toàn bộ từ vựng theo trường 'group' (tên thư mục)
            { 
                $group: {
                    _id: "$group", // Lấy tên nhóm làm key phân biệt
                    totalWords: { $sum: 1 }, // Cứ mỗi từ trong nhóm thì cộng 1
                    learnedWords: {
                        // Nếu trường 'learned' là true thì cộng 1, sai thì cộng 0
                        $sum: { $cond: [{ $eq: ["$learned", true] }, 1, 0] }
                    }
                }
            }
        ]);

        const formattedStats = stats.map(item => ({
            groupName: item._id || 'Uncategorized',
            totalWords: item.totalWords,
            learnedWords: item.learnedWords,
            percentage: item.totalWords > 0 
                ? Math.round((item.learnedWords / item.totalWords) * 100) 
                : 0
        }));

        res.json(formattedStats);
    } catch (error) {
        console.error('Lỗi tính toán tiến độ thư mục cá nhân:', error);
        res.status(500).json({ error: "Lỗi server khi tính tiến độ" });
    }
});

// API lấy thống kê tiến độ cho các Nhóm/Thư mục Hệ thống (Oxford)
router.get('/system-groups-progress', verifyToken, async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.userId);

        const stats = await SavedWord.aggregate([
            // Bước 1: Tìm tất cả các từ hệ thống mà user này đã lưu
            { $match: { userId: userId } },
            
            // Bước 2: Nối (Lookup) với bảng UserProgress để đối chiếu xem từ này đã học chưa
            {
                $lookup: {
                    from: 'userprogresses', // Tên collection trong MongoDB (thường tự động thêm chữ 'es' hoặc 's')
                    let: { savedWordId: "$wordId", user_Id: "$userId" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$wordId", "$$savedWordId"] },
                                        { $eq: ["$userId", "$$user_Id"] },
                                        { $eq: ["$learned", true] } // Chỉ nối nếu trạng thái là Đã học
                                    ]
                                }
                            }
                        }
                    ],
                    as: "progressInfo"
                }
            },
            
            // Bước 3: Gom nhóm theo tên thư mục (giả sử trường đó tên là 'group')
            { 
                $group: {
                    _id: "$group", // Đổi thành "$folderId" nếu schema của bạn quy định tên khác
                    totalWords: { $sum: 1 },
                    learnedWords: {
                        // Nếu tìm thấy dữ liệu trong mảng progressInfo, tức là từ đó đã học -> cộng 1
                        $sum: { $cond: [{ $gt: [{ $size: "$progressInfo" }, 0] }, 1, 0] }
                    }
                }
            }
        ]);

        const formattedStats = stats.map(item => ({
            groupName: item._id || 'Oxford Vocabulary',
            totalWords: item.totalWords,
            learnedWords: item.learnedWords,
            percentage: item.totalWords > 0 
                ? Math.round((item.learnedWords / item.totalWords) * 100) 
                : 0
        }));

        res.json(formattedStats);
    } catch (error) {
        console.error('Lỗi tính toán tiến độ thư mục hệ thống:', error);
        res.status(500).json({ error: "Lỗi server khi tính tiến độ hệ thống" });
    }
});

module.exports = router;