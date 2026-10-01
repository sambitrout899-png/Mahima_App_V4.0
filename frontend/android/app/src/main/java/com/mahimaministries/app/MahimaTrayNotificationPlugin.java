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
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MahimaTrayNotification")
public class MahimaTrayNotificationPlugin extends Plugin {
    private static final String CHAT_CHANNEL_ID = "jai-masih";
    private static final String GENERAL_CHANNEL_ID = "mahima-general";

    @PluginMethod
    public void show(PluginCall call) {
        String title = nonEmpty(call.getString("title"), "Jai Masih Di");
        String body = nonEmpty(call.getString("body"), "New message");
        String channelId = nonEmpty(call.getString("channelId"), CHAT_CHANNEL_ID);
        int id = call.getInt("id", (int) (System.currentTimeMillis() % 2147483000L));

        if (Build.VERSION.SDK_INT >= 33
            && ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            call.reject("Android notification permission is not granted.");
            return;
        }

        ensureChannels();

        Intent intent = new Intent(getContext(), MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(getContext(), id, intent, flags);

        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(getContext(), channelId)
            : new Notification.Builder(getContext());

        Notification notification = builder
            .setSmallIcon(R.drawable.ic_stat_jai_masih)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new Notification.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setShowWhen(true)
            .setContentIntent(pendingIntent)
            .setPriority(Notification.PRIORITY_HIGH)
            .setDefaults(Notification.DEFAULT_SOUND | Notification.DEFAULT_VIBRATE | Notification.DEFAULT_LIGHTS)
            .build();

        NotificationManager manager =
            (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) {
            call.reject("NotificationManager is not available.");
            return;
        }

        manager.notify(id, notification);
        JSObject result = new JSObject();
        result.put("shown", true);
        result.put("id", id);
        call.resolve(result);
    }

    private void ensureChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager =
            (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        NotificationChannel chatChannel = new NotificationChannel(
            CHAT_CHANNEL_ID,
            "Jai Masih - Chat Messages",
            NotificationManager.IMPORTANCE_HIGH
        );
        chatChannel.setDescription("Real-time chat messages from the Mahima Ministry community");
        chatChannel.enableVibration(true);
        chatChannel.setVibrationPattern(new long[]{0, 250, 100, 250});
        chatChannel.enableLights(true);
        chatChannel.setLightColor(Color.parseColor("#047857"));
        chatChannel.setShowBadge(true);
        manager.createNotificationChannel(chatChannel);

        NotificationChannel generalChannel = new NotificationChannel(
            GENERAL_CHANNEL_ID,
            "Mahima Ministry - General",
            NotificationManager.IMPORTANCE_DEFAULT
        );
        generalChannel.setDescription("Prayer requests, meetings and general alerts");
        generalChannel.enableVibration(true);
        generalChannel.enableLights(true);
        generalChannel.setLightColor(Color.parseColor("#047857"));
        generalChannel.setShowBadge(true);
        manager.createNotificationChannel(generalChannel);
    }

    private static String nonEmpty(String value, String fallback) {
        return value == null || value.trim().isEmpty() ? fallback : value.trim();
    }
}
