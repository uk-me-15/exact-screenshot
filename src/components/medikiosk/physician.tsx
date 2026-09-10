/**
 * Doctor console — reads the real encounter queue.
 *
 * There is no demo fallback here: if the queue is empty the doctor sees an
 * empty state, never a fabricated patient. Demo encounters are shown, but
 * always with a visible DEMO badge.
 */

import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MediKioskLogo } from "@/components/medikiosk/ui";
import {
  getDocumentUrl,
  getEncounterDetail,
  listQueue,
  saveDoctorNotes,
  setEncounterStatus,
} from "@/lib/medikiosk/doctor.functions";
import type { Encounter, EncounterStatus } from "@/lib/medikiosk/types";
import { cn } from "@/lib/utils";

function statusLabel(status: EncounterStatus): string {
  switch (status) {
    case "URGENT":
      return "Red flag";
    case "READY_FOR_DOCTOR":
      return "Waiting";
    case "IN_CONSULT":
      return "In consult";
    case "COMPLETED":
      return "Completed";
    default:
      return status;
  }
}

function waitingFor(encounter: Encounter): string {
  if (!encounter.submittedAt) return "—";
  const minutes = Math.max(
    0,
    Math.round((Date.now() - new Date(encounter.submittedAt).getTime()) / 60000),
  );
  return minutes < 1 ? "just now" : `${minutes} min`;
}

