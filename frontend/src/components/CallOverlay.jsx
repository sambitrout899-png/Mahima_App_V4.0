// src/components/CallOverlay.jsx
//
// Full-screen overlay shown for incoming, outgoing, active, and failed
// audio/video calls. Driven by the state object returned from useChatCall.
//
import React, { useEffect, useRef } from "react";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  AlertTriangle,
} from "lucide-react";

const colorFromId = (id) => {
  const palette = [
    "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6",
    "#ec4899", "#f97316", "#f59e0b", "#84cc16",
  ];
  let h = 0;
  const s = String(id || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
};

const initialsFrom = (name = "?") =>
  String(name || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

export default function CallOverlay({
  callState,
  peerName,
  peerId,
  localStream,
  remoteStream,
  audioMuted,
  videoOff,
  onAccept,
  onReject,
  onEnd,
  onToggleMic,
  onToggleCamera,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      // Keep audio playback on the dedicated audio element below. This avoids
      // double audio when both <video> and <audio> receive the same stream.
      remoteVideoRef.current.muted = true;
      remoteVideoRef.current.play?.().catch(() => {});
    }
  }, [remoteStream]);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.volume = 1;
      remoteAudioRef.current.play?.().catch(() => {});
    }
  }, [remoteStream]);

  if (!callState || callState.status === "idle" || callState.status === "ended") {
    return null;
  }

  const isVideo = callState.type === "video";
  const isRinging = callState.status === "ringing";
  const isCalling = callState.status === "calling";
  const isConnecting = callState.status === "connecting";
  const isActive = callState.status === "active";
  const isError = callState.status === "error";

  const statusLabel =
    isError ? "Call unavailable" :
    isRinging ? `Incoming ${isVideo ? "video" : "audio"} call` :
    isCalling ? "Calling..." :
    isConnecting ? "Connecting..." :
    isActive ? (isVideo ? "Video call" : "Audio call") :
    "";

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900 text-white flex flex-col"
         role="dialog" aria-modal="true" aria-label="Call">
      {remoteStream && (
        <audio
          ref={remoteAudioRef}
          autoPlay
          playsInline
          className="hidden"
        />
      )}

      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        {isVideo && remoteStream && !isError ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center text-center px-6 max-w-lg">
            <div
              className={`w-32 h-32 rounded-full text-white text-3xl font-bold flex items-center justify-center shadow-2xl mb-5 ${isError ? "bg-red-600" : ""}`}
              style={isError ? undefined : { background: colorFromId(peerId || peerName) }}
            >
              {isError ? <AlertTriangle className="w-14 h-14" /> : initialsFrom(peerName)}
            </div>
            <h2 className="text-2xl font-semibold">{peerName || "Conversation"}</h2>
            <p className="mt-2 text-sm text-slate-300">{statusLabel}</p>
            {isError && callState.error && (
              <p className="mt-4 text-sm leading-6 text-slate-200 bg-white/10 rounded-xl px-4 py-3">
                {callState.error}
              </p>
            )}
            {isCalling && <RingingDots />}
          </div>
        )}

        {isVideo && localStream && (isActive || isConnecting || isCalling) && !isError && (
          <div className="absolute top-4 right-4 w-28 h-40 sm:w-36 sm:h-52 rounded-xl overflow-hidden shadow-2xl bg-black border-2 border-white/20">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {(isCalling || isConnecting || isActive) && !isError && (
          <div className="absolute top-4 left-4 right-32 sm:right-44">
            <div className="inline-flex items-center gap-2 bg-black/40 backdrop-blur rounded-full px-3 py-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold truncate max-w-[14rem]">{peerName || "Conversation"}</span>
              <span className="text-slate-300">- {statusLabel}</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-900/95 backdrop-blur px-4 py-5 flex items-center justify-center gap-4 sm:gap-8"
           style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
        {isRinging ? (
          <>
            <button
              type="button"
              onClick={onReject}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-xl"
              aria-label="Reject call"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center shadow-xl"
              aria-label="Accept call"
            >
              <Phone className="w-7 h-7" />
            </button>
          </>
        ) : isError ? (
          <button
            type="button"
            onClick={onEnd}
            className="min-w-36 h-14 rounded-full bg-white/15 hover:bg-white/25 px-6 flex items-center justify-center gap-2 shadow-xl font-semibold"
            aria-label="Close call message"
          >
            <PhoneOff className="w-5 h-5" />
            Close
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onToggleMic}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg ${
                audioMuted ? "bg-red-600 hover:bg-red-700" : "bg-white/15 hover:bg-white/25"
              }`}
              aria-label={audioMuted ? "Unmute mic" : "Mute mic"}
            >
              {audioMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            {isVideo && (
              <button
                type="button"
                onClick={onToggleCamera}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg ${
                  videoOff ? "bg-red-600 hover:bg-red-700" : "bg-white/15 hover:bg-white/25"
                }`}
                aria-label={videoOff ? "Turn camera on" : "Turn camera off"}
              >
                {videoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>
            )}

            <button
              type="button"
              onClick={onEnd}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-xl"
              aria-label="End call"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function RingingDots() {
  return (
    <span className="inline-flex gap-1 mt-3" aria-hidden>
      <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
      <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" style={{ animationDelay: "150ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" style={{ animationDelay: "300ms" }} />
    </span>
  );
}
