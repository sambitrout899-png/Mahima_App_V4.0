import React, { createContext, useContext, useMemo, useState } from "react";

const translations = {
  en: {
    /* ---------- COMMON ---------- */
    "common.cancel": "Cancel",
    "common.delete": "Delete",

    /* ---------- PRAYER PAGE (ENGLISH) ---------- */
    "prayer.header.title": "Community Prayer Wall",
    "prayer.header.subtitle":
      "Share your requests and support one another. Admins can receive & manage requests — everyone can pray and respond.",
    "prayer.header.shareButton": "Share a Request",
    "prayer.header.adminOn": "Admin On",
    "prayer.header.adminOff": "Admin Off",

    "prayer.composer.label": "Share your prayer request",
    "prayer.composer.placeholder": "Write your prayer request here...",
    "prayer.composer.submitting": "Submitting...",
    "prayer.composer.submit": "Submit Request",
    "prayer.composer.hint":
      "Please be kind and respectful when sharing.",
    "prayer.composer.shareInvite": "Share / Invite",

    "prayer.list.title": "Community Requests",
    "prayer.list.subtitle":
      "Recent requests and responses — join in prayer and encouragement.",
    "prayer.list.empty": "No requests yet. Be the first to share!",

    "prayer.status.New": "New",
    "prayer.status.Pending": "Pending",
    "prayer.status.Prayed": "Prayed",
    "prayer.status.Result Received": "Result Received",
    "prayer.status.Testimony Given": "Testimony Given",
    "prayer.status.Closed": "Closed",

    "prayer.request.fallbackTitle": "Prayer request",
    "prayer.request.stateLabel": "State:",
    "prayer.request.receiveButton": "Receive",
    "prayer.request.submittedBy": "Submitted by",
    "prayer.request.anonymous": "Anonymous",
    "prayer.request.unknown": "Unknown",
    "prayer.request.deleteTitle": "Delete prayer request",
    "prayer.request.deleteSrLabel": "Delete",

    "prayer.responses.title": "Responses",
    "prayer.responses.save": "Save",
    "prayer.responses.cancel": "Cancel",
    "prayer.responses.edit": "Edit",
    "prayer.responses.delete": "Delete",
    "prayer.responses.placeholder": "Write a response...",
    "prayer.responses.addButton": "Add response",
    "prayer.responses.visibleHint":
      "Responses are visible to everyone",
    "prayer.response.you": "You",

    "prayer.confirm.title": "Confirm delete",
    "prayer.confirm.body":
      "Are you sure you want to delete this prayer request? You will have a short time to undo.",

    "prayer.undo.prefix": "Deleting in",
    "prayer.undo.suffix": "— you can undo",
    "prayer.undo.button": "Undo",

    "prayer.staticResponse":
      "Thanks for the prayer request — Mahima Ministry will continue to pray for your life. God bless you.",

    "prayer.error.loginToView":
      "Please log in to view prayer requests.",
    "prayer.error.loadFailed": "Could not load prayer requests",
    "prayer.error.loginToSubmit":
      "You must be logged in to submit a prayer request.",
    "prayer.error.submitFailed": "Failed to submit prayer request",
    "prayer.error.sendFailed": "Could not send prayer request",
    "prayer.error.loginToDeleteRequest":
      "You must be logged in to delete this prayer request.",
    "prayer.error.deleteRequestFailed":
      "Failed to delete prayer request",
    "prayer.error.deleteRequestCouldNot":
      "Could not delete prayer request.",
    "prayer.error.statusUpdateFailed":
      "Could not update status",
    "prayer.error.addResponseFailed":
      "Could not add response",
    "prayer.error.saveResponseFailed":
      "Could not save response",
    "prayer.error.loginToDeleteResponse":
      "You must be logged in to delete responses.",
    "prayer.error.notAuthorizedDeleteResponse":
      "Not authorized to delete response.",
    "prayer.error.deleteResponseFailed":
      "Could not delete response",
    "prayer.error.notAuthorizedReceive":
      "Not authorized to receive requests.",
    "prayer.error.notAuthorizedChangeStatus":
      "You are not authorized to change status",

    "prayer.toast.requestSubmitted":
      "Prayer request submitted",
    "prayer.toast.requestDeleted":
      "Prayer request deleted",
    "prayer.toast.statusUpdated": "Status updated to",
    "prayer.toast.responseAdded": "Response added",
    "prayer.toast.responseUpdated": "Response updated",
    "prayer.toast.responseDeleted": "Response deleted",
    "prayer.toast.adminModeOn":
      "Admin mode enabled (client-side)",
    "prayer.toast.adminModeOff": "Admin mode disabled",

    "prayer.adminToggle.label": "Admin Mode",
    "prayer.adminToggle.enable": "Enable",
    "prayer.adminToggle.disable": "Disable",
  },

  /* ---------- HINDI ---------- */
  hi: {
    "common.cancel": "रद्द करें",
    "common.delete": "हटा दें",

    "prayer.header.title": "सामुदायिक प्रार्थना दीवार",
    "prayer.header.subtitle":
      "अपनी प्रार्थना निवेदन साझा करें और एक-दूसरे का सहारा बनें। प्रशासक निवेदनों को प्राप्त और प्रबंधित कर सकते हैं — हर कोई प्रार्थना कर सकता है और उत्तर दे सकता है।",
    "prayer.header.shareButton": "निवेदन साझा करें",
    "prayer.header.adminOn": "एडमिन चालू",
    "prayer.header.adminOff": "एडमिन बंद",

    "prayer.composer.label": "अपना प्रार्थना निवेदन साझा करें",
    "prayer.composer.placeholder":
      "अपना प्रार्थना निवेदन यहाँ लिखें...",
    "prayer.composer.submitting": "भेजा जा रहा है...",
    "prayer.composer.submit": "निवेदन भेजें",
    "prayer.composer.hint":
      "कृपया आदर और प्रेम के साथ अपना निवेदन लिखें।",
    "prayer.composer.shareInvite": "शेयर / आमंत्रण",

    "prayer.list.title": "सामुदायिक निवेदन",
    "prayer.list.subtitle":
      "हाल के प्रार्थना निवेदन और उत्तर — प्रार्थना और उत्साहवर्धन में शामिल हों।",
    "prayer.list.empty":
      "अभी तक कोई निवेदन नहीं है। सबसे पहले आप साझा करें!",

    "prayer.status.New": "नया",
    "prayer.status.Pending": "लंबित",
    "prayer.status.Prayed": "प्रार्थना की गई",
    "prayer.status.Result Received": "उत्तर प्राप्त",
    "prayer.status.Testimony Given": "गवाही दी गई",
    "prayer.status.Closed": "बंद",

    "prayer.request.fallbackTitle": "प्रार्थना निवेदन",
    "prayer.request.stateLabel": "स्थिति:",
    "prayer.request.receiveButton": "प्राप्त करें",
    "prayer.request.submittedBy": "द्वारा भेजा गया",
    "prayer.request.anonymous": "गुमनाम",
    "prayer.request.unknown": "अज्ञात",
    "prayer.request.deleteTitle":
      "प्रार्थना निवेदन हटाएँ",
    "prayer.request.deleteSrLabel": "हटाएँ",

    "prayer.responses.title": "प्रतिक्रियाएँ",
    "prayer.responses.save": "सहेजें",
    "prayer.responses.cancel": "रद्द करें",
    "prayer.responses.edit": "संपादित करें",
    "prayer.responses.delete": "हटाएँ",
    "prayer.responses.placeholder":
      "अपना उत्तर यहाँ लिखें...",
    "prayer.responses.addButton": "उत्तर जोड़ें",
    "prayer.responses.visibleHint":
      "उत्तर सभी के लिए दिखाई देंगे।",
    "prayer.response.you": "आप",

    "prayer.confirm.title": "पुष्टि करें",
    "prayer.confirm.body":
      "क्या आप सचमुच इस प्रार्थना निवेदन को हटाना चाहते हैं? आपके पास थोड़े समय तक वापस लेने का विकल्प रहेगा।",

    "prayer.undo.prefix": "हटाया जा रहा है",
    "prayer.undo.suffix": "— आप वापस ले सकते हैं",
    "prayer.undo.button": "वापस लें",

    "prayer.staticResponse":
      "आपके प्रार्थना निवेदन के लिए धन्यवाद — महिमा मंत्रालय आपके जीवन के लिए प्रार्थना करता रहेगा। प्रभु आपको आशीष दे।",

    "prayer.error.loginToView":
      "प्रार्थना निवेदन देखने के लिए कृपया लॉग-इन करें।",
    "prayer.error.loadFailed":
      "प्रार्थना निवेदन लोड नहीं हो सके।",
    "prayer.error.loginToSubmit":
      "प्रार्थना निवेदन भेजने के लिए आपको लॉग-इन होना आवश्यक है।",
    "prayer.error.submitFailed":
      "प्रार्थना निवेदन भेजने में विफल।",
    "prayer.error.sendFailed":
      "प्रार्थना निवेदन नहीं भेजा जा सका।",
    "prayer.error.loginToDeleteRequest":
      "निवेदन हटाने के लिए लॉग-इन होना आवश्यक है।",
    "prayer.error.deleteRequestFailed":
      "प्रार्थना निवेदन हटाने में विफल।",
    "prayer.error.deleteRequestCouldNot":
      "प्रार्थना निवेदन हटाया नहीं जा सका।",
    "prayer.error.statusUpdateFailed":
      "स्थिति अपडेट नहीं हो सकी।",
    "prayer.error.addResponseFailed":
      "उत्तर जोड़ने में विफल।",
    "prayer.error.saveResponseFailed":
      "उत्तर सहेजने में विफल।",
    "prayer.error.loginToDeleteResponse":
      "उत्तर हटाने के लिए लॉग-इन होना आवश्यक है।",
    "prayer.error.notAuthorizedDeleteResponse":
      "उत्तर हटाने के लिए आपको अधिकार नहीं है।",
    "prayer.error.deleteResponseFailed":
      "उत्तर हटाया नहीं जा सका।",
    "prayer.error.notAuthorizedReceive":
      "निवेदन प्राप्त करने के लिए आपको अधिकार नहीं है।",
    "prayer.error.notAuthorizedChangeStatus":
      "स्थिति बदलने के लिए आपको अधिकार नहीं है।",

    "prayer.toast.requestSubmitted":
      "प्रार्थना निवेदन भेज दिया गया।",
    "prayer.toast.requestDeleted":
      "प्रार्थना निवेदन हटा दिया गया।",
    "prayer.toast.statusUpdated":
      "स्थिति अपडेट हुई:",
    "prayer.toast.responseAdded":
      "उत्तर जोड़ दिया गया।",
    "prayer.toast.responseUpdated":
      "उत्तर अपडेट कर दिया गया।",
    "prayer.toast.responseDeleted":
      "उत्तर हटा दिया गया।",
    "prayer.toast.adminModeOn":
      "एडमिन मोड सक्रिय (क्लाइंट साइड)।",
    "prayer.toast.adminModeOff":
      "एडमिन मोड निष्क्रिय।",

    "prayer.adminToggle.label": "एडमिन मोड",
    "prayer.adminToggle.enable": "चालू करें",
    "prayer.adminToggle.disable": "बंद करें",
  },

  /* ---------- PUNJABI ---------- */
  pa: {
    "common.cancel": "ਰੱਦ ਕਰੋ",
    "common.delete": "ਹਟਾਓ",

    "prayer.header.title": "ਸਮੁਦਾਈ ਪ੍ਰਾਰਥਨਾ ਦੀ ਕੰਧ",
    "prayer.header.subtitle":
      "ਆਪਣੀਆਂ ਬੇਨਤੀਆਂ ਸਾਂਝੀਆਂ ਕਰੋ ਅਤੇ ਇਕ-ਦੂਸਰੇ ਦਾ ਹੌਸਲਾ ਵਧਾਓ। ਐਡਮਿਨ ਬੇਨਤੀਆਂ ਪ੍ਰਾਪਤ ਤੇ ਮੈਨੇਜ ਕਰ ਸਕਦੇ ਹਨ — ਹਰ ਕੋਈ ਪ੍ਰਾਰਥਨਾ ਕਰ ਸਕਦਾ ਹੈ ਅਤੇ ਜਵਾਬ ਦੇ ਸਕਦਾ ਹੈ।",
    "prayer.header.shareButton": "ਬੇਨਤੀ ਸਾਂਝੀ ਕਰੋ",
    "prayer.header.adminOn": "ਐਡਮਿਨ ਔਨ",
    "prayer.header.adminOff": "ਐਡਮਿਨ ਆਫ਼",

    "prayer.composer.label": "ਆਪਣੀ ਪ੍ਰਾਰਥਨਾ ਬੇਨਤੀ ਸਾਂਝੀ ਕਰੋ",
    "prayer.composer.placeholder":
      "ਇਥੇ ਆਪਣੀ ਪ੍ਰਾਰਥਨਾ ਬੇਨਤੀ ਲਿਖੋ...",
    "prayer.composer.submitting": "ਭੇਜਿਆ ਜਾ ਰਿਹਾ ਹੈ...",
    "prayer.composer.submit": "ਬੇਨਤੀ ਭੇਜੋ",
    "prayer.composer.hint":
      "ਕਿਰਪਾ ਕਰਕੇ ਪਿਆਰ ਅਤੇ ਆਦਰ ਨਾਲ ਆਪਣੀ ਬੇਨਤੀ ਲਿਖੋ।",
    "prayer.composer.shareInvite": "ਸਾਂਝਾ ਕਰੋ / ਬੁਲਾਓ",

    "prayer.list.title": "ਸਮੁਦਾਈ ਬੇਨਤੀਆਂ",
    "prayer.list.subtitle":
      "ਤਾਜ਼ਾ ਪ੍ਰਾਰਥਨਾ ਬੇਨਤੀਆਂ ਅਤੇ ਜਵਾਬ — ਪ੍ਰਾਰਥਨਾ ਤੇ ਹੌਸਲਾ ਅਫ਼ਜ਼ਾਈ ਵਿੱਚ ਸ਼ਾਮਲ ਹੋਵੋ।",
    "prayer.list.empty":
      "ਹਾਲੇ ਤੱਕ ਕੋਈ ਬੇਨਤੀ ਨਹੀਂ। ਪਹਿਲੀ ਬੇਨਤੀ ਤੁਸੀਂ ਪਾਓ!",

    "prayer.status.New": "ਨਵੀਂ",
    "prayer.status.Pending": "ਬਕਾਇਆ",
    "prayer.status.Prayed": "ਪ੍ਰਾਰਥਨਾ ਕੀਤੀ",
    "prayer.status.Result Received": "ਜਵਾਬ ਮਿਲਿਆ",
    "prayer.status.Testimony Given": "ਗਵਾਹੀ ਦਿੱਤੀ",
    "prayer.status.Closed": "ਬੰਦ",

    "prayer.request.fallbackTitle": "ਪ੍ਰਾਰਥਨਾ ਬੇਨਤੀ",
    "prayer.request.stateLabel": "ਹਾਲਤ:",
    "prayer.request.receiveButton": "ਸੰਭਾਲੋ",
    "prayer.request.submittedBy": "ਦੁਆਰਾ ਭੇਜੀ ਗਈ",
    "prayer.request.anonymous": "ਗੁਮਨਾਮ",
    "prayer.request.unknown": "ਅਣਜਾਣ",
    "prayer.request.deleteTitle":
      "ਪ੍ਰਾਰਥਨਾ ਬੇਨਤੀ ਹਟਾਓ",
    "prayer.request.deleteSrLabel": "ਹਟਾਓ",

    "prayer.responses.title": "ਜਵਾਬ",
    "prayer.responses.save": "ਸੇਵ ਕਰੋ",
    "prayer.responses.cancel": "ਰੱਦ ਕਰੋ",
    "prayer.responses.edit": "ਸੋਧੋ",
    "prayer.responses.delete": "ਹਟਾਓ",
    "prayer.responses.placeholder":
      "ਆਪਣਾ ਜਵਾਬ ਇੱਥੇ ਲਿਖੋ...",
    "prayer.responses.addButton": "ਜਵਾਬ ਸ਼ਾਮਲ ਕਰੋ",
    "prayer.responses.visibleHint":
      "ਜਵਾਬ ਸਭ ਨੂੰ ਦਿੱਖਣਗੇ।",
    "prayer.response.you": "ਤੁਸੀਂ",

    "prayer.confirm.title": "ਪੱਕਾ ਕਰੋ",
    "prayer.confirm.body":
      "ਕੀ ਤੁਸੀਂ ਇਹ ਪ੍ਰਾਰਥਨਾ ਬੇਨਤੀ ਹਟਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ? ਕੁਝ ਸਮੇਂ ਲਈ ਤੁਹਾਡੇ ਕੋਲ ਵਾਪਸ ਲੈਣ ਦਾ ਮੌਕਾ ਹੋਵੇਗਾ।",

    "prayer.undo.prefix": "ਹਟਾਇਆ ਜਾ ਰਿਹਾ ਹੈ",
    "prayer.undo.suffix": "— ਤੁਸੀਂ ਵਾਪਸ ਲੈ ਸਕਦੇ ਹੋ",
    "prayer.undo.button": "ਵਾਪਸ ਲਓ",

    "prayer.staticResponse":
      "ਤੁਹਾਡੀ ਪ੍ਰਾਰਥਨਾ ਬੇਨਤੀ ਲਈ ਧੰਨਵਾਦ — ਮਹਿਮਾ ਮਿਨਿਸਟਰੀ ਤੁਹਾਡੇ ਜੀਵਨ ਲਈ ਪ੍ਰਾਰਥਨਾ ਕਰਦੀ ਰਹੇਗੀ। ਪ੍ਰਭੂ ਤੁਹਾਨੂੰ ਆਸ਼ੀਰਵਾਦ ਦੇਵੇ।",

    "prayer.error.loginToView":
      "ਪ੍ਰਾਰਥਨਾ ਬੇਨਤੀਆਂ ਵੇਖਣ ਲਈ ਲੌਗ-ਇਨ ਕਰੋ।",
    "prayer.error.loadFailed":
      "ਪ੍ਰਾਰਥਨਾ ਬੇਨਤੀਆਂ ਲੋਡ ਨਹੀਂ ਹੋ ਸਕੀਆਂ।",
    "prayer.error.loginToSubmit":
      "ਬੇਨਤੀ ਭੇਜਣ ਲਈ ਲੌਗ-ਇਨ ਲਾਜ਼ਮੀ ਹੈ۔",
    "prayer.error.submitFailed":
      "ਪ੍ਰਾਰਥਨਾ ਬੇਨਤੀ ਭੇਜਣ ਵਿੱਚ ਗਲਤੀ ਹੋਈ।",
    "prayer.error.sendFailed":
      "ਪ੍ਰਾਰਥਨਾ ਬੇਨਤੀ ਨਹੀਂ ਭੇਜੀ ਜਾ ਸਕੀ।",
    "prayer.error.loginToDeleteRequest":
      "ਬੇਨਤੀ ਹਟਾਉਣ ਲਈ ਲੌਗ-ਇਨ ਲਾਜ਼ਮੀ ਹੈ।",
    "prayer.error.deleteRequestFailed":
      "ਪ੍ਰਾਰਥਨਾ ਬੇਨਤੀ ਹਟਾਉਣ ਵਿੱਚ ਗਲਤੀ।",
    "prayer.error.deleteRequestCouldNot":
      "ਪ੍ਰਾਰਥਨਾ ਬੇਨਤੀ ਹਟਾਈ ਨਹੀਂ ਜਾ ਸਕੀ।",
    "prayer.error.statusUpdateFailed":
      "ਹਾਲਤ ਅੱਪਡੇਟ ਨਹੀਂ ਹੋ ਸਕੀ।",
    "prayer.error.addResponseFailed":
      "ਜਵਾਬ ਸ਼ਾਮਲ ਕਰਨ ਵਿੱਚ ਗਲਤੀ।",
    "prayer.error.saveResponseFailed":
      "ਜਵਾਬ ਸੇਵ ਕਰਨ ਵਿੱਚ ਗਲਤੀ।",
    "prayer.error.loginToDeleteResponse":
      "ਜਵਾਬ ਹਟਾਉਣ ਲਈ ਲੌਗ-ਇਨ ਲਾਜ਼ਮੀ ਹੈ।",
    "prayer.error.notAuthorizedDeleteResponse":
      "ਤੁਹਾਨੂੰ ਜਵਾਬ ਹਟਾਉਣ ਦੀ ਆਗਿਆ ਨਹੀਂ ਹੈ।",
    "prayer.error.deleteResponseFailed":
      "ਜਵਾਬ ਹਟਾਇਆ ਨਹੀਂ ਜਾ ਸਕਿਆ।",
    "prayer.error.notAuthorizedReceive":
      "ਬੇਨਤੀ ਸੰਭਾਲਣ ਦੀ ਤੁਹਾਨੂੰ ਆਗਿਆ ਨਹੀਂ ਹੈ।",
    "prayer.error.notAuthorizedChangeStatus":
      "ਹਾਲਤ ਬਦਲਣ ਦੀ ਤੁਹਾਨੂੰ ਆਗਿਆ ਨਹੀਂ ਹੈ।",

    "prayer.toast.requestSubmitted":
      "ਪ੍ਰਾਰਥਨਾ ਬੇਨਤੀ ਭੇਜ ਦਿੱਤੀ ਗਈ ਹੈ।",
    "prayer.toast.requestDeleted":
      "ਪ੍ਰਾਰਥਨਾ ਬੇਨਤੀ ਹਟਾ ਦਿੱਤੀ ਗਈ ਹੈ।",
    "prayer.toast.statusUpdated": "ਹਾਲਤ ਅੱਪਡੇਟ ਹੋਈ:",
    "prayer.toast.responseAdded":
      "ਜਵਾਬ ਸ਼ਾਮਲ ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ।",
    "prayer.toast.responseUpdated":
      "ਜਵਾਬ ਅੱਪਡੇਟ ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ।",
    "prayer.toast.responseDeleted":
      "ਜਵਾਬ ਹਟਾ ਦਿੱਤਾ ਗਿਆ ਹੈ।",
    "prayer.toast.adminModeOn":
      "ਐਡਮਿਨ ਮੋਡ ਚਾਲੂ (ਕਲੀਐਂਟ ਸਾਈਡ)।",
    "prayer.toast.adminModeOff":
      "ਐਡਮਿਨ ਮੋਡ ਬੰਦ ਹੈ।",

    "prayer.adminToggle.label": "ਐਡਮਿਨ ਮੋਡ",
    "prayer.adminToggle.enable": "ਚਾਲੂ ਕਰੋ",
    "prayer.adminToggle.disable": "ਬੰਦ ਕਰੋ",
  },
};

const LanguageContext = createContext({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(
    localStorage.getItem("mahima_lang") || "en"
  );

  const setLang = (value) => {
    setLangState(value);
    localStorage.setItem("mahima_lang", value);
  };

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: (key) =>
        translations[lang]?.[key] ??
        translations.en[key] ??
        key,
    }),
    [lang]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