export function PhysicianConsole() {
  const [queue, setQueue] = useState<Encounter[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Encounter | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const rows = await listQueue();
      setQueue(rows);
      setSelectedId((current) => current ?? rows[0]?.id ?? null);
    } catch (e) {
      setQueue([]);
      setError(e instanceof Error ? e.message : "Could not load the queue.");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 20000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setLoadingDetail(true);
    getEncounterDetail({ data: { id: selectedId } })
      .then(setDetail)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load this record."))
      .finally(() => setLoadingDetail(false));
  }, [selectedId]);

  async function changeStatus(status: EncounterStatus) {
    if (!detail) return;
    await setEncounterStatus({ data: { id: detail.id, status } });
    const updated = await getEncounterDetail({ data: { id: detail.id } });
    setDetail(updated);
    void refresh();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <MediKioskLogo size={26} />
            <span className="font-display text-lg font-semibold">MediKiosk · Doctor console</span>
          </Link>
          <Button variant="ghost" size="sm" className="text-slate-300" onClick={() => void refresh()}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-2">
          <h2 className="px-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Patient queue
          </h2>
          {error ? (
            <div className="rounded-xl border border-red-900 bg-red-950/50 p-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}
          {queue === null ? (
            <div className="flex items-center gap-2 p-3 text-sm text-slate-400">
              <Loader2 className="size-4 animate-spin" /> Loading queue…
            </div>
          ) : queue.length === 0 ? (
            <div className="rounded-xl border border-slate-800 p-6 text-center text-sm text-slate-400">
              No patients are waiting. Completed check-ins from the kiosk appear here
              automatically.
            </div>
          ) : (
            queue.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  "w-full rounded-xl border p-3.5 text-left transition-colors",
                  selectedId === item.id
                    ? "border-teal-500 bg-slate-900"
                    : "border-slate-800 hover:border-slate-700",
                  item.status === "URGENT" && "border-l-4 border-l-red-500",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{item.patient?.name ?? "Unnamed"}</span>
                  <span className="text-xs text-slate-500">{item.displayToken}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                  <span>
                    {item.patient?.age ?? "?"} · {item.patient?.sex ?? ""}
                  </span>
                  <span>·</span>
                  <span>{item.chiefComplaintLabel ?? "AYUSH intake"}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge
                    className={cn(
                      "text-[11px]",
                      item.status === "URGENT"
                        ? "bg-red-600 text-white hover:bg-red-600"
                        : item.status === "COMPLETED"
                          ? "bg-slate-700 text-slate-200 hover:bg-slate-700"
                          : "bg-teal-600 text-white hover:bg-teal-600",
                    )}
                  >
                    {statusLabel(item.status)}
                  </Badge>
                  {item.isDemo ? (
                    <Badge className="bg-amber-500 text-[11px] text-white hover:bg-amber-500">
                      DEMO
                    </Badge>
                  ) : null}
                  <span className="ml-auto text-[11px] text-slate-500">{waitingFor(item)}</span>
                </div>
              </button>
            ))
          )}
        </aside>

        <section>
          {loadingDetail ? (
            <div className="flex items-center gap-2 p-6 text-sm text-slate-400">
              <Loader2 className="size-4 animate-spin" /> Loading record…
            </div>
          ) : detail ? (
            <ClinicalSummary key={detail.id} encounter={detail} onStatus={changeStatus} />
          ) : (
            <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-800 text-sm text-slate-500">
              Select a patient to open their intake record.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ClinicalSummary({
  encounter,
  onStatus,
}: {
  encounter: Encounter;
  onStatus: (status: EncounterStatus) => Promise<void>;
}) {
  const [notes, setNotes] = useState(encounter.doctorNotes ?? "");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    try {
      await saveDoctorNotes({ data: { id: encounter.id, notes } });
      setSavedAt(new Date().toLocaleTimeString());
    } finally {
      setSaving(false);
    }
  }

  async function openDocument(documentId: string) {
    setDocError(null);
    try {
      const { url } = await getDocumentUrl({ data: { documentId } });
      window.open(url, "_blank", "noopener");
    } catch (e) {
      setDocError(e instanceof Error ? e.message : "Could not open this document.");
    }
  }

  return (
    <div className="space-y-4">
      {encounter.isDemo ? (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
          <AlertTriangle className="size-4" /> Demo record — sample data, not a real patient.
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold">
              {encounter.patient?.name ?? "Unnamed patient"}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {encounter.patient?.age ?? "?"} · {encounter.patient?.sex ?? ""} ·{" "}
              {encounter.patient?.abhaMasked ?? "No ABHA provided"}
            </p>
            <p className="text-xs text-slate-500">
              Token {encounter.displayToken} · intake{" "}
              {encounter.intakeSeconds ? `${encounter.intakeSeconds}s` : "—"} ·{" "}
              {encounter.careMode === "ayush" ? "AYUSH pathway" : "Modern medicine"} ·{" "}
              {encounter.languageLabel ?? "language not recorded"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="bg-teal-600 text-white hover:bg-teal-500"
              onClick={() => void onStatus("IN_CONSULT")}
              disabled={encounter.status === "IN_CONSULT"}
            >
              <Stethoscope className="size-4" /> Start consult
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800"
              onClick={() => void onStatus("COMPLETED")}
              disabled={encounter.status === "COMPLETED"}
            >
              <CheckCircle2 className="size-4" /> Mark completed
            </Button>
          </div>
        </div>
        {encounter.identityVerification ? (
          <p className="mt-3 text-xs text-amber-300/80">
            Identity: {encounter.identityVerification.provider}
          </p>
        ) : null}
      </div>

      {encounter.redFlags.length > 0 ? (
        <div className="rounded-2xl border border-red-800 bg-red-950/40 p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-red-300">
            <AlertTriangle className="size-4" /> Red flags
          </h2>
          <div className="mt-3 space-y-2">
            {encounter.redFlags.map((flag) => (
              <div key={flag.code} className="text-sm">
                <div className="font-semibold text-red-100">{flag.label}</div>
                <div className="text-red-300/80">{flag.destination}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-red-300/70">
            Rule-based alert from the patient's own answers. Not a diagnosis.
          </p>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Summary</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-200">
          {encounter.aiSummary ?? "No summary generated."}
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Generated from the patient's answers. Information collection only — no diagnosis or
          treatment is suggested.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Structured intake
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {encounter.answers.length === 0 ? (
            <p className="text-sm text-slate-500">No answers recorded.</p>
          ) : (
            encounter.answers.map((a) => (
              <div key={a.key} className="rounded-xl border border-slate-800 px-3.5 py-2.5">
                <div className="text-[11px] uppercase tracking-wider text-slate-500">{a.label}</div>
                <div className="text-sm text-slate-100">{a.value}</div>
                <div className="text-[11px] text-slate-600">via {a.source}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Documents</h2>
        {docError ? <p className="mt-2 text-sm text-red-300">{docError}</p> : null}
        <div className="mt-3 space-y-2">
          {encounter.documents.length === 0 ? (
            <p className="text-sm text-slate-500">No documents were attached.</p>
          ) : (
            encounter.documents.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => void openDocument(doc.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-800 px-3.5 py-2.5 text-left hover:border-slate-700"
              >
                <FileText className="size-4 shrink-0 text-teal-400" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-slate-100">{doc.fileName}</div>
                  <div className="text-[11px] text-slate-500">
                    {doc.kind.replace(/_/g, " ").toLowerCase()} ·{" "}
                    {doc.processingStatus === "PROCESSED"
                      ? `text extracted (${doc.ocrProvider})`
                      : "no text extraction available"}
                  </div>
                </div>
                <ExternalLink className="size-4 text-slate-500" />
              </button>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
          <UserRound className="size-4" /> Doctor's notes
        </h2>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder="Your assessment and plan…"
          className="mt-3 border-slate-800 bg-slate-950 text-slate-100"
        />
        <div className="mt-3 flex items-center gap-3">
          <Button
            size="sm"
            className="bg-teal-600 text-white hover:bg-teal-500"
            onClick={() => void save()}
            disabled={saving}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null} Save notes
          </Button>
          {savedAt ? <span className="text-xs text-slate-500">Saved at {savedAt}</span> : null}
        </div>
      </div>
    </div>
  );
}

export default PhysicianConsole;
