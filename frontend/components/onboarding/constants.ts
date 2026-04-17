export const ONBOARDING_IDS = {
  // Trang chủ
  HOME_SYSTEM_WORDS: 'tour-home-system-words',
  SYSTEM_WORDS_START: 'tour-system-words-start',
  FOLDER_CLICK: 'tour-folder-click',

  // Study modal
  MODAL_STUDY_TABS: 'tour-modal-study-tabs',
  MODAL_STUDY_SELECT_FOLDER: 'tour-modal-study-folder',
  MODAL_STUDY_BACK_BUTTON: 'tour-modal-study-back',

  // Learn mode
  LEARN_CLICK_FLASHCARD: 'tour-learn-click-flashcard',
  LEARN_KNOWN_BTN: 'tour-learn-known-btn',
  LEARN_UNKNOWN_BTN: 'tour-learn-unknown-btn',
  LEARN_SWIPE_MOBILE: 'tour-learn-swipe-mobile',
  LEARN_AI_CHATBOT: 'tour-learn-ai-chatbot',
} as const;

export type OnboardingId = typeof ONBOARDING_IDS[keyof typeof ONBOARDING_IDS];