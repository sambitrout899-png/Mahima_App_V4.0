# GoPro to YouTube Live Broadcast

The admin-only **Live Broadcast** module supervises an FFmpeg process that receives one video/audio feed and relays it to YouTube Live using RTMPS. The YouTube stream key is held only in process memory and is never returned by the status API.

## Server setup

1. Install FFmpeg on the API server and confirm `ffmpeg -version` works for the API service account.
2. If it is not on `PATH`, set `LiveBroadcast:FfmpegPath` in the production configuration to its absolute executable path.
3. Allow outbound TCP 443 to `a.rtmps.youtube.com` and allow the chosen inbound camera/bridge port.
4. Restart the Mahima API, then open **Admin > Live Broadcast**.

Only one broadcast can run per API instance. This deliberately prevents two operators from publishing with the same channel key.

## Production switcher capabilities

- Up to eight FFmpeg-readable camera, mobile, screen-share, media, RTSP, RTMP, UDP, or HTTP inputs
- Preview/program selection and single, split-screen, picture-in-picture, and four-source grid compositions
- Per-input audio enable, mute, and 0–200% gain with automatic resampling and mixed program audio
- Up to eight live text graphics/lower-thirds in selectable screen positions
- Up to four simultaneous RTMP/RTMPS destinations using isolated-output failure handling
- YouTube-compatible 1080p, 720p, and 480p encoding profiles
- Concurrent loss-resistant MKV recording, operator presets, status polling, and encoder diagnostics

The current FFmpeg relay builds a composition when a broadcast starts. Changing Program, layouts, inputs, or graphics during an active broadcast requires the planned dynamic switcher worker and is intentionally locked in the UI to avoid interrupting an on-air service. Advanced vMix-class functions such as NDI discovery, SRT listener management, PTZ control, instant replay, ISO recording, chroma key, animated title templates, remote callers, hardware control surfaces, and live waveform/vectorscope monitoring are separate production subsystems rather than UI-only additions.

## Connecting the GoPro

The module accepts any FFmpeg-readable URL containing both video and audio, including UDP, RTSP, HTTP, or an RTMP receiver/bridge URL. Exact capture setup depends on the GoPro model:

- A GoPro model with custom RTMP streaming can send to a local RTMP receiver (for example MediaMTX); enter that receiver's readable URL in the module.
- A GoPro connected through HDMI/Media Mod and a USB capture card can be exposed by an OBS or FFmpeg bridge as a local network URL.
- Do not use the camera's low-resolution control/preview stream for a production service; it may omit audio and is not intended for continuous broadcast.

Keep the GoPro on external power, disable automatic sleep, use wired Ethernet for the capture computer when possible, and verify both picture and YouTube audio meters before selecting **Go Live** in YouTube Studio.

## Browser and mobile device discovery

The Local Device Center uses the standard `navigator.mediaDevices` APIs and listens for `devicechange` events. After the operator grants permission it can enumerate and test:

- USB webcams, UVC capture cards, GoPros operating in USB webcam mode, and built-in cameras
- USB, built-in, and OS-paired Bluetooth microphones/audio inputs
- Browser-selected screens, application windows, browser tabs, and supported system/tab audio

Device enumeration and capture require HTTPS (except `localhost`) and explicit operator permission. Browsers intentionally cannot enumerate nearby Wi-Fi networks, probe arbitrary LAN devices, or access a GoPro over Bluetooth as a video source. A camera connected to the browser user's machine also cannot be opened by an API hosted on another computer. Moving those browser-local tracks into the server mixer requires a WebRTC/WHIP ingest gateway or an installed local bridge; the Device Center therefore previews/tests local devices while server-readable RTSP/RTMP/UDP/HTTP bridge URLs feed the production engine.

## Laptop audio and intelligent mix

When the API and FFmpeg run on the Windows production laptop, **Add to mixer** creates a `dshow://audio=<device name>` input. For laptop playback audio, enable Windows **Stereo Mix** or install a loopback device such as VB-CABLE/VoiceMeeter and select its recording endpoint. If the API is hosted elsewhere, replace that DirectShow URL with an RTMP, SRT, or UDP feed from a laptop-side bridge.

Each input supports gain, FFT denoise, and optional speech compression. The master bus can apply an 80 Hz rumble cut, EBU loudness normalization, and a final anti-clip limiter. These processes run locally in FFmpeg and do not depend on a cloud AI request during a live service.

## OBS / vMix program feed

Enable **OBS / vMix program feed** in Outputs. The default OBS Media Source URL is `udp://@127.0.0.1:10000`. For a different computer, set Host to that computer's reachable LAN address and permit the selected UDP port in its firewall. This feed contains the final video composition and processed stereo mix.

## YouTube channel sign-in

Create an OAuth 2.0 **Web application** credential in Google Cloud, enable YouTube Data API v3, and register the exact callback URI. Configure production secrets outside source control:

```json
"YouTubeOAuth": {
  "ClientId": "...apps.googleusercontent.com",
  "ClientSecret": "...",
  "RedirectUri": "https://YOUR_HOST/api/live-broadcast/youtube/callback"
}
```

The Connect button uses Google's server-side authorization-code flow. Tokens currently live only in API process memory, so reconnect after an API restart. RTMPS publishing still uses the stream key field; OAuth establishes channel identity for the platform.

## API

- `GET /api/live-broadcast/status`
- `POST /api/live-broadcast/start`
- `POST /api/live-broadcast/stop`
- `GET /api/live-broadcast/youtube/status`
- `POST /api/live-broadcast/youtube/authorize`
- `GET /api/live-broadcast/youtube/callback`
- `DELETE /api/live-broadcast/youtube/connection`

All endpoints require an authenticated user with the `admin` role.
