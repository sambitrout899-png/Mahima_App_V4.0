package com.mahimaministries.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import org.json.JSONObject;

public final class MahimaCallIntentStore {
    private static final String PREFS = "mahima_call_intents";
    private static final String PENDING_CALL_JSON = "pending_call_json";

    private MahimaCallIntentStore() {}

    public static void saveFromIntent(Context context, Intent intent) {
        if (context == null || intent == null) return;
        String kind = intent.getStringExtra("kind");
        String chatId = intent.getStringExtra("chatId");
        if (!"call".equals(kind) || chatId == null || chatId.trim().isEmpty()) return;

        try {
            JSONObject json = new JSONObject();
            json.put("chatId", chatId);
            json.put("callerId", value(intent, "callerId"));
            json.put("callerName", value(intent, "callerName"));
            json.put("callType", value(intent, "callType", "audio"));
            json.put("tappedAt", String.valueOf(System.currentTimeMillis()));

            SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            prefs.edit().putString(PENDING_CALL_JSON, json.toString()).apply();
        } catch (Exception ignored) {
        }
    }

    private static String value(Intent intent, String key) {
        return value(intent, key, "");
    }

    private static String value(Intent intent, String key, String fallback) {
        String value = intent.getStringExtra(key);
        return value == null || value.trim().isEmpty() ? fallback : value;
    }
}
