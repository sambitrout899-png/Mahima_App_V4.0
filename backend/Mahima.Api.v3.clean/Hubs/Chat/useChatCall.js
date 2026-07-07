// src/hooks/useChatCall.js
//
// WebRTC audio/video call over the existing ChatHub.
//
// FIXES vs previous version:
//   - Incoming calls ring REGARDLESS of which chat is open (or none).
//     Previously the listener filtered by chat?.id, so calls were silently
//     dropped unless the user was already viewing the right conversation.
//   - The hook is no longer bound to a single `chat`. Outgoing call takes a
//     chatId; the incoming call carries its own chatId. The overlay can
//     focus the right chat via onIncomingCall().
//   - TURN server support via env vars:
//         VITE_TURN_URL, VITE_TURN_USER, VITE_TURN_PASS
//     (Comma-separated VITE_TURN_URL supported for multiple URLs.)
//   - Cleaner cleanup; ICE buffer drained correctly on accept and answer.
//
// Hub methods used (in ChatHub.cs):
//   - StartCall({ chatId, sdp })        client -> server: send SDP offer
//   - CallSignal({ chatId, type, data}) client -> server: ICE / answer
//   - EndCall(chatId)                   client -> server: hang up
//
// Hub events listened to:
//   - "IncomingCall" { chatId, fromUserId, sdp }
//   - "CallSignal"   { chatId, fromUserId, type, data }
//   - "CallEnded"    { chatId, fromUserId }
//
// callState.status: "idle" | "calling" | "ringing" | "connecting" | "active" | "ended"
// callState.chatId: the chat the call belongs to (independent of UI selection)
// callState.fromUserId, .type ("audio"|"video"), .direction ("in"|"out")
//
import { useCallback, useEffect, useRef, useState } from "react";

/* ---------- ICE servers ----------------------------------------------- */

function buildIceServers() {
  const servers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ];

  try {
    const env = (import.meta && import.meta.env) || {};
    const turnUrl = (env.VITE_TURN_URL || "").trim();
    const turnUser = (env.VITE_TURN_USER || "").trim();
    const turnPass = (env.VITE_TURN_PASS || "").trim();
    if (turnUrl && turnUser && turnPass) {
      // VITE_TURN_URL can be a single URL or a comma-separated list
      const urls = turnUrl.split(",").map((s) => s.trim()).filter(Boolean);
      servers.push({ urls, username: turnUser, credential: turnPass });
    }
  } catch { /* ignore */ }

  return servers;
}

/* ---------- hook ------------------------------------------------------- */

