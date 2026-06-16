package com.mahimaministries.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.messaging.FirebaseMessaging;

@CapacitorPlugin(name = "MahimaPushToken")
public class MahimaPushTokenPlugin extends Plugin {

    @PluginMethod
    public void getToken(PluginCall call) {
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(task -> {
                if (!task.isSuccessful()) {
                    Exception ex = task.getException();
                    call.reject(ex != null ? ex.getMessage() : "Unable to get Firebase token");
                    return;
                }

                String token = task.getResult();
                JSObject ret = new JSObject();
                ret.put("token", token == null ? "" : token);
                call.resolve(ret);
            });
    }
}
