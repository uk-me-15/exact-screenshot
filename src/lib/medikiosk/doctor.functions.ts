/**
 * Doctor-side server functions. Every one of these requires a signed-in staff
 * account — the queue is never readable by an anonymous kiosk.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mapEncounterRow } from "./mappers";
import type { Encounter, EncounterStatus } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ACTIVE: EncounterStatus[] = ["URGENT", "READY_FOR_DOCTOR", "IN_CONSULT", "COMPLETED"];

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Missing ${field}`);
  return value;
}

export const listQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Encounter[]> => {
    const db = (context as any).supabase;
    const { data, error } = await db
      .from("encounters")
      .select("*")
      .in("status", ACTIVE)
      .order("priority", { ascending: true })
      .order("submitted_at", { ascending: true })
      .limit(100);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as any[];
    const sorted = rows.sort((a, b) => {
      if (a.status === "URGENT" && b.status !== "URGENT") return -1;
      if (b.status === "URGENT" && a.status !== "URGENT") return 1;
      return String(a.submitted_at ?? "").localeCompare(String(b.submitted_at ?? ""));
    });
    return sorted.map((row) => mapEncounterRow(row, []));
  });

export const getEncounterDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => ({ id: asString(data?.id, "encounter id") }))
  .handler(async ({ data, context }): Promise<Encounter> => {
    const db = (context as any).supabase;
    const { data: row, error } = await db
      .from("encounters")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Encounter not found.");
    const { data: docs } = await db
      .from("encounter_documents")
      .select("*")
      .eq("encounter_id", data.id)
      .order("uploaded_at", { ascending: true });
    return mapEncounterRow(row, docs ?? []);
  });

export const saveDoctorNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; notes: string }) => ({
    id: asString(data?.id, "encounter id"),
    notes: typeof data?.notes === "string" ? data.notes : "",
  }))
  .handler(async ({ data, context }) => {
    const db = (context as any).supabase;
    const { error } = await db
      .from("encounters")
      .update({ doctor_notes: data.notes, doctor_id: (context as any).userId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setEncounterStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; status: EncounterStatus }) => ({
    id: asString(data?.id, "encounter id"),
    status: asString(data?.status, "status") as EncounterStatus,
  }))
  .handler(async ({ data, context }) => {
    const db = (context as any).supabase;
    const update: Record<string, unknown> = {
      status: data.status,
      doctor_id: (context as any).userId,
    };
    if (data.status === "COMPLETED") update["completed_at"] = new Date().toISOString();
    const { error } = await db.from("encounters").update(update).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Short-lived signed URL so a doctor can open a privately stored document. */
export const getDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { documentId: string }) => ({
    documentId: asString(data?.documentId, "document id"),
  }))
  .handler(async ({ data, context }) => {
    const db = (context as any).supabase;
    const { data: doc, error } = await db
      .from("encounter_documents")
      .select("storage_path")
      .eq("id", data.documentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!doc) throw new Error("Document not found.");
    const { data: signed, error: signError } = await db.storage
      .from("encounter-documents")
      .createSignedUrl(doc.storage_path, 300);
    if (signError) throw new Error(signError.message);
    return { url: signed?.signedUrl as string };
  });
