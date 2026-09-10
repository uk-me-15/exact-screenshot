/**
 * Speech INPUT (recognition) — not to be confused with speech synthesis in
 * src/lib/speech.ts, which only reads text aloud.
 *
 * Uses the browser Web Speech API where available. If it is unavailable the
 * caller must fall back to typed input; we never pretend to transcribe.
 */

export interface SpeechInputHandlers {
  onPartial?: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
}

type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w["SpeechRecognition"] ?? w["webkitSpeechRecognition"]) as
    | (new () => RecognitionLike)
    | null;
}

export class SpeechInputService {
  private recognition: RecognitionLike | null = null;
  private listening = false;

  isSupported(): boolean {
    return getRecognitionCtor() !== null;
  }

  isListening(): boolean {
    return this.listening;
  }

  start(locale: string, handlers: SpeechInputHandlers): boolean {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      handlers.onError?.("Speech recognition is not available on this device.");
      return false;
    }
    this.stop();

    const recognition = new Ctor();
    recognition.lang = locale;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) final += text;
        else interim += text;
      }
      if (interim) handlers.onPartial?.(interim.trim());
      if (final) handlers.onFinal(final.trim());
    };

    recognition.onerror = (event: any) => {
      const code = event?.error ?? "unknown";
      const message =
        code === "not-allowed"
          ? "Microphone permission was refused. You can type your answer instead."
          : code === "no-speech"
            ? "I didn't catch that. Please try again or type your answer."
            : "Speech recognition failed. Please type your answer instead.";
      handlers.onError?.(message);
    };

    recognition.onend = () => {
      this.listening = false;
      handlers.onEnd?.();
    };

    this.recognition = recognition;
    try {
      recognition.start();
      this.listening = true;
      return true;
    } catch {
      this.listening = false;
      handlers.onError?.("Could not start the microphone. Please type your answer.");
      return false;
    }
  }

  stop(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        /* already stopped */
      }
      this.recognition = null;
    }
    this.listening = false;
  }
}

export const speechInput = new SpeechInputService();
