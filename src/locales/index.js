import { createI18n } from 'vue-i18n'
import en from './en'
import zh from './zh'

const messages = {
  en,
  zh
}

// Get saved language from localStorage or use browser language
function getDefaultLanguage() {
  const saved = localStorage.getItem('perler-language')
  if (saved && (saved === 'en' || saved === 'zh')) {
    return saved
  }
  // Check browser language
  const browserLang = navigator.language.toLowerCase()
  return browserLang.startsWith('zh') ? 'zh' : 'en'
}

const i18n = createI18n({
  legacy: false,
  locale: getDefaultLanguage(),
  fallbackLocale: 'en',
  messages
})

export default i18n