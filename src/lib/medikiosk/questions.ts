/**
 * Rule-based question engine.
 *
 * Version 1 deliberately uses a deterministic questionnaire rather than an AI
 * interviewer: the next question depends only on the complaint and on what the
 * patient has already answered.
 */

import type { CareMode, IntakeAnswer } from "./types";

export interface Question {
  key: string;
  label: string;
  prompt: string;
  type: "text" | "choice" | "scale";
  options?: string[];
  /** Optional condition on the answers gathered so far. */
  when?: (answers: Record<string, string>) => boolean;
}

export interface ComplaintDef {
  id: string;
  label: string;
  hindi: string;
  icon: string;
  questions: Question[];
}

const severity: Question = {
  key: "severity",
  label: "Severity",
  prompt: "How bad is it right now, from 1 (mild) to 10 (worst)?",
  type: "scale",
};

const onset: Question = {
  key: "onset",
  label: "Onset",
  prompt: "When did it start, and did it start suddenly or slowly?",
  type: "text",
};

const duration: Question = {
  key: "duration",
  label: "Duration",
  prompt: "How long have you had this problem?",
  type: "choice",
  options: ["Today", "2–3 days", "About a week", "A few weeks", "Months or longer"],
};

const character: Question = {
  key: "character",
  label: "Character",
  prompt: "What does it feel like? (burning, dull, sharp, cramping…)",
  type: "text",
};

const relieving: Question = {
  key: "relieving",
  label: "Relieving factors",
  prompt: "Does anything make it better — rest, food, medicine?",
  type: "text",
};

const aggravating: Question = {
  key: "aggravating",
  label: "Aggravating factors",
  prompt: "Does anything make it worse?",
  type: "text",
};

const associated: Question = {
  key: "associated",
  label: "Associated symptoms",
  prompt: "Is anything else happening along with it?",
  type: "text",
};

const history: Question = {
  key: "history",
  label: "Medical history",
  prompt: "Do you have any long-term illness such as diabetes, BP, asthma or heart disease?",
  type: "text",
};

const medications: Question = {
  key: "medications",
  label: "Current medications",
  prompt: "Which medicines are you taking at the moment?",
  type: "text",
};

const allergies: Question = {
  key: "allergies",
  label: "Allergies",
  prompt: "Are you allergic to any medicine or food?",
  type: "text",
};

const previousTreatment: Question = {
  key: "previous_treatment",
  label: "Previous treatment",
  prompt: "Have you already taken any treatment for this problem?",
  type: "text",
};

const common: Question[] = [history, medications, allergies, previousTreatment];

export const CLINICAL_COMPLAINTS: ComplaintDef[] = [
  {
    id: "chest-pain",
    label: "Chest Pain",
    hindi: "सीने में दर्द",
    icon: "heart-pulse",
    questions: [
      onset,
      duration,
      severity,
      character,
      {
        key: "radiation",
        label: "Radiation",
        prompt: "Does the pain travel to your arm, jaw, neck or back?",
        type: "choice",
        options: ["No", "Left arm", "Jaw or neck", "Back", "Not sure"],
      },
      {
        key: "exertion",
        label: "Relation to exertion",
        prompt: "Does it come on when you walk or climb stairs?",
        type: "choice",
        options: ["Yes, on exertion", "Also at rest", "No"],
      },
      {
        key: "sweating",
        label: "Sweating / breathlessness",
        prompt: "Are you sweating or breathless with the pain?",
        type: "choice",
        options: ["No", "Sweating", "Breathless", "Both"],
        when: (a) => Number(a["severity"] ?? 0) >= 5 || a["exertion"] !== "No",
      },
      associated,
      ...common,
    ],
  },
  {
    id: "digestive",
    label: "Digestive Distress",
    hindi: "पेट संबंधी परेशानी",
    icon: "salad",
    questions: [
      onset,
      duration,
      severity,
      character,
      {
        key: "location",
        label: "Location",
        prompt: "Where in the stomach do you feel it?",
        type: "choice",
        options: ["Upper stomach", "Around the navel", "Lower stomach", "All over"],
      },
      {
        key: "meals",
        label: "Relation to meals",
        prompt: "Is it worse before or after eating?",
        type: "choice",
        options: ["Before meals", "After meals", "No difference"],
      },
      {
        key: "bowels",
        label: "Bowel habit",
        prompt: "Any change in motions — loose, constipated or blood?",
        type: "choice",
        options: ["Normal", "Loose motions", "Constipated", "Blood in motion"],
      },
      {
        key: "vomiting",
        label: "Vomiting",
        prompt: "Are you vomiting? Is there any blood in it?",
        type: "choice",
        options: ["No vomiting", "Vomiting", "Vomiting with blood"],
      },
      relieving,
      ...common,
    ],
  },
  {
    id: "fever",
    label: "Fever & Cough",
    hindi: "बुखार और खांसी",
    icon: "thermometer",
    questions: [
      onset,
      duration,
      severity,
      {
        key: "pattern",
        label: "Fever pattern",
        prompt: "Is the fever continuous, or does it come and go?",
        type: "choice",
        options: ["Continuous", "Comes and goes", "Only in the evening", "With chills"],
      },
      {
        key: "cough",
        label: "Cough",
        prompt: "Do you have a cough? Dry or with phlegm?",
        type: "choice",
        options: ["No cough", "Dry cough", "Cough with phlegm", "Cough with blood"],
      },
      {
        key: "breathing",
        label: "Breathing",
        prompt: "Are you breathless, even while sitting quietly?",
        type: "choice",
        options: ["No", "Only on walking", "Yes, even at rest"],
      },
      associated,
      ...common,
    ],
  },
  {
    id: "joint-pain",
    label: "Joint Pain",
    hindi: "जोड़ों का दर्द",
    icon: "bone",
    questions: [
      onset,
      duration,
      severity,
      {
        key: "joints",
        label: "Joints involved",
        prompt: "Which joints hurt?",
        type: "text",
      },
      {
        key: "stiffness",
        label: "Morning stiffness",
        prompt: "Are the joints stiff in the morning? For how long?",
        type: "text",
      },
      {
        key: "swelling",
        label: "Swelling",
        prompt: "Is there swelling, redness or warmth over the joint?",
        type: "choice",
        options: ["No", "Swelling", "Red and warm"],
      },
      aggravating,
      relieving,
      ...common,
    ],
  },
  {
    id: "other",
    label: "Something else",
    hindi: "अन्य समस्या",
    icon: "stethoscope",
    questions: [
      {
        key: "problem",
        label: "Problem",
        prompt: "Tell me in your own words what is troubling you today.",
        type: "text",
      },
      onset,
      duration,
      severity,
      character,
      associated,
      ...common,
    ],
  },
];

