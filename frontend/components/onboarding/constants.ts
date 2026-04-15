export const ONBOARDING_IDS = {
  HOME_SYSTEM_WORDS: 'tour-home-system-words',
  SYSTEM_WORDS_START: 'tour-system-words-start',
  MODAL_STUDY_TABS: 'tour-modal-study-tabs',               
  MODAL_STUDY_SELECT_FOLDER: 'tour-modal-study-folder',
  MODAL_STUDY_BACK_BUTTON: 'tour-modal-study-back',
  LEARN_AI_CHATBOT: 'tour-learn-ai-chatbot',
} as const;

export type OnboardingId = typeof ONBOARDING_IDS[keyof typeof ONBOARDING_IDS];