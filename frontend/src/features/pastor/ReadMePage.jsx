import React, { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Camera,
  Eye,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Video,
  Volume2,
} from "lucide-react";
import { apiFetch } from "../../utils/fetch-auth-shim";
import { speakText } from "../../utils/speech";
import PastorCharacter from "../../components/PastorCharacter";

const modes = {
  en: {
    label: "English",
    lang: "en-IN",
    placeholder: "Tell the AI Pastor what you want help with...",
    intro: "Share a camera frame and a short note. ReadMe will give biblical counsel without identifying, judging, or diagnosing you.",
  },
  hi: {
    label: "Hindi",
    lang: "hi-IN",
    placeholder: "AI Pastor ko batayein ki aap kis baat par salah chahte hain...",
    intro: "Camera frame aur chhota note share karein. ReadMe bina pehchan ya diagnosis ke biblical salah dega.",
  },
  pa: {
    label: "Punjabi",
    lang: "pa-IN",
    placeholder: "AI Pastor nu daso tusi kis gal te salah chaunde ho...",
    intro: "Camera frame ate chhota note share karo. ReadMe bina pehchan ya diagnosis de biblical salah devega.",
  },
};

function getCameraErrorMessage(err) {
  const name = err?.name || "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera permission was denied. Please allow camera access for Mahima App and try again.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No camera was found on this device.";
  }
  if (name === "NotReadableError") {
    return "Camera is busy in another app. Close that app and try again.";
  }
  return err?.message || "Unable to start camera.";
}

function stopStream(stream) {
  stream?.getTracks?.().forEach((track) => track.stop());
}

