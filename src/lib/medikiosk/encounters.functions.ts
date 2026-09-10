/**
 * Kiosk-side server functions.
 *
 * The kiosk is not signed in, so every call is scoped by an unguessable kiosk
 * token that only the browser holding the session knows. All writes happen on
 * the server; the anonymous role has no direct table access.
 */

import { createServerFn } from "@tanstack/react-start";
import type { Encounter } from "./types";
import { mapEncounterRow } from "./mappers";
import { evaluateRedFlags } from "./red-flags";
import { buildSummary } from "./summary";
import { classifyDocument, ocrProvider } from "./ocr.server";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Missing ${field}`);
  return value;
}

async function loadByToken(db: any, kioskToken: string): Promise<Encounter> {
  const { data, error } = await db
    .from("encounters")
    .select("*")
    .eq("kiosk_token", kioskToken)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("This kiosk session could not be found. Please start again.");
  const { data: docs } = await db
    .from("encounter_documents")
    .select("*")
    .eq("encounter_id", data.id)
    .order("uploaded_at", { ascending: true });
  return mapEncounterRow(data, docs ?? []);
}

async function nextDisplayToken(db: any): Promise<string> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const { count } = await db
    .from("encounters")
    .select("id", { count: "exact", head: true })
    .gte("created_at", start.toISOString());
  return `B-${String((count ?? 0) + 1).padStart(2, "0")}`;
}

/** Create a brand-new encounter row and hand its private token to the kiosk. */
export const startEncounter = createServerFn({ method: "POST" })
  .inputValidator((data: { isDemo?: boolean; kioskId?: string }) => ({
    isDemo: !!data?.isDemo,
    kioskId: typeof data?.kioskId === "string" ? data.kioskId : null,
  }))
  .handler(async ({ data }) => {
    const db = await admin();
    const kioskToken = randomToken();
    const displayToken = await nextDisplayToken(db);
    const { data: row, error } = await db
      .from("encounters")
      .insert({
        kiosk_token: kioskToken,
        display_token: displayToken,
        is_demo: data.isDemo,
        kiosk_id: data.kioskId,
        status: "IN_PROGRESS",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { kioskToken, encounter: mapEncounterRow(row, []) };
  });

/** Resume an in-progress encounter after a refresh. */
export const getEncounter = createServerFn({ method: "POST" })
  .inputValidator((data: { kioskToken: string }) => ({
    kioskToken: asString(data?.kioskToken, "kiosk token"),
  }))
  .handler(async ({ data }) => {
    const db = await admin();
    return loadByToken(db, data.kioskToken);
  });

export interface EncounterPatch {
  careMode?: "allopathy" | "ayush";
  language?: string;
  languageLabel?: string;
  patient?: unknown;
  identityVerification?: unknown;
  consent?: unknown;
  chiefComplaint?: string | null;
  chiefComplaintLabel?: string | null;
  answers?: unknown;
  ayush?: unknown;
}

/** Save intake progress. Only in-progress encounters can be edited. */
export const updateEncounter = createServerFn({ method: "POST" })
  .inputValidator((data: { kioskToken: string; patch: EncounterPatch }) => ({
    kioskToken: asString(data?.kioskToken, "kiosk token"),
    patch: (data?.patch ?? {}) as EncounterPatch,
  }))
  .handler(async ({ data }) => {
    const db = await admin();
    const current = await loadByToken(db, data.kioskToken);
    if (current.status !== "IN_PROGRESS") {
      throw new Error("This session has already been submitted and can no longer be edited.");
    }

    const p = data.patch;
    const update: Record<string, unknown> = {};
    if (p.careMode) update["care_mode"] = p.careMode;
    if (p.language) update["language"] = p.language;
    if (p.languageLabel) update["language_label"] = p.languageLabel;
    if (p.patient !== undefined) update["patient"] = p.patient;
    if (p.identityVerification !== undefined) update["identity_verification"] = p.identityVerification;
    if (p.consent !== undefined) update["consent"] = p.consent;
    if (p.chiefComplaint !== undefined) update["chief_complaint"] = p.chiefComplaint;
    if (p.chiefComplaintLabel !== undefined) update["chief_complaint_label"] = p.chiefComplaintLabel;
    if (p.answers !== undefined) update["answers"] = p.answers;
    if (p.ayush !== undefined) update["ayush"] = p.ayush;

    if (Object.keys(update).length === 0) return current;

    const { error } = await db.from("encounters").update(update).eq("id", current.id);
    if (error) throw new Error(error.message);
    return loadByToken(db, data.kioskToken);
  });

/** Store a document privately and run it through the OCR provider interface. */
export const uploadEncounterDocument = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { kioskToken: string; fileName: string; fileType: string; contentBase64: string }) => ({
      kioskToken: asString(data?.kioskToken, "kiosk token"),
      fileName: asString(data?.fileName, "file name"),
      fileType: typeof data?.fileType === "string" ? data.fileType : "application/octet-stream",
      contentBase64: asString(data?.contentBase64, "file content"),
    }),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const encounter = await loadByToken(db, data.kioskToken);
    if (encounter.status !== "IN_PROGRESS") {
      throw new Error("This session has already been submitted.");
    }

    const binary = atob(data.contentBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    if (bytes.length > 10 * 1024 * 1024) throw new Error("Files must be under 10 MB.");

    const safeName = data.fileName.replace(/[^\w.\-]+/g, "_").slice(-80);
    const storagePath = `${encounter.id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await db.storage
      .from("encounter-documents")
      .upload(storagePath, bytes, { contentType: data.fileType, upsert: false });
    if (uploadError) throw new Error(uploadError.message);

    const ocr = await ocrProvider.process({
      fileName: data.fileName,
      fileType: data.fileType,
      bytes,
    });

    const { error } = await db.from("encounter_documents").insert({
      encounter_id: encounter.id,
      file_name: data.fileName,
      file_type: data.fileType,
      file_size: bytes.length,
      kind: classifyDocument(data.fileName),
      storage_path: storagePath,
      processing_status: ocr.status,
      ocr_provider: ocr.provider,
      ocr_text: ocr.text,
      ocr_structured: ocr.structured,
      ocr_confidence: ocr.confidence,
    });
    if (error) throw new Error(error.message);

    return loadByToken(db, data.kioskToken);
  });

