# Mahima Mobile App

This frontend is now configured as a Capacitor Android app.

## Build APK

```powershell
cd C:\Users\sambit.rout\MahimaApi\Mahima_App_V4.0\frontend
npm run android:debug
```

The debug APK is created at:

```text
C:\Users\sambit.rout\MahimaApi\Mahima_App_V4.0\frontend\android\app\build\outputs\apk\debug\app-debug.apk
```

## Open In Android Studio

```powershell
cd C:\Users\sambit.rout\MahimaApi\Mahima_App_V4.0\frontend
npm run mobile:open
```

## Production API

The mobile build uses `.env.mobile`:

```text
VITE_API_BASE=https://mahimaministries.in/api
VITE_HUB_BASE=https://mahimaministries.in/api/hubs
VITE_APP_ORIGIN=https://mahimaministries.in
```

Keep the production API on HTTPS. Chat, uploads, AI Pastor, audio call, and video call need HTTPS plus the Android camera, microphone, and media permissions already added in `android/app/src/main/AndroidManifest.xml`.
