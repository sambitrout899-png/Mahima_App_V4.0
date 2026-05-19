export async function optionalImportModule(specifier) {
  const importer = new Function("specifier", "return import(specifier)");
  return importer(specifier);
}

export function cleanSpeechText(text = "") {
  return String(text)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[*_#>`~|]/g, " ")
    .replace(/\bhttps?:\/\/\S+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitSpeechText(text = "", maxLength = 220) {
  const clean = cleanSpeechText(text);
  if (!clean) return [];

  const sentences = clean.match(/[^.!?]+[.!?]?/g) || [clean];
  const chunks = [];
  let current = "";

  sentences.forEach((sentence) => {
    const next = sentence.trim();
    if (!next) return;

    if ((current + " " + next).trim().length <= maxLength) {
      current = (current + " " + next).trim();
      return;
    }

    if (current) chunks.push(current);
    if (next.length <= maxLength) {
      current = next;
      return;
    }

    for (let i = 0; i < next.length; i += maxLength) {
      chunks.push(next.slice(i, i + maxLength));
    }
    current = "";
  });

  if (current) chunks.push(current);
  return chunks;
}

export function speakText(text, options = {}) {
  if (typeof window === "undefined") return false;

  const nativeTts = window.Capacitor?.Plugins?.TextToSpeech;
  if (nativeTts?.speak && window.Capacitor?.isNativePlatform?.()) {
    const chunks = splitSpeechText(text, options.maxLength || 220);
    if (!chunks.length) return false;

    let cancelled = false;
    options.onStart?.();

    (async () => {
      try {
        for (const chunk of chunks) {
          if (cancelled) break;
          await nativeTts.speak({
            text: chunk,
            lang: options.lang || "en-IN",
            rate: options.rate ?? 0.9,
            pitch: options.pitch ?? 1,
            volume: 1,
            category: "playback",
          });
        }
        options.onEnd?.();
      } catch {
        options.onError?.();
        options.onEnd?.();
      }
    })();

    return true;
  }

  const synth = window.speechSynthesis;
  const Utterance = window.SpeechSynthesisUtterance || globalThis.SpeechSynthesisUtterance;
  if (!synth || !Utterance) return false;

  const chunks = splitSpeechText(text, options.maxLength || 220);
  if (!chunks.length) return false;

  let index = 0;
  let stopped = false;
  let resumeTimer = null;

  const finish = () => {
    if (resumeTimer) {
      window.clearInterval(resumeTimer);
      resumeTimer = null;
    }
    if (!stopped) options.onEnd?.();
  };

  const playNext = () => {
    if (stopped) return;
    if (index >= chunks.length) {
      finish();
      return;
    }

    const utterance = new Utterance(chunks[index]);
    index += 1;

    utterance.lang = options.lang || "en-IN";
    utterance.rate = options.rate ?? 0.9;
    utterance.pitch = options.pitch ?? 0.95;
    utterance.volume = 1;
    if (options.voice) utterance.voice = options.voice;

    utterance.onend = () => {
      window.setTimeout(playNext, 80);
    };
    utterance.onerror = () => {
      stopped = true;
      if (resumeTimer) {
        window.clearInterval(resumeTimer);
        resumeTimer = null;
      }
      options.onError?.();
      options.onEnd?.();
    };

    try {
      synth.resume?.();
      synth.speak(utterance);
      window.setTimeout(() => synth.resume?.(), 120);
    } catch {
      stopped = true;
      if (resumeTimer) {
        window.clearInterval(resumeTimer);
        resumeTimer = null;
      }
      options.onError?.();
      options.onEnd?.();
    }
  };

  synth.cancel();
  synth.resume?.();
  options.onStart?.();
  resumeTimer = window.setInterval(() => {
    try { synth.resume?.(); } catch {}
  }, 250);
  window.setTimeout(playNext, 40);
  return true;
}
