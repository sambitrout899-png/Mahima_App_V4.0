package com.mahimaministries.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(MahimaPushTokenPlugin.class);
        super.onCreate(savedInstanceState);
        createNotificationChannels();
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null) return;

        NotificationChannel chatChannel = new NotificationChannel(
            "jai-masih",
            "Jai Masih - Chat Messages",
            NotificationManager.IMPORTANCE_HIGH
        );
        chatChannel.setDescription("Real-time chat messages from the Mahima Ministry community");
        chatChannel.enableVibration(true);
        chatChannel.setVibrationPattern(new long[]{0, 250, 100, 250});
        chatChannel.enableLights(true);
        chatChannel.setLightColor(Color.parseColor("#047857"));
        chatChannel.setShowBadge(true);
        nm.createNotificationChannel(chatChannel);

        NotificationChannel generalChannel = new NotificationChannel(
            "mahima-general",
            "Mahima Ministry - General",
            NotificationManager.IMPORTANCE_DEFAULT
        );
        generalChannel.setDescription("Prayer requests, meetings and general alerts");
        generalChannel.enableVibration(true);
        generalChannel.enableLights(true);
        generalChannel.setLightColor(Color.parseColor("#047857"));
        generalChannel.setShowBadge(true);
        nm.createNotificationChannel(generalChannel);
    }
}
