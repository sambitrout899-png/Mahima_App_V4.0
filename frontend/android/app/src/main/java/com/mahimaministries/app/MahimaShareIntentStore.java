package com.mahimaministries.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import org.json.JSONObject;

public final class MahimaShareIntentStore {
    private static final String PREFS = "mahima_share_intents";
    private static final String PENDING_SHARE_JSON = "pending_share_json";

    private MahimaShareIntentStore() {}

    public static void saveFromIntent(Context context, Intent intent) {
        if (context == null || intent == null) return;
        String action = intent.getAction();
        String type = intent.getType();
        if (!Intent.ACTION_SEND.equals(action) || type == null || !type.startsWith("text/")) return;

        String text = intent.getStringExtra(Intent.EXTRA_TEXT);
        String subject = intent.getStringExtra(Intent.EXTRA_SUBJECT);
        if ((text == null || text.trim().isEmpty()) && (subject == null || subject.trim().isEmpty())) return;

        try {
            JSONObject json = new JSONObject();
            json.put("text", text == null ? "" : text.trim());
            json.put("subject", subject == null ? "" : subject.trim());
            json.put("receivedAt", String.valueOf(System.currentTimeMillis()));

            SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            prefs.edit().putString(PENDING_SHARE_JSON, json.toString()).apply();
        } catch (Exception ignored) {
        }
    }
}
