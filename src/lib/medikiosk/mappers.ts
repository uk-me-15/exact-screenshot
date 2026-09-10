import type {
  AyushFinding,
  ConsentRecord,
  Encounter,
  EncounterDocument,
  IdentityVerification,
  IntakeAnswer,
  PatientIdentity,
  Priority,
  RedFlag,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function mapEncounterRow(row: any, documents: any[] = []): Encounter {
  return {
    id: row.id,
    displayToken: row.display_token,
    isDemo: !!row.is_demo,
    status: row.status,
    careMode: row.care_mode ?? null,
    language: row.language ?? null,
    languageLabel: row.language_label ?? null,
    patient: (row.patient ?? null) as PatientIdentity | null,
    identityVerification: (row.identity_verification ?? null) as IdentityVerification | null,
    consent: (row.consent ?? null) as ConsentRecord | null,
    chiefComplaint: row.chief_complaint ?? null,
    chiefComplaintLabel: row.chief_complaint_label ?? null,
    answers: (row.answers ?? []) as IntakeAnswer[],
    ayush: (row.ayush ?? []) as AyushFinding[],
    redFlags: (row.red_flags ?? []) as RedFlag[],
    priority: (row.priority ?? "ROUTINE") as Priority,
    aiSummary: row.ai_summary ?? null,
    doctorNotes: row.doctor_notes ?? null,
    intakeSeconds: row.intake_seconds ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    submittedAt: row.submitted_at ?? null,
    completedAt: row.completed_at ?? null,
    documents: documents.map(mapDocumentRow),
  };
}

export function mapDocumentRow(row: any): EncounterDocument {
  return {
    id: row.id,
    encounterId: row.encounter_id,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size ?? 0,
    kind: row.kind ?? "OTHER",
    processingStatus: row.processing_status ?? "PENDING",
    ocrProvider: row.ocr_provider ?? null,
    ocrText: row.ocr_text ?? null,
    ocrConfidence: row.ocr_confidence ?? null,
    uploadedAt: row.uploaded_at,
  };
}
