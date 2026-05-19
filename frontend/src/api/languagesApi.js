// Languages API client — talks to /api/languages and /api/admin/languages.
// Used by:
//   - i18n/LanguageContext       (boot-time fetch of enabled languages)
//   - features/admin/AdminLanguages (admin CRUD)
import api from "../api";

const ROOT = "/api/languages";
const ADMIN = "/api/admin/languages";

/** Public — enabled languages for the picker. */
export async function listEnabledLanguages() {
  const { data } = await api.get(ROOT);
  return Array.isArray(data) ? data : [];
}

/** Admin — all languages incl. disabled. */
export async function listAllLanguages() {
  const { data } = await api.get(ADMIN);
  return Array.isArray(data) ? data : [];
}

export async function createLanguage(payload) {
  const { data } = await api.post(ADMIN, payload);
  return data;
}

export async function updateLanguage(code, patch) {
  const { data } = await api.put(`${ADMIN}/${encodeURIComponent(code)}`, patch);
  return data;
}

export async function deleteLanguage(code) {
  await api.delete(`${ADMIN}/${encodeURIComponent(code)}`);
}

export async function reorderLanguages(items) {
  // items: [{ code, displayOrder }]
  await api.put(`${ADMIN}/reorder`, items);
}

/**
 * A small curated ISO 639-1 directory used by the "Add Language" picker.
 * The admin can still type a custom code (e.g. "pt-BR") if needed.
 */
export const ISO_LANGUAGE_DIRECTORY = [
  { code: "en",  name: "English",     nativeName: "English",   rtl: false },
  { code: "hi",  name: "Hindi",       nativeName: "हिन्दी",     rtl: false },
  { code: "pa",  name: "Punjabi",     nativeName: "ਪੰਜਾਬੀ",     rtl: false },
  { code: "ur",  name: "Urdu",        nativeName: "اُردُو",     rtl: true  },
  { code: "ta",  name: "Tamil",       nativeName: "தமிழ்",      rtl: false },
  { code: "te",  name: "Telugu",      nativeName: "తెలుగు",      rtl: false },
  { code: "ml",  name: "Malayalam",   nativeName: "മലയാളം",     rtl: false },
  { code: "kn",  name: "Kannada",     nativeName: "ಕನ್ನಡ",       rtl: false },
  { code: "mr",  name: "Marathi",     nativeName: "मराठी",       rtl: false },
  { code: "gu",  name: "Gujarati",    nativeName: "ગુજરાતી",     rtl: false },
  { code: "bn",  name: "Bengali",     nativeName: "বাংলা",       rtl: false },
  { code: "or",  name: "Odia",        nativeName: "ଓଡ଼ିଆ",       rtl: false },
  { code: "as",  name: "Assamese",    nativeName: "অসমীয়া",     rtl: false },
  { code: "ne",  name: "Nepali",      nativeName: "नेपाली",      rtl: false },
  { code: "si",  name: "Sinhala",     nativeName: "සිංහල",       rtl: false },
  { code: "ar",  name: "Arabic",      nativeName: "العربية",      rtl: true  },
  { code: "fr",  name: "French",      nativeName: "Français",    rtl: false },
  { code: "es",  name: "Spanish",     nativeName: "Español",     rtl: false },
  { code: "de",  name: "German",      nativeName: "Deutsch",     rtl: false },
  { code: "pt",  name: "Portuguese",  nativeName: "Português",   rtl: false },
  { code: "zh",  name: "Chinese",     nativeName: "中文",         rtl: false },
  { code: "ja",  name: "Japanese",    nativeName: "日本語",       rtl: false },
  { code: "ko",  name: "Korean",      nativeName: "한국어",       rtl: false },
];
