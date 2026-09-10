/**
 * Browser speech-synthesis helper used by the kiosk simulator.
 * Voices are simulated in the demo: we pick the best available system voice
 * for the requested language and narrate the scripted clinical dialogue.
 */

export type VoiceLocale =
  | "hi-IN"
  | "en-IN"
  | "ta-IN"
  | "bn-IN"
  | "mr-IN"
  | "te-IN"
  | "gu-IN"
  | "kn-IN";

const LANG_LABELS: Record<VoiceLocale, string> = {
  "hi-IN": "हिन्दी",
  "en-IN": "English",
  "ta-IN": "தமிழ்",
  "bn-IN": "বাংলা",
  "mr-IN": "मराठी",
  "te-IN": "తెలుగు",
  "gu-IN": "ગુજરાતી",
  "kn-IN": "ಕನ್ನಡ",
};

export function voiceLabel(locale: VoiceLocale): string {
  return LANG_LABELS[locale] ?? locale;
}

let cachedVoice: SpeechSynthesisVoice | null | undefined;

function resolveVoice(locale: VoiceLocale): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  if (cachedVoice !== undefined) return cachedVoice;
  const synth = window.speechSynthesis;
  const load = () => {
    const voices = synth.getVoices();
    cachedVoice =
      voices.find((v) => v.lang?.toLowerCase().startsWith(locale.slice(0, 2))) ??
      voices.find((v) => v.lang?.toLowerCase().includes("in")) ??
      voices[0] ??
      null;
  };
  load();
  if (cachedVoice === undefined) {
    synth.addEventListener("voiceschanged", load, { once: true });
  }
  return cachedVoice ?? null;
}

/** Speak a line of text; resolves immediately when TTS is unavailable. */
export function speak(text: string, locale: VoiceLocale): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const voice = resolveVoice(locale);
    if (voice) utter.voice = voice;
    utter.lang = voice?.lang ?? locale;
    utter.rate = 0.98;
    utter.pitch = 1.02;
    synth.speak(utter);
  } catch {
    /* TTS is a progressive enhancement — stay silent on failure */
  }
}

export function stopSpeaking(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* noop */
  }
}
