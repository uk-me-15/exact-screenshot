/**
 * Static, non-clinical content for MediKiosk.
 *
 * NOTE: this file no longer contains scripted patient answers. Anything that
 * looks like patient data must come from a persisted encounter. The only
 * exception is DEMO_PATIENT, which is used exclusively when the operator
 * explicitly starts a demo session and is always labelled as such.
 */

import type { VoiceLocale } from "@/lib/speech";

export interface KioskLanguage {
  locale: VoiceLocale;
  label: string;
  english: string;
  nativeScript: string;
}

export const KIOSK_LANGUAGES: KioskLanguage[] = [
  { locale: "hi-IN", label: "हिन्दी", english: "Hindi", nativeScript: "नमस्ते" },
  { locale: "en-IN", label: "English", english: "English", nativeScript: "Hello" },
  { locale: "ta-IN", label: "தமிழ்", english: "Tamil", nativeScript: "வணக்கம்" },
  { locale: "bn-IN", label: "বাংলা", english: "Bengali", nativeScript: "নমস্কার" },
  { locale: "mr-IN", label: "मराठी", english: "Marathi", nativeScript: "नमस्कार" },
  { locale: "te-IN", label: "తెలుగు", english: "Telugu", nativeScript: "నమస్కారం" },
  { locale: "gu-IN", label: "ગુજરાતી", english: "Gujarati", nativeScript: "કેમ છો" },
  { locale: "kn-IN", label: "ಕನ್ನಡ", english: "Kannada", nativeScript: "ನಮಸ್ಕಾರ" },
];

export const CONSENT_POINTS: { title: string; body: string }[] = [
  {
    title: "Purpose limitation",
    body: "Your answers are shared only with the doctor treating you today at this facility.",
  },
  {
    title: "Data minimisation",
    body: "Only what the consultation needs is shared: complaint, history, medicines and any reports you attach. An ABHA number, if you give one, is stored masked.",
  },
  {
    title: "You stay in control",
    body: "You can stop at any point before you press Share. Nothing is sent to the doctor until you consent.",
  },
  {
    title: "Prototype notice",
    body: "This is a prototype. ABHA verification is simulated and no government health record is created or read.",
  },
];

/** Used ONLY for explicitly-started demo sessions. Never auto-filled silently. */
export const DEMO_PATIENT = {
  name: "Demo Patient (sample data)",
  age: 54,
  sex: "Female" as const,
  abhaNumber: "12345678901234",
};

export const a11yPersonaRows: {
  situation: string;
  statusQuo: string;
  medikiosk: string;
}[] = [
  {
    situation: "Cannot read or write",
    statusQuo: "Depends on a relative or clerk to fill the form",
    medikiosk: "Every question is spoken aloud; answers can be spoken back",
  },
  {
    situation: "No smartphone",
    statusQuo: "App-based registration is out of reach",
    medikiosk: "Shared kiosk in the OPD, nothing to install",
  },
  {
    situation: "Speaks only a regional language",
    statusQuo: "English forms and hurried translation",
    medikiosk: "Intake in the language the patient picks",
  },
  {
    situation: "Elderly, unsteady hands",
    statusQuo: "Small print, small boxes",
    medikiosk: "Large targets, voice input, no time pressure",
  },
  {
    situation: "Emergency symptoms",
    statusQuo: "Waits in the general queue unnoticed",
    medikiosk: "Rule-based red flags push the case to the top of the doctor's list",
  },
];
