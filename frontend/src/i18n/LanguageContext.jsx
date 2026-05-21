import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { listEnabledLanguages } from "../api/languagesApi";
import { apiFetch } from "../utils/fetch-auth-shim";

export const REQUIRED_UI_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English", isDefault: true, enabled: true, displayOrder: 10, rtl: false },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", isDefault: false, enabled: true, displayOrder: 20, rtl: false },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", isDefault: false, enabled: true, displayOrder: 30, rtl: false },
  { code: "or", name: "Odia", nativeName: "ଓଡ଼ିଆ", isDefault: false, enabled: true, displayOrder: 40, rtl: false },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", isDefault: false, enabled: true, displayOrder: 50, rtl: false },
  { code: "mr", name: "Marathi", nativeName: "मराठी", isDefault: false, enabled: true, displayOrder: 60, rtl: false },
  { code: "ne", name: "Nepali", nativeName: "नेपाली", isDefault: false, enabled: true, displayOrder: 70, rtl: false },
];

const dictionaries = {
  en: {
    "layout.language": "Language",
    "layout.openMenu": "Open menu",
    "layout.closeMenu": "Close menu",
    "layout.openPastor": "Open AI Pastor",
    "layout.openChat": "Open chat",
    "layout.notifications": "Notifications",
    "layout.profile": "Profile photo & status",
    "layout.logout": "Log out",
    "layout.logoutSwitch": "Log out / switch account",
    "layout.collapse": "Collapse",
    "layout.expand": "Expand",
    "layout.profileTitle": "Profile",
    "layout.profileSubtitle": "Update your display photo and WhatsApp-style status.",
    "layout.uploadDp": "Upload DP",
    "layout.photoHint": "Square photos look best in chat and the app header.",
    "layout.displayName": "Display name",
    "layout.status": "Status",
    "layout.statusPlaceholder": "Available, praying, serving, or a short testimony...",
    "layout.cancel": "Cancel",
    "layout.save": "Save",
    "layout.profileUpdated": "Profile updated.",
    "layout.profileLoadFailed": "Could not load profile. You can still update and save.",
    "layout.profileSaveFailed": "Could not save profile.",
    "nav.general": "General",
    "nav.community": "Community",
    "nav.operations": "Operations",
    "nav.ministry": "Ministry",
    "nav.admin": "Admin",
    "nav.home": "Home",
    "nav.aiPastor": "AI Pastor",
    "nav.readMe": "ReadMe",
    "nav.appDownloads": "App Downloads",
    "nav.sermons": "Sermons",
    "nav.prayerRequests": "Prayer Requests",
    "nav.tasks": "Tasks",
    "nav.users": "Users",
    "nav.teams": "Teams",
    "nav.roles": "Roles",
    "nav.pages": "Pages",
    "nav.attendance": "Attendance",
    "nav.payroll": "Payroll",
    "nav.costs": "Costs",
    "nav.marriage": "Marriage",
    "nav.baptism": "Baptism",
    "nav.counselling": "Counselling",
    "nav.adminDashboard": "Admin Dashboard",
    "nav.liveUsers": "Live Users",
    "nav.messageCenter": "Message Center",
    "nav.languages": "Languages",
    "nav.emailClient": "Email Client",
    "nav.googleDrive": "Google Drive",
    "nav.serverFiles": "Server Files",
    "common.addUser": "Add User",
    "common.refresh": "Refresh",
    "common.search": "Search",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.download": "Download",
    "common.upload": "Upload",
    "common.send": "Send",
    "common.close": "Close",
    "common.loading": "Loading",
    "common.retry": "Retry",
    "common.noData": "No data",
    "common.actions": "Actions",
    "common.status": "Status",
    "common.role": "Role",
    "common.name": "Name",
    "common.email": "Email",
    "common.phone": "Phone",
    "common.date": "Date",
  },
  ne: {
    "layout.language": "भाषा",
    "layout.openMenu": "मेनु खोल्नुहोस्",
    "layout.closeMenu": "मेनु बन्द गर्नुहोस्",
    "layout.openPastor": "AI पास्टर खोल्नुहोस्",
    "layout.openChat": "च्याट खोल्नुहोस्",
    "layout.notifications": "सूचनाहरू",
    "layout.profile": "प्रोफाइल फोटो र स्थिति",
    "layout.logout": "लग आउट",
    "layout.logoutSwitch": "लग आउट / खाता बदल्नुहोस्",
    "layout.collapse": "खुम्च्याउनुहोस्",
    "layout.expand": "फैलाउनुहोस्",
    "layout.profileTitle": "प्रोफाइल",
    "layout.profileSubtitle": "आफ्नो फोटो र WhatsApp-जस्तो स्थिति अपडेट गर्नुहोस्।",
    "layout.uploadDp": "फोटो अपलोड गर्नुहोस्",
    "layout.photoHint": "च्याट र एप हेडरमा चौकोर फोटो राम्रो देखिन्छ।",
    "layout.displayName": "देखिने नाम",
    "layout.status": "स्थिति",
    "layout.statusPlaceholder": "उपलब्ध, प्रार्थनामा, सेवामा, वा छोटो गवाही...",
    "layout.cancel": "रद्द गर्नुहोस्",
    "layout.save": "सुरक्षित गर्नुहोस्",
    "layout.profileUpdated": "प्रोफाइल अपडेट भयो।",
    "layout.profileLoadFailed": "प्रोफाइल लोड हुन सकेन। तपाईं अझै अपडेट गरेर सुरक्षित गर्न सक्नुहुन्छ।",
    "layout.profileSaveFailed": "प्रोफाइल सुरक्षित हुन सकेन।",
    "nav.general": "सामान्य",
    "nav.community": "समुदाय",
    "nav.operations": "सञ्चालन",
    "nav.ministry": "मिनिस्ट्री",
    "nav.admin": "एडमिन",
    "nav.home": "गृह",
    "nav.aiPastor": "AI पास्टर",
    "nav.readMe": "रिडमी",
    "nav.appDownloads": "एप डाउनलोड",
    "nav.sermons": "प्रवचनहरू",
    "nav.prayerRequests": "प्रार्थना अनुरोधहरू",
    "nav.tasks": "कार्यहरू",
    "nav.users": "प्रयोगकर्ताहरू",
    "nav.teams": "टोलीहरू",
    "nav.roles": "भूमिकाहरू",
    "nav.pages": "पृष्ठहरू",
    "nav.attendance": "उपस्थिति",
    "nav.payroll": "पेरोल",
    "nav.costs": "खर्च",
    "nav.marriage": "विवाह",
    "nav.baptism": "बप्तिस्मा",
    "nav.counselling": "परामर्श",
    "nav.adminDashboard": "एडमिन ड्यासबोर्ड",
    "nav.liveUsers": "लाइभ प्रयोगकर्ताहरू",
    "nav.messageCenter": "सन्देश केन्द्र",
    "nav.languages": "भाषाहरू",
    "nav.emailClient": "इमेल क्लाइन्ट",
    "nav.googleDrive": "गुगल ड्राइभ",
    "nav.serverFiles": "सर्भर फाइलहरू",
    "common.addUser": "प्रयोगकर्ता थप्नुहोस्",
    "common.refresh": "रिफ्रेस",
    "common.search": "खोज्नुहोस्",
    "common.cancel": "रद्द गर्नुहोस्",
    "common.save": "सुरक्षित गर्नुहोस्",
    "common.delete": "मेटाउनुहोस्",
    "common.edit": "सम्पादन गर्नुहोस्",
    "common.download": "डाउनलोड",
    "common.upload": "अपलोड",
    "common.send": "पठाउनुहोस्",
    "common.close": "बन्द गर्नुहोस्",
    "common.loading": "लोड हुँदैछ",
    "common.retry": "फेरि प्रयास गर्नुहोस्",
    "common.noData": "डाटा छैन",
    "common.actions": "कार्यहरू",
    "common.status": "स्थिति",
    "common.role": "भूमिका",
    "common.name": "नाम",
    "common.email": "इमेल",
    "common.phone": "फोन",
    "common.date": "मिति",
  },
  hi: {
    "layout.language": "भाषा",
    "layout.openMenu": "मेनू खोलें",
    "layout.closeMenu": "मेनू बंद करें",
    "layout.openPastor": "AI पास्टर खोलें",
    "layout.openChat": "चैट खोलें",
    "layout.notifications": "सूचनाएं",
    "layout.profile": "प्रोफ़ाइल फोटो और स्टेटस",
    "layout.logout": "लॉग आउट",
    "layout.logoutSwitch": "लॉग आउट / खाता बदलें",
    "layout.collapse": "समेटें",
    "layout.expand": "फैलाएं",
    "layout.profileTitle": "प्रोफ़ाइल",
    "layout.profileSubtitle": "अपनी फोटो और WhatsApp जैसा स्टेटस अपडेट करें।",
    "layout.uploadDp": "फोटो अपलोड करें",
    "layout.photoHint": "चैट और ऐप हेडर में चौकोर फोटो सबसे अच्छी दिखती है।",
    "layout.displayName": "प्रदर्शित नाम",
    "layout.status": "स्टेटस",
    "layout.statusPlaceholder": "उपलब्ध, प्रार्थना में, सेवा में, या छोटी गवाही...",
    "layout.cancel": "रद्द करें",
    "layout.save": "सेव करें",
    "layout.profileUpdated": "प्रोफ़ाइल अपडेट हो गई।",
    "layout.profileLoadFailed": "प्रोफ़ाइल लोड नहीं हुई। आप फिर भी अपडेट करके सेव कर सकते हैं।",
    "layout.profileSaveFailed": "प्रोफ़ाइल सेव नहीं हो सकी।",
    "nav.general": "सामान्य",
    "nav.community": "समुदाय",
    "nav.operations": "संचालन",
    "nav.ministry": "मिनिस्ट्री",
    "nav.admin": "एडमिन",
    "nav.home": "होम",
    "nav.aiPastor": "AI पास्टर",
    "nav.readMe": "रीड मी",
    "nav.appDownloads": "ऐप डाउनलोड",
    "nav.sermons": "संदेश",
    "nav.prayerRequests": "प्रार्थना निवेदन",
    "nav.tasks": "कार्य",
    "nav.users": "यूज़र",
    "nav.teams": "टीम",
    "nav.roles": "भूमिकाएं",
    "nav.pages": "पेज",
    "nav.attendance": "उपस्थिति",
    "nav.payroll": "पेरोल",
    "nav.costs": "खर्च",
    "nav.marriage": "विवाह",
    "nav.baptism": "बपतिस्मा",
    "nav.counselling": "काउंसलिंग",
    "nav.adminDashboard": "एडमिन डैशबोर्ड",
    "nav.liveUsers": "लाइव यूज़र",
    "nav.messageCenter": "मैसेज सेंटर",
    "nav.languages": "भाषाएं",
    "nav.emailClient": "ईमेल क्लाइंट",
    "nav.googleDrive": "गूगल ड्राइव",
    "nav.serverFiles": "सर्वर फाइलें",
    "common.addUser": "यूज़र जोड़ें",
    "common.refresh": "रीफ्रेश",
    "common.search": "खोजें",
    "common.cancel": "रद्द करें",
    "common.save": "सेव करें",
    "common.delete": "हटाएं",
    "common.edit": "संपादित करें",
    "common.download": "डाउनलोड",
    "common.upload": "अपलोड",
    "common.send": "भेजें",
    "common.close": "बंद करें",
    "common.loading": "लोड हो रहा है",
    "common.retry": "फिर कोशिश करें",
    "common.noData": "कोई डेटा नहीं",
    "common.actions": "कार्यवाही",
    "common.status": "स्थिति",
    "common.role": "भूमिका",
    "common.name": "नाम",
    "common.email": "ईमेल",
    "common.phone": "फोन",
    "common.date": "तारीख",
  },
  pa: {
    "layout.language": "ਭਾਸ਼ਾ",
    "layout.openMenu": "ਮੇਨੂ ਖੋਲ੍ਹੋ",
    "layout.closeMenu": "ਮੇਨੂ ਬੰਦ ਕਰੋ",
    "layout.openPastor": "AI ਪਾਸਟਰ ਖੋਲ੍ਹੋ",
    "layout.openChat": "ਚੈਟ ਖੋਲ੍ਹੋ",
    "layout.notifications": "ਸੂਚਨਾਵਾਂ",
    "layout.profile": "ਪ੍ਰੋਫ਼ਾਈਲ ਫੋਟੋ ਅਤੇ ਸਟੇਟਸ",
    "layout.logout": "ਲੌਗ ਆਉਟ",
    "layout.logoutSwitch": "ਲੌਗ ਆਉਟ / ਖਾਤਾ ਬਦਲੋ",
    "layout.collapse": "ਸਮੇਟੋ",
    "layout.expand": "ਫੈਲਾਓ",
    "layout.profileTitle": "ਪ੍ਰੋਫ਼ਾਈਲ",
    "layout.profileSubtitle": "ਆਪਣੀ ਫੋਟੋ ਅਤੇ WhatsApp ਵਰਗਾ ਸਟੇਟਸ ਅਪਡੇਟ ਕਰੋ।",
    "layout.uploadDp": "ਫੋਟੋ ਅਪਲੋਡ ਕਰੋ",
    "layout.photoHint": "ਚੈਟ ਅਤੇ ਐਪ ਹੈਡਰ ਵਿੱਚ ਚੌਰਸ ਫੋਟੋ ਵਧੀਆ ਲੱਗਦੀ ਹੈ।",
    "layout.displayName": "ਦਿਖਾਈ ਦੇਣ ਵਾਲਾ ਨਾਮ",
    "layout.status": "ਸਟੇਟਸ",
    "layout.statusPlaceholder": "ਉਪਲਬਧ, ਪ੍ਰਾਰਥਨਾ ਵਿੱਚ, ਸੇਵਾ ਵਿੱਚ, ਜਾਂ ਛੋਟੀ ਗਵਾਹੀ...",
    "layout.cancel": "ਰੱਦ ਕਰੋ",
    "layout.save": "ਸੇਵ ਕਰੋ",
    "layout.profileUpdated": "ਪ੍ਰੋਫ਼ਾਈਲ ਅਪਡੇਟ ਹੋ ਗਈ।",
    "layout.profileLoadFailed": "ਪ੍ਰੋਫ਼ਾਈਲ ਲੋਡ ਨਹੀਂ ਹੋਈ। ਤੁਸੀਂ ਫਿਰ ਵੀ ਅਪਡੇਟ ਕਰਕੇ ਸੇਵ ਕਰ ਸਕਦੇ ਹੋ।",
    "layout.profileSaveFailed": "ਪ੍ਰੋਫ਼ਾਈਲ ਸੇਵ ਨਹੀਂ ਹੋ ਸਕੀ।",
    "nav.general": "ਆਮ",
    "nav.community": "ਸਮੁਦਾਇ",
    "nav.operations": "ਓਪਰੇਸ਼ਨ",
    "nav.ministry": "ਮਿਨਿਸਟਰੀ",
    "nav.admin": "ਐਡਮਿਨ",
    "nav.home": "ਹੋਮ",
    "nav.aiPastor": "AI ਪਾਸਟਰ",
    "nav.readMe": "ਰੀਡ ਮੀ",
    "nav.appDownloads": "ਐਪ ਡਾਊਨਲੋਡ",
    "nav.sermons": "ਉਪਦੇਸ਼",
    "nav.prayerRequests": "ਪ੍ਰਾਰਥਨਾ ਬੇਨਤੀਆਂ",
    "nav.tasks": "ਕੰਮ",
    "nav.users": "ਯੂਜ਼ਰ",
    "nav.teams": "ਟੀਮਾਂ",
    "nav.roles": "ਭੂਮਿਕਾਵਾਂ",
    "nav.pages": "ਪੇਜ",
    "nav.attendance": "ਹਾਜ਼ਰੀ",
    "nav.payroll": "ਪੇਰੋਲ",
    "nav.costs": "ਖਰਚੇ",
    "nav.marriage": "ਵਿਆਹ",
    "nav.baptism": "ਬਪਤਿਸਮਾ",
    "nav.counselling": "ਕਾਊਂਸਲਿੰਗ",
    "nav.adminDashboard": "ਐਡਮਿਨ ਡੈਸ਼ਬੋਰਡ",
    "nav.liveUsers": "ਲਾਈਵ ਯੂਜ਼ਰ",
    "nav.messageCenter": "ਸੁਨੇਹਾ ਕੇਂਦਰ",
    "nav.languages": "ਭਾਸ਼ਾਵਾਂ",
    "nav.emailClient": "ਈਮੇਲ ਕਲਾਇੰਟ",
    "nav.googleDrive": "ਗੂਗਲ ਡਰਾਈਵ",
    "nav.serverFiles": "ਸਰਵਰ ਫਾਈਲਾਂ",
    "common.addUser": "ਯੂਜ਼ਰ ਜੋੜੋ",
    "common.refresh": "ਰੀਫ੍ਰੈਸ਼",
    "common.search": "ਖੋਜੋ",
    "common.cancel": "ਰੱਦ ਕਰੋ",
    "common.save": "ਸੇਵ ਕਰੋ",
    "common.delete": "ਹਟਾਓ",
    "common.edit": "ਸੋਧੋ",
    "common.download": "ਡਾਊਨਲੋਡ",
    "common.upload": "ਅਪਲੋਡ",
    "common.send": "ਭੇਜੋ",
    "common.close": "ਬੰਦ ਕਰੋ",
    "common.loading": "ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ",
    "common.retry": "ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ",
    "common.noData": "ਕੋਈ ਡਾਟਾ ਨਹੀਂ",
    "common.actions": "ਕਾਰਵਾਈਆਂ",
    "common.status": "ਸਥਿਤੀ",
    "common.role": "ਭੂਮਿਕਾ",
    "common.name": "ਨਾਮ",
    "common.email": "ਈਮੇਲ",
    "common.phone": "ਫੋਨ",
    "common.date": "ਤਾਰੀਖ",
  },
  or: {
    "layout.language": "ଭାଷା",
    "layout.openMenu": "ମେନୁ ଖୋଲନ୍ତୁ",
    "layout.closeMenu": "ମେନୁ ବନ୍ଦ କରନ୍ତୁ",
    "layout.openPastor": "AI ପାଷ୍ଟର ଖୋଲନ୍ତୁ",
    "layout.openChat": "ଚାଟ୍ ଖୋଲନ୍ତୁ",
    "layout.notifications": "ସୂଚନା",
    "layout.profile": "ପ୍ରୋଫାଇଲ୍ ଫଟୋ ଓ ସ୍ଥିତି",
    "layout.logout": "ଲଗ୍ ଆଉଟ୍",
    "layout.logoutSwitch": "ଲଗ୍ ଆଉଟ୍ / ଖାତା ବଦଳାନ୍ତୁ",
    "layout.collapse": "ସଙ୍କୋଚନ",
    "layout.expand": "ବିସ୍ତାର",
    "layout.profileTitle": "ପ୍ରୋଫାଇଲ୍",
    "layout.profileSubtitle": "ଆପଣଙ୍କ ଫଟୋ ଓ WhatsApp ଭଳି ସ୍ଥିତି ଅପଡେଟ୍ କରନ୍ତୁ।",
    "layout.uploadDp": "ଫଟୋ ଅପଲୋଡ୍",
    "layout.photoHint": "ଚାଟ୍ ଓ ଆପ୍ ହେଡରରେ ଚତୁର୍ଭୁଜ ଫଟୋ ଭଲ ଲାଗେ।",
    "layout.displayName": "ଦେଖାଯାଉଥିବା ନାମ",
    "layout.status": "ସ୍ଥିତି",
    "layout.statusPlaceholder": "ଉପଲବ୍ଧ, ପ୍ରାର୍ଥନାରେ, ସେବାରେ, କିମ୍ବା ଛୋଟ ସାକ୍ଷ୍ୟ...",
    "layout.cancel": "ବାତିଲ୍",
    "layout.save": "ସେଭ୍",
    "layout.profileUpdated": "ପ୍ରୋଫାଇଲ୍ ଅପଡେଟ୍ ହେଲା।",
    "layout.profileLoadFailed": "ପ୍ରୋଫାଇଲ୍ ଲୋଡ୍ ହେଲା ନାହିଁ। ଆପଣ ତଥାପି ଅପଡେଟ୍ କରି ସେଭ୍ କରିପାରିବେ।",
    "layout.profileSaveFailed": "ପ୍ରୋଫାଇଲ୍ ସେଭ୍ ହେଲା ନାହିଁ।",
    "nav.general": "ସାଧାରଣ",
    "nav.community": "ସମୁଦାୟ",
    "nav.operations": "କାର୍ଯ୍ୟ",
    "nav.ministry": "ମିନିଷ୍ଟ୍ରି",
    "nav.admin": "ଆଡମିନ୍",
    "nav.home": "ହୋମ୍",
    "nav.aiPastor": "AI ପାଷ୍ଟର",
    "nav.readMe": "ରିଡ୍ ମି",
    "nav.appDownloads": "ଆପ୍ ଡାଉନଲୋଡ୍",
    "nav.sermons": "ପ୍ରବଚନ",
    "nav.prayerRequests": "ପ୍ରାର୍ଥନା ଅନୁରୋଧ",
    "nav.tasks": "କାମ",
    "nav.users": "ୟୁଜର୍",
    "nav.teams": "ଟିମ୍",
    "nav.roles": "ଭୂମିକା",
    "nav.pages": "ପେଜ୍",
    "nav.attendance": "ଉପସ୍ଥିତି",
    "nav.payroll": "ପେରୋଲ୍",
    "nav.costs": "ଖର୍ଚ୍ଚ",
    "nav.marriage": "ବିବାହ",
    "nav.baptism": "ବପ୍ତିସ୍ମା",
    "nav.counselling": "ପରାମର୍ଶ",
    "nav.adminDashboard": "ଆଡମିନ୍ ଡ୍ୟାଶବୋର୍ଡ",
    "nav.liveUsers": "ଲାଇଭ୍ ୟୁଜର୍",
    "nav.messageCenter": "ମେସେଜ୍ ସେଣ୍ଟର୍",
    "nav.languages": "ଭାଷା",
    "nav.emailClient": "ଇମେଲ୍ କ୍ଲାୟେଣ୍ଟ",
    "nav.googleDrive": "ଗୁଗୁଲ୍ ଡ୍ରାଇଭ୍",
    "nav.serverFiles": "ସର୍ଭର ଫାଇଲ୍",
    "common.addUser": "ୟୁଜର୍ ଯୋଡନ୍ତୁ",
    "common.refresh": "ରିଫ୍ରେଶ୍",
    "common.search": "ଖୋଜନ୍ତୁ",
    "common.cancel": "ବାତିଲ୍",
    "common.save": "ସେଭ୍",
    "common.delete": "ଡିଲିଟ୍",
    "common.edit": "ସଂପାଦନ",
    "common.download": "ଡାଉନଲୋଡ୍",
    "common.upload": "ଅପଲୋଡ୍",
    "common.send": "ପଠାନ୍ତୁ",
    "common.close": "ବନ୍ଦ",
    "common.loading": "ଲୋଡ୍ ହେଉଛି",
    "common.retry": "ପୁଣି ଚେଷ୍ଟା",
    "common.noData": "ଡାଟା ନାହିଁ",
    "common.actions": "କାର୍ଯ୍ୟ",
    "common.status": "ସ୍ଥିତି",
    "common.role": "ଭୂମିକା",
    "common.name": "ନାମ",
    "common.email": "ଇମେଲ୍",
    "common.phone": "ଫୋନ୍",
    "common.date": "ତାରିଖ",
  },
  ta: {
    "layout.language": "மொழி",
    "layout.openMenu": "மெனுவை திற",
    "layout.closeMenu": "மெனுவை மூடு",
    "layout.openPastor": "AI பாஸ்டரை திற",
    "layout.openChat": "சாட்டை திற",
    "layout.notifications": "அறிவிப்புகள்",
    "layout.profile": "ப்ரொஃபைல் படம் மற்றும் நிலை",
    "layout.logout": "வெளியேறு",
    "layout.logoutSwitch": "வெளியேறு / கணக்கு மாற்று",
    "layout.collapse": "சுருக்கு",
    "layout.expand": "விரிவாக்கு",
    "layout.profileTitle": "ப்ரொஃபைல்",
    "layout.profileSubtitle": "உங்கள் படம் மற்றும் WhatsApp போன்ற நிலையை புதுப்பிக்கவும்.",
    "layout.uploadDp": "படம் பதிவேற்று",
    "layout.photoHint": "சதுர படம் சாட் மற்றும் ஆப் ஹெடரில் நன்றாக தெரியும்.",
    "layout.displayName": "காட்சி பெயர்",
    "layout.status": "நிலை",
    "layout.statusPlaceholder": "கிடைக்கிறது, ஜெபத்தில், சேவையில், அல்லது சிறிய சாட்சி...",
    "layout.cancel": "ரத்து",
    "layout.save": "சேமி",
    "layout.profileUpdated": "ப்ரொஃபைல் புதுப்பிக்கப்பட்டது.",
    "layout.profileLoadFailed": "ப்ரொஃபைல் ஏற்றப்படவில்லை. இருந்தாலும் புதுப்பித்து சேமிக்கலாம்.",
    "layout.profileSaveFailed": "ப்ரொஃபைல் சேமிக்க முடியவில்லை.",
    "nav.general": "பொது",
    "nav.community": "சமூகம்",
    "nav.operations": "செயல்பாடுகள்",
    "nav.ministry": "ஊழியம்",
    "nav.admin": "அட்மின்",
    "nav.home": "முகப்பு",
    "nav.aiPastor": "AI பாஸ்டர்",
    "nav.readMe": "ரீட்மீ",
    "nav.appDownloads": "ஆப் பதிவிறக்கம்",
    "nav.sermons": "பிரசங்கங்கள்",
    "nav.prayerRequests": "ஜெப வேண்டுகோள்கள்",
    "nav.tasks": "பணிகள்",
    "nav.users": "பயனர்கள்",
    "nav.teams": "அணிகள்",
    "nav.roles": "பங்குகள்",
    "nav.pages": "பக்கங்கள்",
    "nav.attendance": "வருகை",
    "nav.payroll": "பேரோல்",
    "nav.costs": "செலவுகள்",
    "nav.marriage": "திருமணம்",
    "nav.baptism": "ஞானஸ்நானம்",
    "nav.counselling": "ஆலோசனை",
    "nav.adminDashboard": "அட்மின் டாஷ்போர்டு",
    "nav.liveUsers": "நேரடி பயனர்கள்",
    "nav.messageCenter": "செய்தி மையம்",
    "nav.languages": "மொழிகள்",
    "nav.emailClient": "மின்னஞ்சல் கிளையன்ட்",
    "nav.googleDrive": "கூகுள் டிரைவ்",
    "nav.serverFiles": "சர்வர் கோப்புகள்",
    "common.addUser": "பயனர் சேர்",
    "common.refresh": "புதுப்பி",
    "common.search": "தேடு",
    "common.cancel": "ரத்து",
    "common.save": "சேமி",
    "common.delete": "நீக்கு",
    "common.edit": "திருத்து",
    "common.download": "பதிவிறக்கு",
    "common.upload": "பதிவேற்று",
    "common.send": "அனுப்பு",
    "common.close": "மூடு",
    "common.loading": "ஏற்றுகிறது",
    "common.retry": "மீண்டும் முயற்சி",
    "common.noData": "தரவு இல்லை",
    "common.actions": "செயல்கள்",
    "common.status": "நிலை",
    "common.role": "பங்கு",
    "common.name": "பெயர்",
    "common.email": "மின்னஞ்சல்",
    "common.phone": "தொலைபேசி",
    "common.date": "தேதி",
  },
  mr: {
    "layout.language": "भाषा",
    "layout.openMenu": "मेनू उघडा",
    "layout.closeMenu": "मेनू बंद करा",
    "layout.openPastor": "AI पास्टर उघडा",
    "layout.openChat": "चॅट उघडा",
    "layout.notifications": "सूचना",
    "layout.profile": "प्रोफाइल फोटो आणि स्टेटस",
    "layout.logout": "लॉग आउट",
    "layout.logoutSwitch": "लॉग आउट / खाते बदला",
    "layout.collapse": "संकुचित करा",
    "layout.expand": "विस्तृत करा",
    "layout.profileTitle": "प्रोफाइल",
    "layout.profileSubtitle": "तुमचा फोटो आणि WhatsApp सारखा स्टेटस अपडेट करा.",
    "layout.uploadDp": "फोटो अपलोड करा",
    "layout.photoHint": "चॅट आणि अॅप हेडरमध्ये चौकोनी फोटो उत्तम दिसतो.",
    "layout.displayName": "दर्शविले जाणारे नाव",
    "layout.status": "स्टेटस",
    "layout.statusPlaceholder": "उपलब्ध, प्रार्थनेत, सेवेत, किंवा छोटी साक्ष...",
    "layout.cancel": "रद्द करा",
    "layout.save": "सेव्ह करा",
    "layout.profileUpdated": "प्रोफाइल अपडेट झाले.",
    "layout.profileLoadFailed": "प्रोफाइल लोड झाले नाही. तरीही तुम्ही अपडेट करून सेव्ह करू शकता.",
    "layout.profileSaveFailed": "प्रोफाइल सेव्ह होऊ शकले नाही.",
    "nav.general": "सामान्य",
    "nav.community": "समुदाय",
    "nav.operations": "ऑपरेशन्स",
    "nav.ministry": "मिनिस्ट्री",
    "nav.admin": "अॅडमिन",
    "nav.home": "होम",
    "nav.aiPastor": "AI पास्टर",
    "nav.readMe": "रीड मी",
    "nav.appDownloads": "अॅप डाउनलोड",
    "nav.sermons": "प्रवचने",
    "nav.prayerRequests": "प्रार्थना विनंत्या",
    "nav.tasks": "कामे",
    "nav.users": "वापरकर्ते",
    "nav.teams": "टीम्स",
    "nav.roles": "भूमिका",
    "nav.pages": "पेजेस",
    "nav.attendance": "हजेरी",
    "nav.payroll": "पेरोल",
    "nav.costs": "खर्च",
    "nav.marriage": "विवाह",
    "nav.baptism": "बाप्तिस्मा",
    "nav.counselling": "समुपदेशन",
    "nav.adminDashboard": "अॅडमिन डॅशबोर्ड",
    "nav.liveUsers": "लाइव्ह वापरकर्ते",
    "nav.messageCenter": "मेसेज सेंटर",
    "nav.languages": "भाषा",
    "nav.emailClient": "ईमेल क्लायंट",
    "nav.googleDrive": "गूगल ड्राइव्ह",
    "nav.serverFiles": "सर्व्हर फाइल्स",
    "common.addUser": "वापरकर्ता जोडा",
    "common.refresh": "रीफ्रेश",
    "common.search": "शोधा",
    "common.cancel": "रद्द करा",
    "common.save": "सेव्ह करा",
    "common.delete": "हटवा",
    "common.edit": "संपादित करा",
    "common.download": "डाउनलोड",
    "common.upload": "अपलोड",
    "common.send": "पाठवा",
    "common.close": "बंद करा",
    "common.loading": "लोड होत आहे",
    "common.retry": "पुन्हा प्रयत्न",
    "common.noData": "डेटा नाही",
    "common.actions": "कारवाई",
    "common.status": "स्थिती",
    "common.role": "भूमिका",
    "common.name": "नाव",
    "common.email": "ईमेल",
    "common.phone": "फोन",
    "common.date": "तारीख",
  },
};

