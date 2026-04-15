/**
 * SM-2 Variant Algorithm
 * Based on: Woźniak, P.A. (1990). Optimization of Learning.
 * Reference: https://www.supermemo.com/en/articles/algorithm
 *
 * Deviation from original SM-2:
 * - Uses 4 buttons (Again/Hard/Good/Easy) instead of 0-5 scale
 * - Maps to q values: Again=1, Hard=2, Good=4, Easy=5 (skips q=0 and q=3)
 * - Similar to Anki's implementation
 */

const BUTTON_TO_Q = {
    again: 1,
    hard:  2,
    good:  4,
    easy:  5
};

const MIN_EASE_FACTOR = 1.3;
const INITIAL_EASE_FACTOR = 2.5;

/**
 * Map button name to q value
 * @param {string} button - 'again' | 'hard' | 'good' | 'easy'
 * @returns {number} q value
 */
function mapButtonToQ(button) {
    const q = BUTTON_TO_Q[button];
    if (q === undefined) throw new Error(`Invalid button: ${button}`);
    return q;
}

/**
 * Calculate next review date using SM-2 variant
 * @param {object} current - current SrsProgress fields
 * @param {string} button - 'again' | 'hard' | 'good' | 'easy'
 * @returns {object} updated fields
 */
function calculateNextReview(current, button) {
    const q = mapButtonToQ(button);

    let { interval, repetition, easeFactor } = current;

    // Update easeFactor (SM-2 formula)
    // EF = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
    let newEaseFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (newEaseFactor < MIN_EASE_FACTOR) newEaseFactor = MIN_EASE_FACTOR;

    let newInterval;
    let newRepetition;

    if (q < 3) {
        // Again or Hard → forgot, reset
        newInterval = 1;
        newRepetition = 0;
    } else {
        // Good or Easy → remembered
        if (repetition === 0) {
            newInterval = 1;
        } else if (repetition === 1) {
            newInterval = 6;
        } else {
            newInterval = Math.round(interval * newEaseFactor);
        }
        newRepetition = repetition + 1;
    }

    // Easy bonus: thêm 1 ngày
    if (q === 5) newInterval = newInterval + 1;

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + newInterval);
    nextReview.setHours(0, 0, 0, 0); // Reset về đầu ngày

    return {
        interval: newInterval,
        repetition: newRepetition,
        easeFactor: parseFloat(newEaseFactor.toFixed(4)),
        nextReview,
        lastReviewed: new Date()
    };
}

module.exports = { calculateNextReview, mapButtonToQ, INITIAL_EASE_FACTOR };