export const deleteEncounterDocument = createServerFn({ method: "POST" })
  .inputValidator((data: { kioskToken: string; documentId: string }) => ({
    kioskToken: asString(data?.kioskToken, "kiosk token"),
    documentId: asString(data?.documentId, "document id"),
  }))
  .handler(async ({ data }) => {
    const db = await admin();
    const encounter = await loadByToken(db, data.kioskToken);
    const { data: doc } = await db
      .from("encounter_documents")
      .select("*")
      .eq("id", data.documentId)
      .eq("encounter_id", encounter.id)
      .maybeSingle();
    if (!doc) throw new Error("Document not found.");
    await db.storage.from("encounter-documents").remove([doc.storage_path]);
    await db.from("encounter_documents").delete().eq("id", doc.id);
    return loadByToken(db, data.kioskToken);
  });

/**
 * Finalise the encounter: consent, deterministic red-flag evaluation, summary
 * generation and hand-off to the doctor queue. Red flags are computed on the
 * server so the kiosk cannot skip them.
 */
export const submitEncounter = createServerFn({ method: "POST" })
  .inputValidator((data: { kioskToken: string; consentGranted: boolean; intakeSeconds?: number }) => ({
    kioskToken: asString(data?.kioskToken, "kiosk token"),
    consentGranted: !!data?.consentGranted,
    intakeSeconds: Number.isFinite(data?.intakeSeconds) ? Number(data?.intakeSeconds) : null,
  }))
  .handler(async ({ data }) => {
    const db = await admin();
    const encounter = await loadByToken(db, data.kioskToken);
    if (!data.consentGranted) throw new Error("Consent is required before the record can be shared.");
    if (!encounter.patient) throw new Error("Patient details are missing.");
    if (encounter.answers.length === 0) throw new Error("No intake answers were recorded.");

    const redFlags = evaluateRedFlags(
      encounter.careMode ?? "allopathy",
      encounter.chiefComplaint,
      encounter.answers,
    );
    const summary = await buildSummary(encounter, redFlags);

    const { error } = await db
      .from("encounters")
      .update({
        consent: {
          granted: true,
          timestamp: new Date().toISOString(),
          purpose: "Share this intake record with the treating doctor at this facility",
          version: "v1",
        },
        red_flags: redFlags,
        priority: redFlags.length > 0 ? "URGENT" : "ROUTINE",
        status: redFlags.length > 0 ? "URGENT" : "READY_FOR_DOCTOR",
        ai_summary: summary,
        intake_seconds: data.intakeSeconds,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", encounter.id);
    if (error) throw new Error(error.message);

    return loadByToken(db, data.kioskToken);
  });

/** Abandon an unfinished session (kiosk timeout or "start over"). */
export const cancelEncounter = createServerFn({ method: "POST" })
  .inputValidator((data: { kioskToken: string }) => ({
    kioskToken: asString(data?.kioskToken, "kiosk token"),
  }))
  .handler(async ({ data }) => {
    const db = await admin();
    const encounter = await loadByToken(db, data.kioskToken);
    if (encounter.status === "IN_PROGRESS") {
      await db.from("encounters").update({ status: "CANCELLED" }).eq("id", encounter.id);
    }
    return { ok: true };
  });