/** AYUSH pathway — Ashtavidha / Dashavidha Pariksha subset. */
export const AYUSH_QUESTIONS: Question[] = [
  {
    key: "prakriti",
    label: "Prakriti (Constitution)",
    prompt: "Which description fits your body and nature best?",
    type: "choice",
    options: ["Vata dominant", "Pitta dominant", "Kapha dominant", "Not sure"],
  },
  {
    key: "agni",
    label: "Agni (Digestive fire)",
    prompt: "How is your appetite and digestion?",
    type: "choice",
    options: ["Strong / sharp", "Weak / dull", "Irregular", "Balanced"],
  },
  {
    key: "ahara",
    label: "Ahara (Diet)",
    prompt: "How do you usually eat?",
    type: "choice",
    options: ["Regular meals", "Late and spicy", "Frequent snacking", "Often skip meals"],
  },
  {
    key: "vihara",
    label: "Vihara (Lifestyle)",
    prompt: "How would you describe your daily routine?",
    type: "choice",
    options: ["Active and regular", "Sedentary, late nights", "Heavy physical labour", "Mixed"],
  },
  {
    key: "mala",
    label: "Mala (Elimination)",
    prompt: "How are your bowel movements?",
    type: "choice",
    options: ["Regular", "Constipated", "Loose", "Irregular"],
  },
  {
    key: "nidra",
    label: "Nidra (Sleep)",
    prompt: "How do you sleep at night?",
    type: "choice",
    options: ["Sound sleep", "Disturbed sleep", "Difficulty falling asleep", "Excess sleep"],
  },
  {
    key: "jihva",
    label: "Jihva (Tongue)",
    prompt: "Is there any coating on your tongue in the morning?",
    type: "choice",
    options: ["Clean", "White coating", "Yellow coating", "Dry / cracked"],
  },
  {
    key: "complaint_detail",
    label: "Main discomfort",
    prompt: "Describe your main discomfort in your own words.",
    type: "text",
  },
];

export function complaintById(id: string | null | undefined): ComplaintDef | null {
  if (!id) return null;
  return CLINICAL_COMPLAINTS.find((c) => c.id === id) ?? null;
}

export function answersToMap(answers: IntakeAnswer[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const a of answers) map[a.key] = a.value;
  return map;
}

/** The questions that currently apply, given what has been answered so far. */
export function questionPlan(
  careMode: CareMode,
  complaintId: string | null,
  answers: IntakeAnswer[],
): Question[] {
  const map = answersToMap(answers);
  const all = careMode === "ayush" ? AYUSH_QUESTIONS : (complaintById(complaintId)?.questions ?? []);
  return all.filter((q) => (q.when ? q.when(map) : true));
}

/** The next unanswered question, or null when the intake is complete. */
export function nextQuestion(
  careMode: CareMode,
  complaintId: string | null,
  answers: IntakeAnswer[],
): Question | null {
  const map = answersToMap(answers);
  return questionPlan(careMode, complaintId, answers).find((q) => !map[q.key]) ?? null;
}
