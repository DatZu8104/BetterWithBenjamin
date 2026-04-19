const express = require('express');
const router = express.Router();

// Endpoint này không làm gì nặng nhọc, chỉ trả về chữ "OK" để Render biết server còn sống
router.get('/keep-alive', (req, res) => {
    res.status(200).json({
        status: 'awake',
        message: 'Tôi vẫn đang thức!',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;