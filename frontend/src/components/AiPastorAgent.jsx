import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Languages,
  Loader2,
  Mic,
  MicOff,
  PauseCircle,
  Send,
  Volume2,
  X,
} from "lucide-react";
import { apiFetch } from "../utils/fetch-auth-shim";
import { optionalImportModule, speakText } from "../utils/speech";
import PastorCharacter from "./PastorCharacter";

const modes = {
  en: {
    language: "en",
    persona: "english-evangelist",
    title: "English Pastor",
    greeting: "Jai Masih. You can speak or type. I am listening.",
    placeholder: "Speak or write your prayer request...",
    transcriptLang: "en-IN",
    speechLang: "en-IN",
  },
  hi: {
    language: "hi",
    persona: "hindi-pastoral-guide",
    title: "Hindi Pastor",
    greeting: "Jai Masih. You can speak in Hindi or type your request.",
    placeholder: "Speak in Hindi or write your prayer request...",
    transcriptLang: "hi-IN",
    speechLang: "hi-IN",
  },
};

function pickVoice(voices, mode) {
  const prefix = mode === "hi" ? "hi" : "en";
  const matching = voices.filter((voice) => voice.lang?.toLowerCase().startsWith(prefix));
  if (!matching.length) return null;
  return (
    matching.find((voice) =>
      mode === "hi"
        ? /hindi|india|hi-in/i.test(`${voice.name} ${voice.lang}`)
        : /english|india|en-in|en-us|en-gb/i.test(`${voice.name} ${voice.lang}`)
    ) || matching[0]
  );
}

async function nativeSpeechToText(lang) {
  const [{ Capacitor }, { SpeechRecognition }] = await Promise.all([
    optionalImportModule("@capacitor/core"),
    optionalImportModule("@capacitor-community/speech-recognition"),
  ]);

  if (!Capacitor.isNativePlatform()) return "";

  const available = await SpeechRecognition.available();
  if (available && available.available === false) {
    throw new Error("Speech recognition is not available on this device.");
  }

  await SpeechRecognition.requestPermissions();
  const result = await SpeechRecognition.start({
    language: lang,
    maxResults: 1,
    partialResults: false,
    popup: false,
  });

  return result?.matches?.[0] || "";
}