export default function useChatCall({
  connection,
  meId,
  onIncomingCall,   // optional: ({ chatId, fromUserId, type }) => void
}) {
  const [callState, setCallState] = useState({ status: "idle" });
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const callChatIdRef = useRef(null);     // chatId for the active call
  const callTypeRef = useRef("audio");
  const pendingIceRef = useRef([]);        // ICE before remote desc set
  const ringingOfferRef = useRef(null);    // saved SDP offer while ringing

  /* ---------- helpers -------------------------------------------------- */

  const cleanup = useCallback(() => {
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;
    if (localStreamRef.current) {
      try { localStreamRef.current.getTracks().forEach((t) => t.stop()); } catch {}
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setAudioMuted(false);
    setVideoOff(false);
    pendingIceRef.current = [];
    ringingOfferRef.current = null;
    callChatIdRef.current = null;
  }, []);

  const createPeerConnection = useCallback((chatId) => {
    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });

    pc.ontrack = (e) => {
      const stream = e.streams[0] || new MediaStream([e.track]);
      setRemoteStream(stream);
    };

    pc.onicecandidate = (e) => {
      if (!e.candidate || !connection || !chatId) return;
      try {
        connection.invoke("CallSignal", {
          chatId,
          type: "ice",
          data: JSON.stringify(e.candidate),
        }).catch(() => {});
      } catch { /* ignore */ }
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") {
        setCallState((cs) => ({ ...cs, status: "active" }));
      } else if (s === "failed" || s === "disconnected" || s === "closed") {
        setCallState((cs) => ({ ...cs, status: "ended" }));
      }
    };

    return pc;
  }, [connection]);

  const getMedia = useCallback(async (type) => {
    const constraints = {
      audio: true,
      video: type === "video" ? { width: 640, height: 480, facingMode: "user" } : false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  /* ---------- outgoing call ------------------------------------------- */

  const startCall = useCallback(async (chatId, type = "audio") => {
    if (!connection || !chatId) return;
    if (pcRef.current) return;
    callTypeRef.current = type;
    callChatIdRef.current = String(chatId);

    try {
      setCallState({ status: "calling", chatId: String(chatId), type, direction: "out" });
      const stream = await getMedia(type);
      const pc = createPeerConnection(String(chatId));
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === "video",
      });
      await pc.setLocalDescription(offer);

      await connection.invoke("StartCall", {
        chatId: String(chatId),
        sdp: JSON.stringify(offer),
      });
    } catch (err) {
      console.error("[useChatCall] startCall failed", err);
      cleanup();
      setCallState({ status: "ended", error: err?.message || "Call failed" });
    }
  }, [connection, createPeerConnection, getMedia, cleanup]);

  /* ---------- accept / reject incoming -------------------------------- */

  const accept = useCallback(async () => {
    if (callState.status !== "ringing") return;
    const offerSdp = ringingOfferRef.current;
    const chatId = callState.chatId;
    const type = callState.type || "audio";
    if (!offerSdp || !chatId) return;
    callTypeRef.current = type;
    callChatIdRef.current = String(chatId);

    try {
      setCallState({ ...callState, status: "connecting" });
      const stream = await getMedia(type);
      const pc = createPeerConnection(String(chatId));
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(offerSdp)));

      // Drain any ICE candidates that arrived before the offer was applied.
      const buffered = pendingIceRef.current;
      pendingIceRef.current = [];
      for (const c of buffered) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await connection.invoke("CallSignal", {
        chatId: String(chatId),
        type: "answer",
        data: JSON.stringify(answer),
      });
    } catch (err) {
      console.error("[useChatCall] accept failed", err);
      cleanup();
      setCallState({ status: "ended", error: err?.message || "Failed to answer" });
    }
  }, [callState, connection, createPeerConnection, getMedia, cleanup]);

  const reject = useCallback(() => {
    const cid = callState.chatId || callChatIdRef.current;
    try { if (cid) connection?.invoke("EndCall", String(cid)).catch(() => {}); } catch {}
    cleanup();
    setCallState({ status: "ended" });
  }, [connection, callState.chatId, cleanup]);

  /* ---------- hang up ------------------------------------------------- */

  const endCall = useCallback(() => {
    const cid = callChatIdRef.current || callState.chatId;
    try { if (cid) connection?.invoke("EndCall", String(cid)).catch(() => {}); } catch {}
    cleanup();
    setCallState({ status: "ended" });
  }, [connection, callState.chatId, cleanup]);

  /* ---------- hub events --------------------------------------------- */

  useEffect(() => {
    if (!connection) return;

    const onIncoming = (payload) => {
      if (!payload || !payload.chatId) return;
      // Don't ring myself.
      if (String(payload.fromUserId) === String(meId)) return;
      // Already in a call? Reject silently.
      if (pcRef.current) {
        try {
          connection.invoke("EndCall", String(payload.chatId)).catch(() => {});
        } catch {}
        return;
      }

      // Detect audio vs video by inspecting the SDP for "m=video".
      let type = "audio";
      try {
        const offer = JSON.parse(payload.sdp);
        if (typeof offer.sdp === "string" && /m=video/.test(offer.sdp)) type = "video";
      } catch { /* ignore */ }

      ringingOfferRef.current = payload.sdp;
      callChatIdRef.current = String(payload.chatId);

      setCallState({
        status: "ringing",
        chatId: String(payload.chatId),
        fromUserId: payload.fromUserId,
        type,
        direction: "in",
      });

      // Notify parent (so it can switch chat, show banner, etc.)
      try {
        onIncomingCall && onIncomingCall({
          chatId: String(payload.chatId),
          fromUserId: payload.fromUserId,
          type,
        });
      } catch { /* ignore */ }
    };

    const onSignal = async (payload) => {
      if (!payload) return;
      const myCallChat = callChatIdRef.current;
      if (!myCallChat) return;
      if (String(payload.chatId) !== String(myCallChat)) return;
      if (String(payload.fromUserId) === String(meId)) return; // echo

      const pc = pcRef.current;
      const t = payload.type;

      if (t === "answer") {
        if (!pc) return;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(payload.data)));
          const buffered = pendingIceRef.current;
          pendingIceRef.current = [];
          for (const c of buffered) {
            try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
          }
          setCallState((cs) => ({ ...cs, status: "active" }));
        } catch (err) {
          console.warn("[useChatCall] setRemoteDescription(answer) failed", err);
        }
      } else if (t === "ice") {
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
      if (!payload) return;
      const myCallChat = callChatIdRef.current;
      if (!myCallChat) return;
      if (String(payload.chatId) !== String(myCallChat)) return;
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
  }, [connection, meId, cleanup, onIncomingCall]);

  /* ---------- cleanup on unmount ------------------------------------- */
  useEffect(() => () => cleanup(), [cleanup]);

  /* ---------- mute / camera toggles ---------------------------------- */

  const toggleMic = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) return;
    s.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setAudioMuted((m) => !m);
  }, []);

  const toggleCamera = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) return;
    s.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setVideoOff((v) => !v);
  }, []);

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
  };
}