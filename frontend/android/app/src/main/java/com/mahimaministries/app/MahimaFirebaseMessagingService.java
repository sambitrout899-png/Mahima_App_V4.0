package com.mahimaministries.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;
import androidx.core.app.ActivityCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class MahimaFirebaseMessagingService extends FirebaseMessagingService {
    private static final String CALL_CHANNEL_ID = "jai-masih-calls";

    @Override
    public void onMessageReceived(RemoteMessage message) {
        Map<String, String> data = message.getData();
        if (data == null || !"call".equals(data.get("kind"))) {
            return;
        }
        showIncomingCall(data);
    }

    private void showIncomingCall(Map<String, String> data) {
        if (Build.VERSION.SDK_INT >= 33
            && ActivityCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        ensureCallChannel();

        String chatId = nonEmpty(data.get("chatId"), "");
        String callerName = nonEmpty(data.get("callerName"), "Jai Masih");
        String callType = nonEmpty(data.get("callType"), nonEmpty(data.get("type"), "audio"));
        String title = "video".equalsIgnoreCase(callType) ? "Incoming video call" : "Incoming audio call";
        String body = callerName + " is calling you";

        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("kind", "call");
        intent.putExtra("chatId", chatId);
        intent.putExtra("callerId", nonEmpty(data.get("callerId"), nonEmpty(data.get("fromUserId"), "")));
        intent.putExtra("callerName", callerName);
        intent.putExtra("callType", callType);

        int requestCode = Math.abs(("call:" + chatId).hashCode());
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pendingIntent = PendingIntent.getActivity(this, requestCode, intent, flags);

        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(this, CALL_CHANNEL_ID)
            : new Notification.Builder(this);

        Notification notification = builder
            .setSmallIcon(R.drawable.ic_stat_jai_masih)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new Notification.BigTextStyle().bigText(body))
            .setCategory(Notification.CATEGORY_CALL)
            .setAutoCancel(true)
            .setOngoing(true)
            .setShowWhen(true)
            .setContentIntent(pendingIntent)
            .setFullScreenIntent(pendingIntent, true)
            .setPriority(Notification.PRIORITY_MAX)
            .setDefaults(Notification.DEFAULT_SOUND | Notification.DEFAULT_VIBRATE | Notification.DEFAULT_LIGHTS)
            .build();

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(requestCode, notification);
        }
    }

    private void ensureCallChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        NotificationChannel callChannel = new NotificationChannel(
            CALL_CHANNEL_ID,
            "Jai Masih - Calls",
            NotificationManager.IMPORTANCE_HIGH
        );
        callChannel.setDescription("Incoming Jai Masih audio and video calls");
        callChannel.enableVibration(true);
        callChannel.setVibrationPattern(new long[]{0, 600, 250, 600, 250, 600});
        callChannel.enableLights(true);
        callChannel.setLightColor(Color.parseColor("#047857"));
        callChannel.setShowBadge(true);
        manager.createNotificationChannel(callChannel);
    }

    private static String nonEmpty(String value, String fallback) {
        return value == null || value.trim().isEmpty() ? fallback : value.trim();
    }
}
