/**
 * Patient kiosk — the real intake flow.
 *
 * Every answer is written to a persisted encounter as it is given. React state
 * is only a mirror of that row: refreshing the page resumes the same session,
 * and finishing a session wipes the kiosk completely.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  Mic,
  MicOff,
  Paperclip,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Volume2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MediKioskLogo, Waveform } from "@/components/medikiosk/ui";
import { CONSENT_POINTS, DEMO_PATIENT, KIOSK_LANGUAGES } from "@/lib/kiosk-data";
import { speak, stopSpeaking, type VoiceLocale } from "@/lib/speech";
import { abhaService } from "@/lib/medikiosk/abha";
import { speechInput } from "@/lib/medikiosk/speech-input";
import {
  CLINICAL_COMPLAINTS,
  answersToMap,
  nextQuestion,
  questionPlan,
  type Question,
} from "@/lib/medikiosk/questions";
import {
  cancelEncounter,
  deleteEncounterDocument,
  getEncounter,
  startEncounter,
  submitEncounter,
  updateEncounter,
  uploadEncounterDocument,
} from "@/lib/medikiosk/encounters.functions";
import type { CareMode, Encounter, IntakeAnswer } from "@/lib/medikiosk/types";
import { cn } from "@/lib/utils";

const TOKEN_KEY = "medikiosk.kioskToken";

type Step = "welcome" | "identify" | "pathway" | "intake" | "documents" | "consent" | "done";

function deriveStep(encounter: Encounter): Step {
  if (encounter.status !== "IN_PROGRESS") return "done";
  if (!encounter.patient) return "identify";
  if (!encounter.careMode) return "pathway";
  if (encounter.careMode === "allopathy" && !encounter.chiefComplaint) return "pathway";
  if (nextQuestion(encounter.careMode, encounter.chiefComplaint, encounter.answers)) return "intake";
  return "documents";
}

function DemoBanner() {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-900">
      <AlertTriangle className="size-4 shrink-0" />
      Demo session — this is sample data, not a real patient record.
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function KioskFlow() {
  const [token, setToken] = useState<string | null>(null);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [step, setStep] = useState<Step>("welcome");
  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locale, setLocale] = useState<VoiceLocale>("en-IN");
  const startedAt = useRef<number>(Date.now());

  /* Resume any session this kiosk was already running. */
  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!stored) {
      setBooting(false);
      return;
    }
    getEncounter({ data: { kioskToken: stored } })
      .then((existing) => {
        if (existing.status === "IN_PROGRESS") {
          setToken(stored);
          setEncounter(existing);
          setStep(deriveStep(existing));
          if (existing.language) setLocale(existing.language as VoiceLocale);
        } else {
          window.localStorage.removeItem(TOKEN_KEY);
        }
      })
      .catch(() => window.localStorage.removeItem(TOKEN_KEY))
      .finally(() => setBooting(false));
  }, []);

  const apply = useCallback((updated: Encounter, nextStep?: Step) => {
    setEncounter(updated);
    setStep(nextStep ?? deriveStep(updated));
  }, []);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }, []);

  async function begin(isDemo: boolean, chosen: VoiceLocale) {
    await run(async () => {
      const language = KIOSK_LANGUAGES.find((l) => l.locale === chosen);
      const result = await startEncounter({ data: { isDemo } });
      window.localStorage.setItem(TOKEN_KEY, result.kioskToken);
      setToken(result.kioskToken);
      setLocale(chosen);
      startedAt.current = Date.now();
      const updated = await updateEncounter({
        data: {
          kioskToken: result.kioskToken,
          patch: { language: chosen, languageLabel: language?.english ?? chosen },
        },
      });
      apply(updated, "identify");
    });
  }

  function resetKiosk(cancel: boolean) {
    const stored = token;
    setToken(null);
    setEncounter(null);
    setStep("welcome");
    setError(null);
    stopSpeaking();
    speechInput.stop();
    if (typeof window !== "undefined") window.localStorage.removeItem(TOKEN_KEY);
    if (cancel && stored) void cancelEncounter({ data: { kioskToken: stored } }).catch(() => {});
  }

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="size-6 animate-spin text-teal-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <MediKioskLogo size={28} />
            <span className="font-display text-lg font-semibold text-slate-900">MediKiosk</span>
          </Link>
          <div className="flex items-center gap-2">
            {encounter?.isDemo ? (
              <Badge className="bg-amber-500 text-white hover:bg-amber-500">DEMO SESSION</Badge>
            ) : null}
            {encounter ? (
              <>
                <Badge variant="outline" className="border-slate-300 text-slate-600">
                  Token {encounter.displayToken}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-500"
                  onClick={() => resetKiosk(true)}
                >
                  <RotateCcw className="size-4" /> Start over
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="space-y-4">
          {encounter?.isDemo ? <DemoBanner /> : null}
          {error ? <ErrorNote message={error} /> : null}
        </div>

        <div className="mt-4">
          {step === "welcome" ? <Welcome busy={busy} onBegin={begin} /> : null}

          {step === "identify" && token ? (
            <IdentifyStep
              busy={busy}
              isDemo={!!encounter?.isDemo}
              onSubmit={(input) =>
                run(async () => {
                  const result = await abhaService.verify(input);
                  if (!result.ok) throw new Error(result.error ?? "Could not verify these details.");
                  const updated = await updateEncounter({
                    data: {
                      kioskToken: token,
                      patch: {
                        patient: result.patient,
                        identityVerification: result.verification,
                      },
                    },
                  });
                  apply(updated, "pathway");
                })
              }
            />
          ) : null}

          {step === "pathway" && token && encounter ? (
            <PathwayStep
              busy={busy}
              encounter={encounter}
              onChoose={(careMode, complaint) =>
                run(async () => {
                  const updated = await updateEncounter({
                    data: {
                      kioskToken: token,
                      patch: {
                        careMode,
                        chiefComplaint: complaint?.id ?? null,
                        chiefComplaintLabel: complaint?.label ?? "AYUSH consultation",
                      },
                    },
                  });
                  apply(updated, "intake");
                })
              }
            />
          ) : null}

          {step === "intake" && token && encounter ? (
            <IntakeStep
              busy={busy}
              encounter={encounter}
              locale={locale}
              onAnswer={(answer) =>
                run(async () => {
                  const answers = [
                    ...encounter.answers.filter((a) => a.key !== answer.key),
                    answer,
                  ];
                  const updated = await updateEncounter({
                    data: { kioskToken: token, patch: { answers } },
                  });
                  apply(updated);
                })
              }
              onBack={() =>
                run(async () => {
                  const answers = encounter.answers.slice(0, -1);
                  const updated = await updateEncounter({
                    data: { kioskToken: token, patch: { answers } },
                  });
                  apply(updated, "intake");
                })
              }
            />
          ) : null}

          {step === "documents" && token && encounter ? (
            <DocumentsStep
              busy={busy}
              encounter={encounter}
              onUpload={(file) =>
                run(async () => {
                  const buffer = await file.arrayBuffer();
                  let binary = "";
                  const bytes = new Uint8Array(buffer);
                  for (let i = 0; i < bytes.length; i += 1)
                    binary += String.fromCharCode(bytes[i] as number);
                  const updated = await uploadEncounterDocument({
                    data: {
                      kioskToken: token,
                      fileName: file.name,
                      fileType: file.type || "application/octet-stream",
                      contentBase64: btoa(binary),
                    },
                  });
                  apply(updated, "documents");
                })
              }
              onDelete={(documentId) =>
                run(async () => {
                  const updated = await deleteEncounterDocument({
                    data: { kioskToken: token, documentId },
                  });
                  apply(updated, "documents");
                })
              }
              onContinue={() => setStep("consent")}
              onBack={() => setStep("intake")}
            />
          ) : null}

          {step === "consent" && token && encounter ? (
            <ConsentStep
              busy={busy}
              encounter={encounter}
              onBack={() => setStep("documents")}
              onShare={() =>
                run(async () => {
                  const updated = await submitEncounter({
                    data: {
                      kioskToken: token,
                      consentGranted: true,
                      intakeSeconds: Math.round((Date.now() - startedAt.current) / 1000),
                    },
                  });
                  apply(updated, "done");
                })
              }
            />
          ) : null}

          {step === "done" && encounter ? (
            <DoneStep encounter={encounter} onFinish={() => resetKiosk(false)} />
          ) : null}
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Steps                                                               */
/* ------------------------------------------------------------------ */

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      {children}
    </div>
  );
}

function StepTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-2xl font-semibold text-slate-900">{title}</h1>
      {sub ? <p className="mt-1.5 text-sm text-slate-500">{sub}</p> : null}
    </div>
  );
}

function Welcome({
  busy,
  onBegin,
}: {
  busy: boolean;
  onBegin: (isDemo: boolean, locale: VoiceLocale) => void;
}) {
  const [chosen, setChosen] = useState<VoiceLocale>("en-IN");
  return (
    <Panel>
      <StepTitle
        title="Welcome — please choose your language"
        sub="Your answers go straight to the doctor you are about to see."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {KIOSK_LANGUAGES.map((lang) => (
          <button
            key={lang.locale}
            type="button"
            onClick={() => {
              setChosen(lang.locale);
              speak(lang.nativeScript, lang.locale);
            }}
            className={cn(
              "min-h-20 rounded-xl border-2 p-3 text-left transition-colors",
              chosen === lang.locale
                ? "border-teal-700 bg-teal-50"
                : "border-slate-200 hover:border-slate-300",
            )}
          >
            <div className="text-lg font-semibold text-slate-900">{lang.label}</div>
            <div className="text-xs text-slate-500">{lang.english}</div>
          </button>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg"
          disabled={busy}
          onClick={() => onBegin(false, chosen)}
          className="min-h-13 flex-1 gap-2 bg-teal-700 text-base text-white hover:bg-teal-800"
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : <ArrowRight className="size-5" />}
          Start my check-in
        </Button>
        <Button
          size="lg"
          variant="outline"
          disabled={busy}
          onClick={() => onBegin(true, chosen)}
          className="min-h-13 gap-2 border-amber-300 text-base text-amber-800 hover:bg-amber-50"
        >
          Start a demo session
        </Button>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Demo sessions are clearly marked as sample data everywhere they appear, including the
        doctor's queue.
      </p>
    </Panel>
  );
}

function IdentifyStep({
  busy,
  isDemo,
  onSubmit,
}: {
  busy: boolean;
  isDemo: boolean;
  onSubmit: (input: {
    name: string;
    age: number;
    sex: "Female" | "Male" | "Other";
    abhaNumber?: string;
  }) => void;
}) {
  const [name, setName] = useState(isDemo ? DEMO_PATIENT.name : "");
  const [age, setAge] = useState(isDemo ? String(DEMO_PATIENT.age) : "");
  const [sex, setSex] = useState<"Female" | "Male" | "Other">(isDemo ? DEMO_PATIENT.sex : "Female");
  const [abha, setAbha] = useState(isDemo ? DEMO_PATIENT.abhaNumber : "");

  return (
    <Panel>
      <StepTitle title="Who is being seen today?" sub="Only these basic details are needed." />
      <div className="space-y-5">
        <div>
          <Label htmlFor="name" className="text-sm font-medium text-slate-700">
            Full name
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 h-12 text-base"
            placeholder="Patient name"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="age" className="text-sm font-medium text-slate-700">
              Age
            </Label>
            <Input
              id="age"
              inputMode="numeric"
              value={age}
              onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 3))}
              className="mt-1.5 h-12 text-base"
              placeholder="Years"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700">Sex</Label>
            <div className="mt-1.5 flex gap-2">
              {(["Female", "Male", "Other"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSex(option)}
                  className={cn(
                    "h-12 flex-1 rounded-lg border-2 text-sm font-medium transition-colors",
                    sex === option
                      ? "border-teal-700 bg-teal-50 text-teal-900"
                      : "border-slate-200 text-slate-600",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <Label htmlFor="abha" className="text-sm font-medium text-slate-700">
            ABHA number <span className="font-normal text-slate-400">(optional)</span>
          </Label>
          <Input
            id="abha"
            inputMode="numeric"
            value={abha}
            onChange={(e) => setAbha(e.target.value.replace(/\D/g, "").slice(0, 14))}
            className="mt-1.5 h-12 text-base"
            placeholder="14 digits"
          />
          <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            Demo ABHA verification — the number is only checked for format and stored masked. No
            government health record is contacted.
          </p>
        </div>
      </div>
      <Button
        size="lg"
        disabled={busy}
        onClick={() => onSubmit({ name, age: Number(age), sex, abhaNumber: abha })}
        className="mt-8 min-h-13 w-full gap-2 bg-teal-700 text-base text-white hover:bg-teal-800"
      >
        {busy ? <Loader2 className="size-5 animate-spin" /> : <ArrowRight className="size-5" />}
        Continue
      </Button>
    </Panel>
  );
}

function PathwayStep({
  busy,
  encounter,
  onChoose,
}: {
  busy: boolean;
  encounter: Encounter;
  onChoose: (mode: CareMode, complaint: { id: string; label: string } | null) => void;
}) {
  const [mode, setMode] = useState<CareMode | null>(encounter.careMode);

  if (!mode) {
    return (
      <Panel>
        <StepTitle
          title="Which kind of care are you here for?"
          sub="This decides the questions you will be asked. You can tell the doctor either way."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("allopathy")}
            className="rounded-xl border-2 border-slate-200 p-6 text-left transition-colors hover:border-teal-700"
          >
            <div className="text-lg font-semibold text-slate-900">Modern medicine</div>
            <p className="mt-1 text-sm text-slate-500">
              Symptom-focused questions (onset, severity, associated symptoms).
            </p>
          </button>
          <button
            type="button"
            onClick={() => setMode("ayush")}
            className="rounded-xl border-2 border-slate-200 p-6 text-left transition-colors hover:border-teal-700"
          >
            <div className="text-lg font-semibold text-slate-900">AYUSH / Ayurveda</div>
            <p className="mt-1 text-sm text-slate-500">
              Prakriti, Agni, Ahara, Vihara, Nidra and Mala assessment.
            </p>
          </button>
        </div>
      </Panel>
    );
  }

  if (mode === "ayush") {
    return (
      <Panel>
        <StepTitle
          title="AYUSH intake"
          sub="We will ask about your constitution, digestion, routine and sleep."
        />
        <div className="flex gap-3">
          <Button variant="outline" className="min-h-12" onClick={() => setMode(null)}>
            <ArrowLeft className="size-4" /> Back
          </Button>
          <Button
            disabled={busy}
            onClick={() => onChoose("ayush", null)}
            className="min-h-12 flex-1 bg-teal-700 text-white hover:bg-teal-800"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null} Begin AYUSH questions
          </Button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <StepTitle title="What is troubling you most today?" sub="Pick the closest one." />
      <div className="grid gap-3 sm:grid-cols-2">
        {CLINICAL_COMPLAINTS.map((complaint) => (
          <button
            key={complaint.id}
            type="button"
            disabled={busy}
            onClick={() => onChoose("allopathy", complaint)}
            className="min-h-20 rounded-xl border-2 border-slate-200 p-4 text-left transition-colors hover:border-teal-700 disabled:opacity-60"
          >
            <div className="text-base font-semibold text-slate-900">{complaint.label}</div>
            <div className="text-sm text-slate-500">{complaint.hindi}</div>
          </button>
        ))}
      </div>
      <Button variant="ghost" className="mt-6 text-slate-500" onClick={() => setMode(null)}>
        <ArrowLeft className="size-4" /> Choose a different pathway
      </Button>
    </Panel>
  );
}

function IntakeStep({
  busy,
  encounter,
  locale,
  onAnswer,
  onBack,
}: {
  busy: boolean;
  encounter: Encounter;
  locale: VoiceLocale;
  onAnswer: (answer: IntakeAnswer) => void;
  onBack: () => void;
}) {
  const careMode = encounter.careMode ?? "allopathy";
  const question = nextQuestion(careMode, encounter.chiefComplaint, encounter.answers);
  const plan = questionPlan(careMode, encounter.chiefComplaint, encounter.answers);
  const answered = answersToMap(encounter.answers);
  const [value, setValue] = useState("");
  const [listening, setListening] = useState(false);
  const [micNote, setMicNote] = useState<string | null>(null);
  const supportsSpeech = speechInput.isSupported();

  useEffect(() => {
    setValue("");
    setMicNote(null);
    if (question) speak(question.prompt, locale);
    return () => stopSpeaking();
  }, [question?.key, locale]);

  if (!question) return null;

  function submit(text: string, source: IntakeAnswer["source"]) {
    const trimmed = text.trim();
    if (!trimmed) return;
    speechInput.stop();
    setListening(false);
    onAnswer({
      key: question!.key,
      label: question!.label,
      value: trimmed,
      source,
      answeredAt: new Date().toISOString(),
    });
  }

  function toggleMic() {
    if (listening) {
      speechInput.stop();
      setListening(false);
      return;
    }
    setMicNote(null);
    const started = speechInput.start(locale, {
      onPartial: (text) => setValue(text),
      onFinal: (text) => {
        setValue(text);
        setListening(false);
      },
      onError: (message) => {
        setMicNote(message);
        setListening(false);
      },
      onEnd: () => setListening(false),
    });
    setListening(started);
  }

  const progress = Object.keys(answered).length;

  return (
    <Panel>
      <div className="mb-5 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-slate-400">
        <span>
          Question {progress + 1} of about {plan.length}
        </span>
        <span>{encounter.chiefComplaintLabel ?? "AYUSH intake"}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-teal-700 transition-all"
          style={{ width: `${Math.round((progress / Math.max(plan.length, 1)) * 100)}%` }}
        />
      </div>

      <div className="mt-6 flex items-start gap-3">
        <button
          type="button"
          onClick={() => speak(question.prompt, locale)}
          className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700"
          aria-label="Read the question aloud"
        >
          <Volume2 className="size-5" />
        </button>
        <h2 className="font-display text-xl font-semibold leading-snug text-slate-900">
          {question.prompt}
        </h2>
      </div>

      <div className="mt-6">
        {question.type === "choice" ? (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {(question.options ?? []).map((option) => (
              <button
                key={option}
                type="button"
                disabled={busy}
                onClick={() => submit(option, "touch")}
                className="min-h-14 rounded-xl border-2 border-slate-200 px-4 text-left text-base font-medium text-slate-800 transition-colors hover:border-teal-700 disabled:opacity-60"
              >
                {option}
              </button>
            ))}
          </div>
        ) : question.type === "scale" ? (
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                disabled={busy}
                onClick={() => submit(String(n), "touch")}
                className="min-h-14 rounded-xl border-2 border-slate-200 text-lg font-semibold text-slate-800 transition-colors hover:border-teal-700 disabled:opacity-60"
              >
                {n}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={3}
              placeholder="Speak or type your answer"
              className="text-base"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={listening ? "default" : "outline"}
                onClick={toggleMic}
                disabled={!supportsSpeech}
                className={cn("min-h-12 gap-2", listening && "bg-teal-700 text-white")}
              >
                {listening ? <Mic className="size-4" /> : <MicOff className="size-4" />}
                {listening ? "Listening…" : "Speak the answer"}
              </Button>
              {listening ? <Waveform active /> : null}
              <Button
                disabled={busy || !value.trim()}
                onClick={() => submit(value, listening ? "voice" : "typed")}
                className="ml-auto min-h-12 gap-2 bg-teal-700 text-white hover:bg-teal-800"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                Next
              </Button>
            </div>
            {!supportsSpeech ? (
              <p className="text-xs text-slate-400">
                Voice input is not available on this device — please type your answer.
              </p>
            ) : null}
            {micNote ? <p className="text-xs text-amber-700">{micNote}</p> : null}
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-4">
        <Button
          variant="ghost"
          className="text-slate-500"
          disabled={busy || encounter.answers.length === 0}
          onClick={onBack}
        >
          <ArrowLeft className="size-4" /> Previous answer
        </Button>
        <Button
          variant="ghost"
          className="text-slate-500"
          disabled={busy}
          onClick={() => submit("Not reported", "touch")}
        >
          Skip this question
        </Button>
      </div>
    </Panel>
  );
}

function DocumentsStep({
  busy,
  encounter,
  onUpload,
  onDelete,
  onContinue,
  onBack,
}: {
  busy: boolean;
  encounter: Encounter;
  onUpload: (file: File) => void;
  onDelete: (id: string) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <Panel>
      <StepTitle
        title="Do you have any reports or prescriptions?"
        sub="Optional. Photos, PDFs or text files up to 10 MB each."
      />

      <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition-colors hover:border-teal-600">
        <Paperclip className="size-6 text-slate-400" />
        <span className="text-sm font-medium text-slate-700">Tap to attach a document</span>
        <span className="text-xs text-slate-400">The doctor will see it with your record</span>
        <input
          type="file"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = "";
          }}
        />
      </label>

      {busy ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" /> Uploading…
        </p>
      ) : null}

      <div className="mt-5 space-y-2">
        {encounter.documents.length === 0 ? (
          <p className="text-sm text-slate-400">No documents attached yet.</p>
        ) : (
          encounter.documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <FileText className="size-5 shrink-0 text-teal-700" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-900">{doc.fileName}</div>
                <div className="text-xs text-slate-400">
                  {doc.kind.replace(/_/g, " ").toLowerCase()} ·{" "}
                  {doc.processingStatus === "PROCESSED"
                    ? "text extracted"
                    : "stored — no text extraction available yet"}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                disabled={busy}
                onClick={() => onDelete(doc.id)}
                aria-label={`Remove ${doc.fileName}`}
              >
                <Trash2 className="size-4 text-slate-400" />
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="mt-8 flex gap-3">
        <Button variant="outline" className="min-h-12" onClick={onBack} disabled={busy}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        <Button
          className="min-h-12 flex-1 gap-2 bg-teal-700 text-white hover:bg-teal-800"
          onClick={onContinue}
          disabled={busy}
        >
          Continue <ArrowRight className="size-4" />
        </Button>
      </div>
    </Panel>
  );
}

function ConsentStep({
  busy,
  encounter,
  onShare,
  onBack,
}: {
  busy: boolean;
  encounter: Encounter;
  onShare: () => void;
  onBack: () => void;
}) {
  const [agreed, setAgreed] = useState(false);
  return (
    <Panel>
      <StepTitle
        title="Review and share with the doctor"
        sub="Nothing has been sent yet. Check your answers first."
      />

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-sm font-semibold text-slate-900">
          {encounter.patient?.name} · {encounter.patient?.age} · {encounter.patient?.sex}
        </div>
        {encounter.patient?.abhaMasked ? (
          <div className="text-xs text-slate-500">{encounter.patient.abhaMasked} (demo verified)</div>
        ) : null}
        <div className="mt-3 space-y-1.5">
          {encounter.answers.map((a) => (
            <div key={a.key} className="text-sm">
              <span className="text-slate-500">{a.label}: </span>
              <span className="text-slate-900">{a.value}</span>
            </div>
          ))}
        </div>
        {encounter.documents.length > 0 ? (
          <div className="mt-3 text-sm text-slate-500">
            {encounter.documents.length} document(s) attached
          </div>
        ) : null}
      </div>

      <div className="mt-6 space-y-3">
        {CONSENT_POINTS.map((point) => (
          <div key={point.title} className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-teal-700" />
            <div>
              <div className="text-sm font-semibold text-slate-900">{point.title}</div>
              <p className="text-sm text-slate-500">{point.body}</p>
            </div>
          </div>
        ))}
      </div>

      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-slate-200 p-4">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 size-5 accent-teal-700"
        />
        <span className="text-sm text-slate-800">
          I agree to share this information with the doctor treating me today.
        </span>
      </label>

      <div className="mt-6 flex gap-3">
        <Button variant="outline" className="min-h-12" onClick={onBack} disabled={busy}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        <Button
          className="min-h-13 flex-1 gap-2 bg-teal-700 text-base text-white hover:bg-teal-800"
          disabled={!agreed || busy}
          onClick={onShare}
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle2 className="size-5" />}
          Share with the doctor
        </Button>
      </div>
    </Panel>
  );
}

function DoneStep({ encounter, onFinish }: { encounter: Encounter; onFinish: () => void }) {
  const urgent = encounter.redFlags.length > 0;
  return (
    <Panel>
      <div className="text-center">
        <div
          className={cn(
            "mx-auto flex size-16 items-center justify-center rounded-full",
            urgent ? "bg-red-100 text-red-700" : "bg-teal-50 text-teal-700",
          )}
        >
          {urgent ? <AlertTriangle className="size-8" /> : <CheckCircle2 className="size-8" />}
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold text-slate-900">
          {urgent ? "Please see the staff immediately" : "You're checked in"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Your token is{" "}
          <span className="font-semibold text-slate-900">{encounter.displayToken}</span>. The doctor
          can now see your record.
        </p>
      </div>

      {urgent ? (
        <div className="mt-6 space-y-2 rounded-xl border border-red-200 bg-red-50 p-4">
          {encounter.redFlags.map((flag) => (
            <div key={flag.code} className="text-sm">
              <div className="font-semibold text-red-900">{flag.label}</div>
              <div className="text-red-700">{flag.destination}</div>
            </div>
          ))}
          <p className="pt-1 text-xs text-red-700">
            This is a safety alert based on what you told us — it is not a diagnosis.
          </p>
        </div>
      ) : null}

      <Button
        className="mt-8 min-h-13 w-full bg-slate-900 text-base text-white hover:bg-slate-800"
        onClick={onFinish}
      >
        Finish and clear this kiosk
      </Button>
      <p className="mt-2 text-center text-xs text-slate-400">
        Pressing this removes your session from the kiosk screen for the next patient.
      </p>
    </Panel>
  );
}

export default KioskFlow;
