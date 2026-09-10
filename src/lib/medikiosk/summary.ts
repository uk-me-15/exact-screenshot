/**
 * Encounter summary generation.
 *
 * Rule 1: the AI restructures what the patient said. It must not diagnose, must
 * not suggest treatment, and must not invent facts. If the model is
 * unavailable, we fall back to a deterministic template so the doctor always
 * gets the raw structured answers.
 */

import type { Encounter, RedFlag } from "./types";

function deterministicSummary(encounter: Encounter, redFlags: RedFlag[]): string {
  const p = encounter.patient;
  const lines: string[] = [];
  lines.push(
    `${p?.name ?? "Patient"}, ${p?.age ?? "?"} ${p?.sex ?? ""} — presenting with ${
      encounter.chiefComplaintLabel ?? "an unspecified complaint"
    }.`,
  );
  if (encounter.careMode === "ayush") lines.push("Pathway: AYUSH (Ayurveda) intake.");
  for (const a of encounter.answers) lines.push(`• ${a.label}: ${a.value}`);
  for (const f of encounter.ayush) lines.push(`• ${f.label}: ${f.value}`);
  if (encounter.documents.length > 0) {
    lines.push(`• Documents attached: ${encounter.documents.map((d) => d.fileName).join(", ")}`);
  }
  if (redFlags.length > 0) {
    lines.push(`• RED FLAGS: ${redFlags.map((f) => f.label).join("; ")}`);
  }
  lines.push("Patient-reported information only. No diagnosis or treatment is suggested.");
  return lines.join("\n");
}

export async function buildSummary(encounter: Encounter, redFlags: RedFlag[]): Promise<string> {
  const fallback = deterministicSummary(encounter, redFlags);
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return fallback;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a medical scribe. Rewrite the patient's own answers into a short, neutral clinical handover note for a doctor. " +
              "STRICT RULES: never diagnose, never name a likely condition, never suggest tests, treatment or medication, " +
              "never add any fact the patient did not state. If information is missing, write 'not reported'. " +
              "Output plain text of at most 120 words.",
          },
          { role: "user", content: fallback },
        ],
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return fallback;
    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = json.choices?.[0]?.message?.content?.trim();
    return text && text.length > 20 ? text : fallback;
  } catch {
    return fallback;
  }
}
