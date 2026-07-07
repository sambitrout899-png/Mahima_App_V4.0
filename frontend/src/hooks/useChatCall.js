// src/hooks/useChatCall.js
//
// WebRTC audio/video call over the existing ChatHub.
// Hub methods used (already in ChatHub.cs):
//   - StartCall({ chatId, sdp })        client -> server: send SDP offer
//   - CallSignal({ chatId, type, data}) client -> server: ICE / answer
//   - EndCall(chatId)                   client -> server: hang up
// Hub events listened to:
//   - "IncomingCall" { chatId, fromUserId, sdp }
//   - "CallSignal"   { chatId, fromUserId, type, data }
//   - "CallEnded"    { chatId, fromUserId }
//
import { useCallback, useEffect, useRef, useState } from "react";
import { notifyIncomingCall } from "../utils/chatNotifications";

const ICE_SERVERS = (() => {
  const servers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  const turnUrl = (import.meta?.env?.VITE_TURN_URL || "").trim();
  const turnUsername = import.meta?.env?.VITE_TURN_USERNAME || import.meta?.env?.VITE_TURN_USER || "";
  const turnCredential = import.meta?.env?.VITE_TURN_CREDENTIAL || import.meta?.env?.VITE_TURN_PASS || "";
  if (turnUrl) {
    servers.push({
      urls: turnUrl.includes(",") ? turnUrl.split(",").map((url) => url.trim()).filter(Boolean) : turnUrl,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return servers;
})();

function mediaSupportError() {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const localHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
    if (!window.isSecureContext && !localHost) {
      return "Audio/video calls need HTTPS when the app is opened from a public IP or domain. Open the site with HTTPS, then retry the call.";
    }
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return "This browser is blocking camera or microphone access for this page.";
  }

  return "";
}

function readableMediaError(err, type) {
  const name = err?.name || "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Please allow microphone/camera permission in the browser, then try the call again.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return type === "video"
      ? "No camera or microphone was found on this device."
      : "No microphone was found on this device.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "The camera or microphone is already in use by another app.";
  }
  return err?.message || "Call failed. Please try again.";
}

export default function useChatCall({ connection, chat, meId, enabled = true }) {
  const [callState, setCallState] = useState({ status: "idle" });
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const callTypeRef = useRef("audio");
  const activeChatIdRef = useRef(null);
  const pendingIceRef = useRef([]);
  const noAnswerTimerRef = useRef(null);

  const clearNoAnswerTimer = useCallback(() => {
    if (noAnswerTimerRef.current) {
      window.clearTimeout(noAnswerTimerRef.current);
      noAnswerTimerRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    clearNoAnswerTimer();
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;

    if (localStreamRef.current) {
      try { localStreamRef.current.getTracks().forEach((track) => track.stop()); } catch {}
      localStreamRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    setAudioMuted(false);
    setVideoOff(false);
    activeChatIdRef.current = null;
    pendingIceRef.current = [];
  }, [clearNoAnswerTimer]);

  const failCall = useCallback((message, chatId) => {
    cleanup();
    setCallState({
      status: "error",
      error: message || "Call failed. Please try again.",
      chatId: chatId || activeChatIdRef.current || chat?.id,
      type: callTypeRef.current,
    });
  }, [chat?.id, cleanup]);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 4,
    });

    pc.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      setRemoteStream(stream);
      setCallState((current) => ({ ...current, status: "active" }));
    };

    pc.onicecandidate = (event) => {
      const chatId = activeChatIdRef.current || chat?.id;
      if (!event.candidate || !connection || !chatId) return;

      try {
        connection.invoke("CallSignal", {
          chatId,
          type: "ice",
          data: JSON.stringify(event.candidate),
        }).catch(() => {});
      } catch {}
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") {
        clearNoAnswerTimer();
        setCallState((current) => ({ ...current, status: "active" }));
      }
      if (state === "failed") {
        failCall("Could not connect the call. Add a TURN server for reliable calls across different networks.");
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (state === "connected" || state === "completed") {
        clearNoAnswerTimer();
        setCallState((current) => ({ ...current, status: "active" }));
      }
      if (state === "failed") {
        failCall("The call could not cross the network firewall/NAT. Configure TURN and try again.");
      }
    };

    pc.onicecandidateerror = (event) => {
      console.warn("[useChatCall] ICE candidate error", event);
    };

    return pc;
  }, [chat?.id, clearNoAnswerTimer, connection, failCall]);

  const getMedia = useCallback(async (type) => {
    const supportError = mediaSupportError();
    if (supportError) throw new Error(supportError);

    const constraints = {
      audio: true,
      video: type === "video" ? { width: 640, height: 480, facingMode: "user" } : false,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      throw new Error(readableMediaError(err, type));
    }
  }, []);

  const startCall = useCallback(async (type = "audio") => {
    if (!enabled) return;
    if (!connection || !chat?.id) return;
    if (pcRef.current) return;

    callTypeRef.current = type;
    activeChatIdRef.current = chat.id;

    try {
      setCallState({ status: "calling", type, direction: "out", chatId: chat.id });
      const stream = await getMedia(type);
      const pc = createPeerConnection();
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === "video",
      });
      await pc.setLocalDescription(offer);

      await connection.invoke("StartCall", {
        chatId: chat.id,
        sdp: JSON.stringify(offer),
        type,
      });

      clearNoAnswerTimer();
      noAnswerTimerRef.current = window.setTimeout(() => {
        if (pcRef.current && activeChatIdRef.current) {
          try { connection.invoke("EndCall", activeChatIdRef.current).catch(() => {}); } catch {}
          failCall("No answer. Please try again later.", chat.id);
        }
      }, 45000);
    } catch (err) {
      console.error("[useChatCall] startCall failed", err);
      failCall(err?.message || "Call failed", chat.id);
    }
  }, [chat?.id, clearNoAnswerTimer, connection, createPeerConnection, enabled, failCall, getMedia]);

  const restoreIncomingCall = useCallback((payload) => {
    if (!enabled || !payload?.chatId || !payload?.sdp) return false;
    if (String(payload.fromUserId) === String(meId)) return false;
    if (pcRef.current) return false;

    const type = payload.type || payload.callType || (() => {
      try {
        const offer = JSON.parse(payload.sdp);
        return typeof offer.sdp === "string" && /m=video/.test(offer.sdp) ? "video" : "audio";
      } catch {
        return "audio";
      }
    })();

    activeChatIdRef.current = payload.chatId;
    callTypeRef.current = type;
    setCallState({
      status: "ringing",
      offer: payload.sdp,
      chatId: payload.chatId,
      fromUserId: payload.fromUserId,
      type,
      direction: "in",
    });
    return true;
  }, [enabled, meId]);

  const accept = useCallback(async () => {
    if (callState.status !== "ringing") return;

    const offerSdp = callState.offer;
    const type = callState.type || "audio";
    const chatId = callState.chatId || activeChatIdRef.current || chat?.id;
    if (!chatId || !connection) return;

    callTypeRef.current = type;
    activeChatIdRef.current = chatId;

    try {
      setCallState({ status: "connecting", type, direction: "in", chatId });
      const stream = await getMedia(type);
      const pc = createPeerConnection();
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(offerSdp)));
      for (const candidate of pendingIceRef.current) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      }
      pendingIceRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await connection.invoke("CallSignal", {
        chatId,
        type: "answer",
        data: JSON.stringify(answer),
      });
    } catch (err) {
      console.error("[useChatCall] accept failed", err);
      failCall(err?.message || "Failed to answer the call.", chatId);
    }
  }, [callState, chat?.id, connection, createPeerConnection, failCall, getMedia]);

  const reject = useCallback(() => {
    const chatId = callState.chatId || activeChatIdRef.current || chat?.id;
    try { if (chatId) connection?.invoke("EndCall", chatId).catch(() => {}); } catch {}
    cleanup();
    setCallState({ status: "ended" });
  }, [callState.chatId, chat?.id, cleanup, connection]);

  const endCall = useCallback(() => {
    const chatId = callState.chatId || activeChatIdRef.current || chat?.id;
    try { if (chatId) connection?.invoke("EndCall", chatId).catch(() => {}); } catch {}
    cleanup();
    setCallState({ status: "ended" });
  }, [callState.chatId, chat?.id, cleanup, connection]);

  useEffect(() => {
    if (!enabled || !connection) return;

    const onIncoming = (payload) => {
      if (!payload?.chatId) return;
      if (String(payload.fromUserId) === String(meId)) return;
      if (pcRef.current) return;

      const restored = restoreIncomingCall(payload);
      const type = payload.type || payload.callType || "audio";
      if (!restored) return;

      notifyIncomingCall({
        chatId: payload.chatId,
        callerName: "Jai Masih Di",
        type,
      });
    };

    const onSignal = async (payload) => {
      const activeChatId = activeChatIdRef.current || callState.chatId || chat?.id;
      if (!payload || String(payload.chatId) !== String(activeChatId)) return;
      if (String(payload.fromUserId) === String(meId)) return;

      const pc = pcRef.current;
      const signalType = payload.type;

      if (signalType === "answer") {
        if (!pc) return;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(payload.data)));
          for (const candidate of pendingIceRef.current) {
            try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
          }
          pendingIceRef.current = [];
          clearNoAnswerTimer();
          setCallState((current) => ({ ...current, status: "active" }));
        } catch (err) {
          console.warn("[useChatCall] setRemoteDescription(answer) failed", err);
          failCall("Could not complete the call handshake. Please try again.");
        }
      }

      if (signalType === "ice") {
        let candidate;
        try { candidate = JSON.parse(payload.data); } catch { return; }
        if (!candidate) return;

        if (pc && pc.remoteDescription) {
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
          catch (err) { console.warn("[useChatCall] addIceCandidate failed", err); }
        } else {
          pendingIceRef.current.push(candidate);
        }
      }
    };

    const onEnded = (payload) => {
      const activeChatId = activeChatIdRef.current || callState.chatId || chat?.id;
      if (!payload || String(payload.chatId) !== String(activeChatId)) return;
      cleanup();
      setCallState({ status: "ended" });
    };

    connection.on("IncomingCall", onIncoming);
    connection.on("CallSignal", onSignal);
    connection.on("CallEnded", onEnded);

    return () => {
      try { connection.off?.("IncomingCall", onIncoming); } catch {}
      try { connection.off?.("CallSignal", onSignal); } catch {}
      try { connection.off?.("CallEnded", onEnded); } catch {}
    };
  }, [callState.chatId, chat?.id, clearNoAnswerTimer, cleanup, connection, enabled, failCall, meId, restoreIncomingCall]);

  useEffect(() => () => cleanup(), [cleanup]);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const enabled = audioMuted;
    stream.getAudioTracks().forEach((track) => { track.enabled = enabled; });
    setAudioMuted(!enabled);
  }, [audioMuted]);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const enabled = videoOff;
    stream.getVideoTracks().forEach((track) => { track.enabled = enabled; });
    setVideoOff(!enabled);
  }, [videoOff]);

  return {
    callState,
    localStream,
    remoteStream,
    audioMuted,
    videoOff,
    startCall,
    accept,
    reject,
    endCall,
    toggleMic,
    toggleCamera,
    restoreIncomingCall,
  };
}

