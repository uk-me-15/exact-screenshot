/**
 * Core MediKiosk domain types.
 *
 * These describe the *persisted* encounter — the single source of truth for a
 * patient session. React state never owns this data; it is always a view of a
 * row in the `encounters` table.
 */

export type CareMode = "allopathy" | "ayush";

export type EncounterStatus =
  | "IN_PROGRESS"
  | "READY_FOR_DOCTOR"
  | "URGENT"
  | "IN_CONSULT"
  | "COMPLETED"
  | "CANCELLED";

export type Priority = "ROUTINE" | "URGENT";

export type AnswerSource = "voice" | "touch" | "typed";

export interface PatientIdentity {
  name: string;
  age: number;
  sex: "Female" | "Male" | "Other";
  abhaMasked: string | null;
}

export interface IdentityVerification {
  provider: string;
  /** "demo" means no government system was contacted. Never claim otherwise. */
  mode: "demo" | "live";
  verifiedAt: string;
  reference: string | null;
}

export interface IntakeAnswer {
  key: string;
  label: string;
  value: string;
  source: AnswerSource;
  answeredAt: string;
}

export interface AyushFinding {
  key: string;
  label: string;
  value: string;
}

export interface ConsentRecord {
  granted: boolean;
  timestamp: string;
  purpose: string;
  version: string;
}

export interface RedFlag {
  code: string;
  label: string;
  advice: string;
  destination: string;
}

export interface EncounterDocument {
  id: string;
  encounterId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  kind: string;
  processingStatus: "PENDING" | "PROCESSED" | "FAILED" | "UNSUPPORTED";
  ocrProvider: string | null;
  ocrText: string | null;
  ocrConfidence: number | null;
  uploadedAt: string;
}

export interface Encounter {
  id: string;
  displayToken: string;
  isDemo: boolean;
  status: EncounterStatus;
  careMode: CareMode | null;
  language: string | null;
  languageLabel: string | null;
  patient: PatientIdentity | null;
  identityVerification: IdentityVerification | null;
  consent: ConsentRecord | null;
  chiefComplaint: string | null;
  chiefComplaintLabel: string | null;
  answers: IntakeAnswer[];
  ayush: AyushFinding[];
  redFlags: RedFlag[];
  priority: Priority;
  aiSummary: string | null;
  doctorNotes: string | null;
  intakeSeconds: number | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  completedAt: string | null;
  documents: EncounterDocument[];
}