const PHRASE_KEYS = [
  "nav.home",
  "nav.aiPastor",
  "nav.readMe",
  "nav.appDownloads",
  "nav.sermons",
  "nav.prayerRequests",
  "nav.tasks",
  "nav.users",
  "nav.teams",
  "nav.roles",
  "nav.pages",
  "nav.attendance",
  "nav.payroll",
  "nav.costs",
  "nav.marriage",
  "nav.baptism",
  "nav.counselling",
  "nav.adminDashboard",
  "nav.liveUsers",
  "nav.messageCenter",
  "nav.languages",
  "nav.emailClient",
  "nav.googleDrive",
  "nav.serverFiles",
  "common.addUser",
  "common.refresh",
  "common.search",
  "common.cancel",
  "common.save",
  "common.delete",
  "common.edit",
  "common.download",
  "common.upload",
  "common.send",
  "common.close",
  "common.loading",
  "common.retry",
  "common.noData",
  "common.actions",
  "common.status",
  "common.role",
  "common.name",
  "common.email",
  "common.phone",
  "common.date",
];

const TRANSLATION_CACHE_KEY = "mahima_ui_translation_cache_v4";
const TRANSLATABLE_ATTRIBUTES = ["placeholder", "aria-label", "title", "alt"];
const originalTextByNode = new WeakMap();
const translatedTextByNode = new WeakMap();
let translationCacheMemory = null;

