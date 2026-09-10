/**
 * Deterministic red-flag rules.
 *
 * This is a SAFETY NET, not a triage engine and never a diagnosis. It only
 * detects a small set of obvious high-risk patterns and asks for immediate
 * clinical assessment.
 */

import type { CareMode, IntakeAnswer, RedFlag } from "./types";
import { answersToMap } from "./questions";

const EMERGENCY_PHRASES: { phrase: string; code: string; label: string }[] = [
  { phrase: "unconscious", code: "LOC", label: "Loss of consciousness reported" },
  { phrase: "fainted", code: "LOC", label: "Fainting episode reported" },
  { phrase: "seizure", code: "SEIZURE", label: "Seizure reported" },
  { phrase: "fits", code: "SEIZURE", label: "Seizure reported" },
  { phrase: "slurred speech", code: "STROKE", label: "Possible stroke symptoms reported" },
  { phrase: "face drooping", code: "STROKE", label: "Possible stroke symptoms reported" },
  { phrase: "one side weak", code: "STROKE", label: "Possible stroke symptoms reported" },
  { phrase: "blood in vomit", code: "GI_BLEED", label: "Bleeding reported" },
  { phrase: "vomiting blood", code: "GI_BLEED", label: "Bleeding reported" },
  { phrase: "coughing blood", code: "HAEMOPTYSIS", label: "Coughing up blood reported" },
  { phrase: "heavy bleeding", code: "BLEED", label: "Heavy bleeding reported" },
  { phrase: "suicid", code: "SELF_HARM", label: "Thoughts of self-harm reported" },
];

const URGENT_ADVICE =
  "Potential emergency symptoms detected. Immediate clinical assessment required.";

function flag(code: string, label: string, destination: string): RedFlag {
  return { code, label, advice: URGENT_ADVICE, destination };
}

export function evaluateRedFlags(
  careMode: CareMode,
  complaintId: string | null,
  answers: IntakeAnswer[],
): RedFlag[] {
  const map = answersToMap(answers);
  const found = new Map<string, RedFlag>();
  const blob = answers
    .map((a) => a.value)
    .join(" ")
    .toLowerCase();

  for (const rule of EMERGENCY_PHRASES) {
    if (blob.includes(rule.phrase)) {
      found.set(rule.code, flag(rule.code, rule.label, "Emergency triage — Red Zone"));
    }
  }

  const severityValue = Number(map["severity"] ?? 0);

  if (complaintId === "chest-pain") {
    const sweating = (map["sweating"] ?? "").toLowerCase();
    const radiation = (map["radiation"] ?? "").toLowerCase();
    if (
      severityValue >= 7 ||
      sweating.includes("sweating") ||
      sweating.includes("breathless") ||
      sweating.includes("both") ||
      radiation.includes("arm") ||
      radiation.includes("jaw")
    ) {
      found.set(
        "ACS",
        flag(
          "ACS",
          "Chest pain with high-risk features (severity, radiation or sweating)",
          "Triage Bay 1 — Emergency Medicine (ECG first)",
        ),
      );
    }
  }

  const breathing = (map["breathing"] ?? "").toLowerCase();
  if (breathing.includes("at rest")) {
    found.set(
      "DYSPNOEA",
      flag(
        "DYSPNOEA",
        "Breathlessness at rest reported",
        "Red Zone — oxygen saturation check before consultation",
      ),
    );
  }

  if ((map["vomiting"] ?? "").toLowerCase().includes("blood")) {
    found.set("GI_BLEED", flag("GI_BLEED", "Vomiting with blood reported", "Emergency triage — Red Zone"));
  }
  if ((map["bowels"] ?? "").toLowerCase().includes("blood")) {
    found.set("GI_BLEED", flag("GI_BLEED", "Blood in stool reported", "Emergency triage — Red Zone"));
  }
  if ((map["cough"] ?? "").toLowerCase().includes("blood")) {
    found.set("HAEMOPTYSIS", flag("HAEMOPTYSIS", "Coughing up blood reported", "Emergency triage — Red Zone"));
  }

  if (severityValue >= 9) {
    found.set(
      "SEVERE_PAIN",
      flag("SEVERE_PAIN", "Patient reports severe pain (9–10/10)", "Priority clinical review"),
    );
  }

  // AYUSH intake follows the same safety net — the pathway never overrides it.
  if (careMode === "ayush" && severityValue >= 8) {
    found.set(
      "SEVERE_PAIN",
      flag("SEVERE_PAIN", "Severe symptoms reported during AYUSH intake", "Priority clinical review"),
    );
  }

  return [...found.values()];
}

/** Once a red flag fires, stop asking non-essential questions. */
export function shouldStopQuestioning(flags: RedFlag[]): boolean {
  return flags.some((f) => f.code !== "SEVERE_PAIN");
}