export default function AiPastorAgent({ hidden = false, showLauncher = true }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("en");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [sendToJaiMasih, setSendToJaiMasih] = useState(false);
  const [voices, setVoices] = useState([]);
  const recognitionRef = useRef(null);

  const active = modes[mode];
  const selectedVoice = useMemo(() => pickVoice(voices, mode), [voices, mode]);
  const nativeSpeechSupported =
    typeof window !== "undefined" && Boolean(window.Capacitor?.isNativePlatform?.());
  const speechRecognitionSupported =
    typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  const speechInputSupported = nativeSpeechSupported || speechRecognitionSupported;

  useEffect(() => {
    const loadVoices = () => {
      if (!("speechSynthesis" in window)) return;
      setVoices(window.speechSynthesis.getVoices());
    };

    loadVoices();
    if ("speechSynthesis" in window) window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      stopListening();
      stopSpeaking();
      if ("speechSynthesis" in window) window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    const openAgent = () => setOpen(true);
    window.addEventListener("ai-pastor:open", openAgent);
    return () => window.removeEventListener("ai-pastor:open", openAgent);
  }, []);

  function stopSpeaking() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  function speak(text) {
    if (!voiceEnabled || !text) return;

    stopSpeaking();
    const started = speakText(text, {
      lang: active.speechLang,
      rate: mode === "hi" ? 0.92 : 0.88,
      pitch: mode === "hi" ? 0.98 : 0.86,
      voice: selectedVoice,
      maxLength: 180,
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });

    if (!started) setSpeaking(false);
  }

  function stopListening() {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onresult = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  }

  function startListening() {
    if (loading) return;

    stopSpeaking();
    stopListening();
    setListening(true);

    nativeSpeechToText(active.transcriptLang)
      .then((spoken) => {
        if (!spoken) return false;
        setInput(spoken);
        ask(spoken);
        return true;
      })
      .catch(() => false)
      .then((handledByNative) => {
        if (handledByNative) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          setListening(false);
          return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = active.transcriptLang;
        recognition.continuous = false;
        recognition.interimResults = true;

        let finalText = "";
        recognition.onresult = (event) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const transcript = event.results[i][0]?.transcript || "";
            if (event.results[i].isFinal) finalText += transcript;
            else interim += transcript;
          }

          const text = `${finalText} ${interim}`.trim();
          if (text) setInput(text);
        };

        recognition.onerror = () => setListening(false);
        recognition.onend = () => {
          setListening(false);
          const spoken = finalText.trim();
          if (spoken) ask(spoken);
        };

        recognitionRef.current = recognition;
        recognition.start();
      });

    return;
  }

  async function ask(value = input) {
    const question = value.trim();
    if (!question || loading) return;

    stopListening();
    stopSpeaking();
    setOpen(true);
    setLoading(true);
    setInput("");

    const userMessage = { role: "user", text: question };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);

    try {
      const data = await apiFetch("/pastorbot/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          sendToJaiMasih,
          language: active.language,
          persona: active.persona,
          conversation: messages.slice(-12).map((item) => ({
            role: item.role,
            text: item.text,
          })),
        }),
      });

      const reply = data?.answer || "I am here with you. Please try again.";
      setMessages([...nextMessages, { role: "pastor", text: reply }]);
      speak(reply);
    } catch (err) {
      setMessages([
        ...nextMessages,
        {
          role: "pastor",
          text: err?.message || "I could not answer right now. Please try again.",
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function changeMode(nextMode) {
    stopListening();
    stopSpeaking();
    setMode(nextMode);
    setInput("");
  }

  if (hidden) return null;

  const status = listening ? "Listening" : loading ? "Praying" : speaking ? "Speaking" : "Ready";

  return (
    <>
      {showLauncher && (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 z-[80] grid h-16 w-16 place-items-center rounded-full bg-emerald-700 text-white shadow-2xl ring-4 ring-white hover:bg-emerald-800"
        aria-label="Open AI Counseller"
      >
        <PastorCharacter className="h-full w-full" />
      </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[90] flex items-end overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm md:items-center md:justify-center">
          <div className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="shrink-0 flex items-center justify-between gap-3 bg-slate-950 px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className={`ai-pastor-face ${loading || speaking || listening ? "ai-pastor-live" : ""}`}>
                  <PastorCharacter className="h-full w-full" />
                </div>
                <div>
                  <div className="text-lg font-black">AI Counseller</div>
                  <div className="text-xs font-bold text-emerald-100">{status} - {active.title}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"
                aria-label="Close AI Counseller"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 overflow-hidden bg-[#f8f4ea] md:grid-cols-[260px_1fr]">
              <aside className="max-h-[28dvh] overflow-y-auto border-b border-amber-100 p-4 md:max-h-none md:border-b-0 md:border-r">
                <div className="grid place-items-center rounded-3xl bg-slate-950 py-7 text-white">
                  <div className={`ai-pastor-avatar ${loading || speaking || listening ? "ai-pastor-live" : ""}`}>
                    <div className="ai-pastor-ring" />
                    <div className="ai-pastor-core">
                      <PastorCharacter className="h-full w-full" />
                    </div>
                  </div>
                  <div className="mt-4 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase">
                    {status}
                  </div>
                </div>

                <div className="mt-4 grid gap-2">
                  {Object.entries(modes).map(([key, item]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => changeMode(key)}
                      className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-left text-sm font-black ${
                        mode === key ? "bg-emerald-700 text-white" : "bg-white text-slate-800"
                      }`}
                    >
                      <Languages className="h-4 w-4" />
                      {item.title}
                    </button>
                  ))}
                </div>

                <label className="mt-3 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-800">
                  <input
                    type="checkbox"
                    checked={voiceEnabled}
                    onChange={(event) => setVoiceEnabled(event.target.checked)}
                    className="h-5 w-5 accent-emerald-700"
                  />
                  Voice reply
                </label>

                <label className="mt-2 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-800">
                  <input
                    type="checkbox"
                    checked={sendToJaiMasih}
                    onChange={(event) => setSendToJaiMasih(event.target.checked)}
                    className="h-5 w-5 accent-emerald-700"
                  />
                  Share to Jai Masih
                </label>
              </aside>

              <main className="flex min-h-0 flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  <div className="mb-3 max-w-[86%] rounded-3xl rounded-tl-md bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-700 shadow-sm">
                    {active.greeting}
                  </div>

                  {messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`mb-3 flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[86%] whitespace-pre-line rounded-3xl px-4 py-3 text-sm font-semibold leading-6 shadow-sm ${
                          message.role === "user"
                            ? "rounded-tr-md bg-emerald-700 text-white"
                            : message.error
                              ? "rounded-tl-md bg-red-50 text-red-800"
                              : "rounded-tl-md bg-white text-slate-800"
                        }`}
                      >
                        {message.text}
                        {message.role === "pastor" && (
                          <button
                            type="button"
                            onClick={() => speak(message.text)}
                            className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-950"
                          >
                            <Volume2 className="h-3.5 w-3.5" />
                            Read
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="mb-3 max-w-[82%] rounded-3xl rounded-tl-md bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm">
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                      Thinking prayerfully...
                    </div>
                  )}
                </div>

                <div className="shrink-0 border-t border-amber-100 bg-white p-4">
                  {!speechInputSupported && (
                    <div className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
                      Voice input is not supported in this browser. Typing still works.
                    </div>
                  )}
                  <div className="grid gap-3 md:grid-cols-[auto_1fr_auto_auto]">
                    <button
                      type="button"
                      onClick={listening ? stopListening : startListening}
                      disabled={!speechInputSupported || loading}
                      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-black text-white disabled:opacity-50 ${
                        listening ? "bg-red-600" : "bg-slate-950"
                      }`}
                    >
                      {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                      {listening ? "Stop" : "Speak"}
                    </button>

                    <textarea
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      rows={2}
                      placeholder={active.placeholder}
                      className="w-full resize-none rounded-2xl border border-amber-200 px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-600"
                    />

                    <button
                      type="button"
                      onClick={() => ask()}
                      disabled={loading || !input.trim()}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 font-black text-white hover:bg-emerald-800 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                      Send
                    </button>

                    <button
                      type="button"
                      onClick={speaking ? stopSpeaking : () => speak(messages.filter((m) => m.role === "pastor").at(-1)?.text)}
                      disabled={!speaking && !messages.some((m) => m.role === "pastor")}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 font-black text-amber-950 disabled:opacity-50"
                    >
                      {speaking ? <PauseCircle className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </main>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .ai-pastor-face {
          display: grid;
          height: 48px;
          width: 48px;
          place-items: center;
          border-radius: 999px;
          background: #ecfdf5;
          color: #065f46;
        }

        .ai-pastor-avatar {
          position: relative;
          display: grid;
          height: 128px;
          width: 128px;
          place-items: center;
        }

        .ai-pastor-ring {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          background: conic-gradient(from 180deg, #facc15, #10b981, #38bdf8, #facc15);
          animation: ai-pastor-spin 6s linear infinite;
        }

        .ai-pastor-core {
          position: relative;
          display: grid;
          height: 100px;
          width: 100px;
          place-items: center;
          border-radius: 999px;
          background: #ecfdf5;
          color: #065f46;
          box-shadow: inset 0 0 0 8px rgba(255,255,255,0.8), 0 18px 40px rgba(0,0,0,0.28);
        }

        .ai-pastor-live .ai-pastor-core,
        .ai-pastor-face.ai-pastor-live {
          animation: ai-pastor-breathe 1s ease-in-out infinite;
        }

        @media (max-height: 760px) {
          .ai-pastor-avatar {
            height: 96px;
            width: 96px;
          }

          .ai-pastor-core {
            height: 76px;
            width: 76px;
          }
        }

        @keyframes ai-pastor-spin {
          to { transform: rotate(360deg); }
        }

        @keyframes ai-pastor-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </>
  );
}
