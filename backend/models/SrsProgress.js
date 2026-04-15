const mongoose = require('mongoose');

const srsProgressSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    wordId: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true 
    },
    wordType: { 
        type: String, 
        enum: ['personal', 'system'], 
        required: true 
    },

    // SM-2 fields
    interval: { type: Number, default: 1 },
    repetition: { type: Number, default: 0 },
    easeFactor: { type: Number, default: 2.5 },
    nextReview: { type: Date, default: Date.now },

    // Thống kê
    totalReviews: { type: Number, default: 0 },
    correctReviews: { type: Number, default: 0 },
    lastReviewed: { type: Date, default: null },

    createdAt: { type: Date, default: Date.now }
});

srsProgressSchema.index({ userId: 1, wordId: 1, wordType: 1 }, { unique: true });

module.exports = mongoose.model('SrsProgress', srsProgressSchema);