const LANGUAGE_NAMES = {
  en: "English",
  hi: "Hindi",
  pa: "Punjabi",
  or: "Odia",
  ta: "Tamil",
  mr: "Marathi",
  ne: "Nepali",
};

const BUILT_IN_LANGUAGE_BY_CODE = new Map(
  REQUIRED_UI_LANGUAGES.map((language) => [language.code, language])
);

function looksLikeMojibake(value) {
  return /[ÃÂ�]|à[¤¥¦§¨©ª«¬®¯]/.test(String(value || ""));
}

function mergeLanguages(apiLanguages = []) {
  const map = new Map();
  REQUIRED_UI_LANGUAGES.forEach((language) => map.set(language.code, { ...language }));
  (Array.isArray(apiLanguages) ? apiLanguages : []).forEach((language) => {
    if (!language?.code) return;
    const code = String(language.code).trim().toLowerCase();
    const existing = map.get(code) || {};
    const builtIn = BUILT_IN_LANGUAGE_BY_CODE.get(code);
    const merged = { ...existing, ...language, code, enabled: language.enabled !== false };

    if (builtIn) {
      map.set(code, {
        ...merged,
        name: builtIn.name,
        nativeName: builtIn.nativeName,
        rtl: builtIn.rtl,
      });
      return;
    }

    if (looksLikeMojibake(merged.nativeName)) {
      merged.nativeName = merged.name || code.toUpperCase();
    }

    map.set(code, merged);
  });
  return Array.from(map.values())
    .filter((language) => language.enabled !== false)
    .sort((a, b) => Number(a.displayOrder ?? 999) - Number(b.displayOrder ?? 999));
}