function captureVideoFrame(video) {
  const width = video.videoWidth || 720;
  const height = video.videoHeight || 720;
  const maxSide = 900;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export default function ReadMePage() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [mode, setMode] = useState("en");
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState("");
  const [note, setNote] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState("");
  const [source, setSource] = useState("");

  useEffect(() => {
    return () => {
      stopStream(streamRef.current);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  async function startCamera() {
    setError("");
    setCapturedImage("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera is not supported in this browser or app webview.");
      return;
    }

    try {
      stopStream(streamRef.current);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch (err) {
      setCameraReady(false);
      setError(getCameraErrorMessage(err));
    }
  }

  function captureFrame() {
    setError("");
    if (!videoRef.current || !cameraReady) {
      setError("Start the camera before capturing.");
      return;
    }

    setCapturedImage(captureVideoFrame(videoRef.current));
    stopStream(streamRef.current);
    streamRef.current = null;
    setCameraReady(false);
  }

  function retake() {
    setCapturedImage("");
    setAnswer("");
    setSource("");
    startCamera();
  }

  async function analyze() {
    if (!capturedImage) {
      setError("Capture a camera frame first.");
      return;
    }
    if (!consentAccepted) {
      setError("Please accept consent before using ReadMe.");
      return;
    }

    setLoading(true);
    setError("");
    setAnswer("");
    setSource("");

    try {
      const data = await apiFetch("/pastorbot/readme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        timeoutMs: 60000,
        body: JSON.stringify({
          imageDataUrl: capturedImage,
          note,
          consentAccepted,
          language: mode,
          persona: mode === "en" ? "english-teaching-guide" : undefined,
        }),
      });

      const nextAnswer = data?.answer || "";
      setAnswer(nextAnswer);
      setSource(data?.source || "");
      if (nextAnswer) speak(nextAnswer);
    } catch (err) {
      setError(err?.body || err?.message || "ReadMe analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  function speak(text = answer) {
    if (!text) return;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    const started = speakText(text, {
      lang: modes[mode].lang,
      rate: mode === "en" ? 0.88 : 0.92,
      pitch: 0.96,
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });

    if (!started) setError("Voice playback is not available on this device.");
  }

  const current = modes[mode];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-2xl">
          <div className="grid gap-0 lg:grid-cols-[0.95fr_1.25fr]">
            <div className="relative min-h-[360px] overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-950 to-amber-950 p-6 sm:p-8">
              <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,rgba(250,204,21,.25),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,.22),transparent_30%)]" />
              <div className="relative z-10 flex h-full flex-col justify-between gap-8">
                <div className="flex items-center gap-4">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                    <Eye className="h-8 w-8 text-amber-200" />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.35em] text-amber-200">AI Pastor</p>
                    <h1 className="text-4xl font-black tracking-tight sm:text-5xl">ReadMe</h1>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-[170px_1fr] sm:items-center">
                  <div className="relative mx-auto h-40 w-40 rounded-[2rem] bg-white/10 p-4 ring-1 ring-white/15">
                    <PastorCharacter className="h-full w-full" />
                    <span className="absolute -bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-black text-white shadow-lg">
                      <Sparkles className="h-3.5 w-3.5" />
                      Ready
                    </span>
                  </div>
                  <div className="space-y-4">
                    <p className="max-w-xl text-lg leading-8 text-slate-100">{current.intro}</p>
                    <div className="grid gap-3 text-sm text-slate-200">
                      <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                        <span>Consent required. ReadMe uses one captured frame plus your note for pastoral guidance.</span>
                      </div>
                      <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                        <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" />
                        <span>It will not identify, judge, diagnose, or replace a real pastor in crisis situations.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 text-slate-950 sm:p-7">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex rounded-2xl bg-slate-100 p-1">
                  {Object.entries(modes).map(([key, value]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMode(key)}
                      className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                        mode === key ? "bg-emerald-600 text-white shadow" : "text-slate-600 hover:bg-white"
                      }`}
                    >
                      {value.label}
                    </button>
                  ))}
                </div>
                {source && (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-700">
                    {source === "ai" ? "AI Vision" : "Fallback"}
                  </span>
                )}
              </div>

              <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
                <section className="space-y-4">
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950">
                    <div className="aspect-video w-full">
                      {capturedImage ? (
                        <img src={capturedImage} alt="Captured ReadMe frame" className="h-full w-full object-cover" />
                      ) : (
                        <video
                          ref={videoRef}
                          className="h-full w-full object-cover"
                          playsInline
                          muted
                          autoPlay
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-black text-slate-800 shadow-sm hover:bg-slate-50"
                    >
                      <Video className="h-5 w-5" />
                      Start
                    </button>
                    <button
                      type="button"
                      onClick={captureFrame}
                      disabled={!cameraReady}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 font-black text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <Camera className="h-5 w-5" />
                      Capture
                    </button>
                    <button
                      type="button"
                      onClick={retake}
                      disabled={!capturedImage}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-black text-slate-800 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                    >
                      <RefreshCw className="h-5 w-5" />
                      Retake
                    </button>
                  </div>
                </section>

                <section className="space-y-4">
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder={current.placeholder}
                    rows={7}
                    className="w-full resize-none rounded-3xl border border-slate-200 bg-slate-50 p-4 text-base font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />

                  <label className="flex cursor-pointer items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-950">
                    <input
                      type="checkbox"
                      checked={consentAccepted}
                      onChange={(event) => setConsentAccepted(event.target.checked)}
                      className="mt-1 h-4 w-4 accent-emerald-600"
                    />
                    <span>I consent to share this captured frame and note with the AI Pastor for biblical counselling.</span>
                  </label>

                  <button
                    type="button"
                    onClick={analyze}
                    disabled={loading || !capturedImage || !consentAccepted}
                    className="inline-flex w-full items-center justify-center gap-3 rounded-3xl bg-emerald-600 px-5 py-4 text-lg font-black text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    Ask ReadMe Pastor
                  </button>

                  {answer && (
                    <button
                      type="button"
                      onClick={() => speak(answer)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-black text-emerald-800"
                    >
                      <Volume2 className="h-5 w-5" />
                      {speaking ? "Speaking..." : "Read Aloud"}
                    </button>
                  )}
                </section>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-base font-bold text-rose-700">
            {error}
          </div>
        )}

        {answer && (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-950">Pastoral Guidance</h2>
                <p className="text-sm font-semibold text-slate-500">Generated from your consented ReadMe session.</p>
              </div>
            </div>
            <div className="whitespace-pre-wrap rounded-3xl bg-slate-50 p-5 text-base font-medium leading-8 text-slate-800">
              {answer}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