function buildPhraseMap(lang) {
  const active = dictionaries[lang] || dictionaries.en || {};
  const english = dictionaries.en || {};
  const map = new Map();
  PHRASE_KEYS.forEach((key) => {
    const target = active[key] || english[key];
    if (!target) return;
    Object.values(dictionaries).forEach((dictionary) => {
      const source = dictionary?.[key];
      if (source && source !== target) map.set(source, target);
    });
  });
  return map;
}

function translateExactText(text, phraseMap) {
  if (!text || phraseMap.size === 0) return text;
  const leading = text.match(/^\s*/)?.[0] || "";
  const trailing = text.match(/\s*$/)?.[0] || "";
  const core = text.trim();
  if (!core) return text;
  const translated = phraseMap.get(core);
  return translated ? `${leading}${translated}${trailing}` : text;
}

function getTranslationCache() {
  if (translationCacheMemory) return translationCacheMemory;
  try {
    translationCacheMemory = JSON.parse(localStorage.getItem(TRANSLATION_CACHE_KEY) || "{}") || {};
  } catch {
    translationCacheMemory = {};
  }
  return translationCacheMemory;
}

function saveTranslationCache() {
  try {
    localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(translationCacheMemory || {}));
  } catch {}
}

function rememberTranslations(lang, translations) {
  if (!lang || !translations || typeof translations !== "object") return;
  const cache = getTranslationCache();
  cache[lang] = cache[lang] || {};
  Object.entries(translations).forEach(([source, translated]) => {
    const key = String(source || "").trim();
    const value = String(translated || "").trim();
    if (key && value) cache[lang][key] = value;
  });
  saveTranslationCache();
}

function getCachedTranslation(lang, text) {
  const key = String(text || "").trim();
  if (!lang || !key) return "";
  return getTranslationCache()?.[lang]?.[key] || "";
}

function applyTranslatedText(original, translated) {
  const source = String(original || "");
  const leading = source.match(/^\s*/)?.[0] || "";
  const trailing = source.match(/\s*$/)?.[0] || "";
  const value = String(translated || "").trim();
  return value ? `${leading}${value}${trailing}` : source;
}

function isLikelyUserOrRecordText(text, parent) {
  const core = String(text || "").replace(/\s+/g, " ").trim();
  if (!core) return true;
  if (core.length < 2 || core.length > 260) return true;
  if (/https?:\/\/|www\.|@/.test(core)) return true;
  if (/^[\d\s.,:/\\\-+()%$#]+$/.test(core)) return true;
  if (/^(MHN|INV|TXN|JE|GL|GST|PAN|TAN|IFSC)[A-Z0-9_-]*$/i.test(core)) return true;
  if (/^\+?\d[\d\s()-]{6,}$/.test(core)) return true;
  if (/^[A-Z0-9_-]{3,30}$/.test(core) && !/\s/.test(core)) return true;

  const dynamicParent = parent?.closest?.(
    [
      "[data-no-ui-translate]",
      "[data-user-content]",
      "[data-dynamic-content]",
      ".chat-message",
      ".message-bubble",
      ".chat-bubble",
      ".message-text",
      ".chat-list",
      ".chat-list-item",
      ".mail-message",
      ".mail-body",
      ".file-row",
      ".ledger-row",
      ".transaction-row",
      ".avatar",
      ".user-avatar",
      ".profile-avatar",
    ].join(",")
  );
  if (dynamicParent) return true;

  const words = core.split(/\s+/).filter(Boolean);
  const looksLikeName = words.length <= 3 && words.every((word) => /^[A-Z][a-z.'-]{1,24}$/.test(word));
  const headingOrControl = /^(H[1-6]|BUTTON|LABEL|A)$/i.test(parent?.tagName || "");
  return looksLikeName && !headingOrControl;
}

async function fetchRemoteTranslations(lang, texts) {
  const unique = Array.from(new Set((texts || []).map((text) => String(text || "").trim()).filter(Boolean))).slice(0, 30);
  if (!unique.length || lang === "en") return {};

  try {
    const response = await apiFetch("/ui-translation/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      timeoutMs: 15000,
      body: JSON.stringify({
        language: lang,
        languageName: LANGUAGE_NAMES[lang] || lang,
        texts: unique,
      }),
    });

    return response?.translations && typeof response.translations === "object"
      ? response.translations
      : {};
  } catch (error) {
    console.warn("Page translation API unavailable.", error?.message || error);
    return {};
  }
}

function shouldSkipElement(element) {
  if (!element) return true;
  if (element.closest("[data-no-auto-translate]")) return true;
  const tag = element.tagName;
  return ["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "SELECT", "OPTION", "CODE", "PRE", "TIME"].includes(tag);
}

function isStaticUiText(parent, text, phraseMap) {
  const core = String(text || "").trim();
  if (!core) return false;
  if (phraseMap.has(core)) return true;

  const tag = parent?.tagName || "";
  if (/^(H1|H2|H3|H4|H5|H6|BUTTON|LABEL|TH|LEGEND)$/i.test(tag)) return true;

  return Boolean(parent?.closest?.(
    "button,label,th,legend,[role='button'],[data-ui-translate],[data-static-ui]"
  ));
}

function setTranslatedNodeValue(node, next) {
  if (node.nodeValue !== next) node.nodeValue = next;
  translatedTextByNode.set(node, next);
}

function collectTextNodes(root) {
  if (!root) return [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || shouldSkipElement(parent)) return NodeFilter.FILTER_REJECT;
      const text = node.nodeValue || "";
      if (!text.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  return nodes;
}

function translateAttributes(root, phraseMap, lang) {
  if (!root || lang === "en") return;
  const elements = [root, ...Array.from(root.querySelectorAll?.("*") || [])].filter(Boolean);
  elements.forEach((element) => {
    if (shouldSkipElement(element)) return;
    TRANSLATABLE_ATTRIBUTES.forEach((attribute) => {
      const current = element.getAttribute?.(attribute);
      if (!current || !current.trim()) return;
      const sourceKey = `data-mahima-source-${attribute.replace(/[^a-z0-9]+/gi, "-")}`;
      if (!element.hasAttribute(sourceKey)) element.setAttribute(sourceKey, current);
      const source = element.getAttribute(sourceKey) || current;
      const exact = translateExactText(source, phraseMap);
      element.setAttribute(attribute, exact);
    });
  });
}

async function translateTree(root, phraseMap, lang) {
  if (!root || lang === "en") return;
  translateAttributes(root, phraseMap, lang);

  const pending = new Map();
  const nodes = collectTextNodes(root);
  nodes.forEach((node) => {
    const current = node.nodeValue || "";
    const previousTranslated = translatedTextByNode.get(node);
    if (!originalTextByNode.has(node) || (previousTranslated && current !== previousTranslated)) {
      originalTextByNode.set(node, current);
      translatedTextByNode.delete(node);
    }

    const source = originalTextByNode.get(node) || current;
    const core = source.replace(/\s+/g, " ").trim();
    if (!core) return;

    const exact = translateExactText(source, phraseMap);
    if (exact !== source) {
      setTranslatedNodeValue(node, exact);
      return;
    }

    const cached = getCachedTranslation(lang, core);
    if (cached) {
      const next = applyTranslatedText(source, cached);
      setTranslatedNodeValue(node, next);
      return;
    }

    if (!/[A-Za-z]/.test(core)) return;
    if (isLikelyUserOrRecordText(core, node.parentElement)) return;
    if (!isStaticUiText(node.parentElement, core, phraseMap)) return;
    if (!pending.has(core)) pending.set(core, []);
    pending.get(core).push(node);
  });

  if (!pending.size) return;

  const translations = await fetchRemoteTranslations(lang, Array.from(pending.keys()));
  rememberTranslations(lang, translations);

  pending.forEach((pendingNodes, sourceText) => {
    const translated = translations?.[sourceText];
    if (!translated) return;
    pendingNodes.forEach((node) => {
      const source = originalTextByNode.get(node) || "";
      if (source.replace(/\s+/g, " ").trim() !== sourceText) return;
      const next = applyTranslatedText(source, translated);
      setTranslatedNodeValue(node, next);
    });
  });
}

function GlobalTextTranslator({ lang }) {
  useEffect(() => {
    const phraseMap = buildPhraseMap(lang);
    document.documentElement.lang = lang || "en";
    if (!lang || lang === "en") return undefined;

    let timer = 0;
    let runId = 0;
    const run = () => {
      window.clearTimeout(timer);
      const currentRun = ++runId;
      timer = window.setTimeout(() => {
        translateTree(document.body, phraseMap, lang).catch((error) => {
          if (currentRun === runId) console.warn("Page translation failed.", error?.message || error);
        });
      }, 180);
    };

    run();
    const observer = new MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [lang]);

  return null;
}

const LanguageContext = createContext({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
  translateText: (text) => text,
  languages: REQUIRED_UI_LANGUAGES,
  defaultLang: "en",
  refreshLanguages: () => {},
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem("mahima_lang") || "en";
    } catch {
      return "en";
    }
  });

  const [languages, setLanguages] = useState(() => {
    try {
      const cached = localStorage.getItem("mahima_languages");
      if (cached) return mergeLanguages(JSON.parse(cached));
    } catch {}
    return REQUIRED_UI_LANGUAGES;
  });

  async function refreshLanguages() {
    try {
      const list = await listEnabledLanguages();
      const next = mergeLanguages(list);
      setLanguages(next);
      try { localStorage.setItem("mahima_languages", JSON.stringify(next)); } catch {}
    } catch (e) {
      console.warn("Languages API unreachable, using fallback list.", e?.message || e);
      setLanguages((current) => mergeLanguages(current));
    }
  }

  useEffect(() => {
    refreshLanguages();
  }, []);

  const defaultLang = useMemo(
    () => languages.find((language) => language.isDefault)?.code || "en",
    [languages]
  );

  useEffect(() => {
    const enabled = new Set(languages.map((language) => language.code));
    if (!enabled.has(lang)) {
      setLangState(defaultLang);
      try { localStorage.setItem("mahima_lang", defaultLang); } catch {}
    }
  }, [defaultLang, lang, languages]);

  const setLang = (value) => {
    const next = value || "en";
    const previous = lang;
    setLangState(next);
    try { localStorage.setItem("mahima_lang", next); } catch {}
    window.dispatchEvent(new CustomEvent("mahima:language-change", { detail: { lang: next } }));
    if (next === "en" && previous && previous !== "en") {
      window.setTimeout(() => window.location.reload(), 60);
    }
  };

  const value = useMemo(() => {
    const phraseMap = buildPhraseMap(lang);
    return {
      lang,
      setLang,
      t: (key) => dictionaries[lang]?.[key] ?? dictionaries.en?.[key] ?? key,
      translateText: (text) => translateExactText(String(text ?? ""), phraseMap),
      languages,
      defaultLang,
      refreshLanguages,
    };
  }, [defaultLang, lang, languages]);

  return (
    <LanguageContext.Provider value={value}>
      <GlobalTextTranslator lang={lang} />
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
